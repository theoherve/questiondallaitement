import type Stripe from "stripe";
import { stripe } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

export const createConnectAccount = async (consultantId: string, email: string) => {
  const account = await stripe.accounts.create({
    type: "express",
    country: "FR",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: {
      consultant_id: consultantId,
    },
  });

  const supabase = createAdminClient();
  await supabase
    .from("consultants")
    .update({
      stripe_account_id: account.id,
      stripe_account_status: "pending",
    })
    .eq("id", consultantId);

  return account;
};

export const createAccountLink = async (
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) => {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return accountLink;
};

export const getAccountStatus = async (accountId: string) => {
  const account = await stripe.accounts.retrieve(accountId);

  return {
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    requirements: account.requirements,
  };
};

export const createCheckoutSession = async ({
  consultantStripeAccountId,
  commissionRate,
  priceInCents,
  currency,
  productName,
  productDescription,
  customerEmail,
  metadata,
  successUrl,
  cancelUrl,
}: {
  consultantStripeAccountId: string;
  commissionRate: number;
  priceInCents: number;
  currency: string;
  productName: string;
  productDescription?: string;
  customerEmail?: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}) => {
  const applicationFeeAmount = Math.round(
    priceInCents * (commissionRate / 100)
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: productName,
            description: productDescription,
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: consultantStripeAccountId,
      },
      metadata,
    },
    metadata,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
};

/**
 * Rembourse une cliente en defaisant l'ensemble du flux d'argent.
 *
 * Sur une charge destination, `refunds.create({ payment_intent })` seul ne
 * rembourse que la cliente, depuis le solde de la **plateforme**. Le virement
 * vers la consultante n'est pas renverse et la commission n'est pas rendue.
 * Mesure sur Stripe en mode test, pour une reservation de 80 € remboursee :
 * la plateforme perdait 68 € et la consultante conservait les 80 €, pour une
 * consultation qui n'avait pas lieu.
 *
 * Deux corrections :
 *
 * - `reverse_transfer` recupere aupres de la consultante ce qui est rendu a la
 *   cliente, au prorata du montant rembourse ;
 * - la commission plateforme est rendue **en entier**, y compris sur un
 *   remboursement partiel. C'est la regle produit retenue : la plateforme ne
 *   preleve rien sur une annulation, la penalite revient integralement a la
 *   consultante. `refund_application_fee: true` ne conviendrait pas — il
 *   rembourse la commission au prorata, laissant une part a la plateforme.
 */
export const createRefund = async (
  paymentIntentId: string,
  amountInCents?: number
) => {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  // La charge imbriquee dans un PaymentIntent ne porte ni `transfer` ni
  // `application_fee`, meme en demandant `expand: ["latest_charge.transfer"]` :
  // ces champs n'apparaissent qu'en recuperant la charge directement. Les lire
  // sur l'objet imbrique renvoie toujours `undefined`, et le remboursement
  // repart alors en silence sur l'ancien comportement — sans rien renverser.
  const chargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id;

  const charge = chargeId
    ? await stripe.charges.retrieve(chargeId, {
        expand: ["transfer", "application_fee"],
      })
    : null;

  const transfer = charge?.transfer as Stripe.Transfer | null;
  const applicationFee = charge?.application_fee as Stripe.ApplicationFee | null;

  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amountInCents) {
    refundParams.amount = amountInCents;
  }

  // Un paiement sans compte connecte n'a rien a renverser, et le parametre
  // ferait echouer l'appel.
  if (transfer) {
    refundParams.reverse_transfer = true;
  }

  const refund = await stripe.refunds.create(refundParams);

  const feeOutstanding = applicationFee
    ? applicationFee.amount - applicationFee.amount_refunded
    : 0;

  if (applicationFee && feeOutstanding > 0) {
    try {
      await stripe.applicationFees.createRefund(applicationFee.id, {
        amount: feeOutstanding,
      });
    } catch (err) {
      // L'argent de la cliente prime : il est deja parti. Laisser remonter
      // l'erreur ferait echouer l'annulation apres coup, avec une reservation
      // annulee et un remboursement qu'on croirait perdu.
      console.error("[createRefund] remboursement de la commission", err);
    }
  }

  return refund;
};

export const createTransfer = async (
  amountInCents: number,
  destinationAccountId: string,
  metadata: Record<string, string>
) => {
  const transfer = await stripe.transfers.create({
    amount: amountInCents,
    currency: "eur",
    destination: destinationAccountId,
    metadata,
  });

  return transfer;
};

export const getAccountDashboardLink = async (accountId: string) => {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
};

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
  holdOnPlatform,
  transferGroup,
}: {
  /**
   * Destinataire de la charge. Optionnel : une vente encaissee par la
   * plateforme (`holdOnPlatform`) n'en a pas — soit parce qu'elle sera
   * repartie ensuite, soit parce que la vendeuse *est* la plateforme.
   */
  consultantStripeAccountId?: string;
  commissionRate: number;
  priceInCents: number;
  currency: string;
  productName: string;
  productDescription?: string;
  customerEmail?: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  /**
   * Encaisse sur la plateforme au lieu de virer directement a la consultante.
   *
   * Necessaire des qu'une vente doit se partager entre plusieurs comptes : une
   * charge destination verse tout au destinataire, et la plateforme n'a plus
   * les fonds pour payer les autres parts. Les virements se font ensuite en
   * citant la charge source (`source_transaction`).
   */
  holdOnPlatform?: boolean;
  /** Rattache charge et virements, pour les retrouver au remboursement. */
  transferGroup?: string;
}) => {
  const applicationFeeAmount = Math.round(
    priceInCents * (commissionRate / 100)
  );

  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData =
    holdOnPlatform
      ? { metadata, ...(transferGroup ? { transfer_group: transferGroup } : {}) }
      : {
          application_fee_amount: applicationFeeAmount,
          transfer_data: { destination: consultantStripeAccountId as string },
          metadata,
          ...(transferGroup ? { transfer_group: transferGroup } : {}),
        };

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
    payment_intent_data: paymentIntentData,
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

  // Vente repartie entre plusieurs comptes : `reverse_transfer` ne connait que
  // le transfert porte par la charge, et une charge encaissee par la
  // plateforme n'en a pas. Les parts versees separement doivent etre reprises
  // une a une, sinon la plateforme rembourse la cliente pendant que les deux
  // consultantes gardent la leur.
  if (!transfer && charge) {
    await reverseGroupedTransfers(paymentIntentId, charge.amount, refund.amount);
  }

  return refund;
};

/**
 * Reprend, au prorata du remboursement, les virements rattaches au paiement.
 *
 * Les virements de repartition portent `transfer_group = payment_intent_id`,
 * seul lien disponible : Stripe ne permet pas de filtrer par
 * `source_transaction`.
 */
const reverseGroupedTransfers = async (
  paymentIntentId: string,
  chargeAmount: number,
  refundedAmount: number
) => {
  if (chargeAmount <= 0) return;

  try {
    const transfers = await stripe.transfers.list({
      transfer_group: paymentIntentId,
    });

    for (const grouped of transfers.data) {
      const reversible = grouped.amount - grouped.amount_reversed;
      if (reversible <= 0) continue;

      const share = Math.min(
        Math.round(grouped.amount * (refundedAmount / chargeAmount)),
        reversible
      );
      if (share <= 0) continue;

      await stripe.transfers.createReversal(grouped.id, { amount: share });
    }
  } catch (err) {
    // Comme pour la commission : la cliente est deja remboursee, et faire
    // echouer l'annulation ici la laisserait dans un etat pire.
    console.error("[createRefund] reprise des parts reparties", err);
  }
};

export const createTransfer = async (
  amountInCents: number,
  destinationAccountId: string,
  metadata: Record<string, string>,
  options: {
    /**
     * Charge dont provient l'argent. Sans elle, Stripe puise dans le solde
     * disponible de la plateforme — qui, sur un modele de charges destination,
     * est vide : le virement echoue en `balance_insufficient`.
     */
    sourceTransaction?: string;
    transferGroup?: string;
    /**
     * Rend le virement rejouable sans danger. Stripe peut redelivrer un
     * evenement ; sans cette cle, la meme part serait versee deux fois.
     */
    idempotencyKey?: string;
  } = {}
) => {
  const transfer = await stripe.transfers.create(
    {
      amount: amountInCents,
      currency: "eur",
      destination: destinationAccountId,
      metadata,
      ...(options.sourceTransaction
        ? { source_transaction: options.sourceTransaction }
        : {}),
      ...(options.transferGroup
        ? { transfer_group: options.transferGroup }
        : {}),
    },
    options.idempotencyKey
      ? { idempotencyKey: options.idempotencyKey }
      : undefined
  );

  return transfer;
};

export const getAccountDashboardLink = async (accountId: string) => {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
};

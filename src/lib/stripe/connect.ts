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

export const createRefund = async (
  paymentIntentId: string,
  amountInCents?: number
) => {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amountInCents) {
    refundParams.amount = amountInCents;
  }

  const refund = await stripe.refunds.create(refundParams);
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

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import {
  handleCheckoutCompleted,
  handleCheckoutExpired,
  handlePaymentIntentSucceeded,
  handleChargeRefunded,
  handleAccountUpdated,
  handleAccountDeauthorized,
} from "@/lib/stripe/webhooks";

export const POST = async (request: Request) => {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let formation;

  try {
    formation = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (formation.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          formation.data.object as import("stripe").Stripe.Checkout.Session
        );
        break;

      case "checkout.session.expired":
        await handleCheckoutExpired(
          formation.data.object as import("stripe").Stripe.Checkout.Session
        );
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          formation.data.object as import("stripe").Stripe.PaymentIntent
        );
        break;

      case "charge.refunded":
        await handleChargeRefunded(
          formation.data.object as import("stripe").Stripe.Charge
        );
        break;

      case "account.updated":
        await handleAccountUpdated(
          formation.data.object as import("stripe").Stripe.Account
        );
        break;

      case "account.application.deauthorized":
        await handleAccountDeauthorized(
          formation.data.object as unknown as import("stripe").Stripe.Account
        );
        break;

      default:
        console.log(`Unhandled formation type: ${formation.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook handler error: ${message}`);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
};

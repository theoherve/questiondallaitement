import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import {
  handleCheckoutCompleted,
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

  let event;

  try {
    event = stripe.webhooks.constructEvent(
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
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as import("stripe").Stripe.Checkout.Session
        );
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as import("stripe").Stripe.PaymentIntent
        );
        break;

      case "charge.refunded":
        await handleChargeRefunded(
          event.data.object as import("stripe").Stripe.Charge
        );
        break;

      case "account.updated":
        await handleAccountUpdated(
          event.data.object as import("stripe").Stripe.Account
        );
        break;

      case "account.application.deauthorized":
        await handleAccountDeauthorized(
          event.data.object as unknown as import("stripe").Stripe.Account
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
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

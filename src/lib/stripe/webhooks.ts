import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTransfer } from "@/lib/stripe/connect";
import {
  sendFormationAccess,
  sendBookingConfirmation,
} from "@/lib/emails/send";

const getSupabase = () => createAdminClient();

export const handleCheckoutCompleted = async (
  session: Stripe.Checkout.Session,
) => {
  const metadata = session.metadata;
  if (!metadata) return;

  const { type, reference_id, client_id, consultant_id } = metadata;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  switch (type) {
    case "formation":
      await handleFormationPurchase(
        client_id,
        reference_id,
        paymentIntentId ?? null,
      );
      break;
    case "booking":
      await handleBookingConfirmation(reference_id, paymentIntentId ?? null);
      break;
    case "event":
      await handleEventRegistration(
        client_id,
        reference_id,
        paymentIntentId ?? null,
      );
      break;
  }

  await getSupabase()
    .from("payments")
    .upsert(
      {
        stripe_payment_intent_id: paymentIntentId,
        client_id,
        consultant_id,
        amount_cents: session.amount_total ?? 0,
        platform_fee_cents: parseInt(metadata.platform_fee_cents ?? "0"),
        currency: session.currency ?? "eur",
        type: type as "formation" | "booking" | "event",
        reference_id,
        status: "succeeded",
      },
      { onConflict: "stripe_payment_intent_id" },
    );

  await logAudit(client_id, "payment_completed", type, reference_id, {
    amount: session.amount_total,
    payment_intent: paymentIntentId,
  });

  await sendCheckoutEmails(type, client_id, consultant_id, reference_id);
};

export const handlePaymentIntentSucceeded = async (
  paymentIntent: Stripe.PaymentIntent,
) => {
  await getSupabase()
    .from("payments")
    .update({ status: "succeeded" })
    .eq("stripe_payment_intent_id", paymentIntent.id);
};

export const handleChargeRefunded = async (charge: Stripe.Charge) => {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const refundedAmount = charge.amount_refunded;
  const isFullRefund = refundedAmount === charge.amount;

  await getSupabase()
    .from("payments")
    .update({
      status: isFullRefund ? "refunded" : "partially_refunded",
      refund_amount_cents: refundedAmount,
      refunded_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntentId);
};

export const handleAccountUpdated = async (account: Stripe.Account) => {
  const consultantId = account.metadata?.consultant_id;
  if (!consultantId) return;

  const status = account.charges_enabled
    ? "active"
    : account.details_submitted
      ? "pending_verification"
      : "pending";

  await getSupabase()
    .from("consultants")
    .update({ stripe_account_status: status })
    .eq("id", consultantId);
};

export const handleAccountDeauthorized = async (account: Stripe.Account) => {
  const consultantId = account.metadata?.consultant_id;
  if (!consultantId) return;

  await getSupabase()
    .from("consultants")
    .update({
      stripe_account_id: null,
      stripe_account_status: "deauthorized",
      is_active: false,
    })
    .eq("id", consultantId);
};

const handleFormationPurchase = async (
  clientId: string,
  formationId: string,
  paymentIntentId: string | null,
) => {
  const supabase = getSupabase();

  // 1. Create enrollment
  await supabase.from("formation_enrollments").upsert(
    {
      client_id: clientId,
      formation_id: formationId,
      stripe_payment_intent_id: paymentIntentId,
      enrolled_at: new Date().toISOString(),
    },
    { onConflict: "client_id,formation_id" },
  );

  // 2. Process collaborator revenue splits
  await processCollaboratorSplits(formationId, paymentIntentId);
};

/**
 * After a formation purchase, query collaborators and transfer their revenue share.
 * The main consultant receives the full payment via checkout transfer_data.destination,
 * then we create separate transfers from the platform balance to collaborators.
 *
 * Revenue share is calculated from the net amount (after platform fee).
 */
const processCollaboratorSplits = async (
  formationId: string,
  paymentIntentId: string | null,
) => {
  const supabase = getSupabase();

  // Get collaborators with their Stripe accounts
  const { data: collaborators } = await supabase
    .from("formation_collaborators")
    .select(
      "consultant_id, revenue_share, consultants!formation_collaborators_consultant_id_fkey(stripe_account_id, stripe_account_status)",
    )
    .eq("formation_id", formationId);

  if (!collaborators?.length) return;

  // Get payment info to compute net amount
  const { data: payment } = await supabase
    .from("payments")
    .select("amount_cents, platform_fee_cents")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (!payment) return;

  const netAmountCents = payment.amount_cents - payment.platform_fee_cents;

  for (const collab of collaborators) {
    const consultant = collab.consultants as unknown as {
      stripe_account_id: string | null;
      stripe_account_status: string | null;
    } | null;

    if (
      !consultant?.stripe_account_id ||
      consultant.stripe_account_status !== "active"
    ) {
      // Log but don't block — the collaborator hasn't connected Stripe
      await logAudit(
        collab.consultant_id,
        "collaborator_transfer_skipped",
        "formation",
        formationId,
        {
          reason: "no_active_stripe_account",
          revenue_share: collab.revenue_share,
        },
      );
      continue;
    }

    const transferAmountCents = Math.round(
      netAmountCents * (Number(collab.revenue_share) / 100),
    );

    if (transferAmountCents <= 0) continue;

    try {
      await createTransfer(transferAmountCents, consultant.stripe_account_id, {
        type: "formation_collaborator_split",
        formation_id: formationId,
        consultant_id: collab.consultant_id,
        payment_intent_id: paymentIntentId ?? "",
        revenue_share: collab.revenue_share.toString(),
      });

      await logAudit(
        collab.consultant_id,
        "collaborator_transfer_completed",
        "formation",
        formationId,
        {
          amount_cents: transferAmountCents,
          revenue_share: collab.revenue_share,
          stripe_account_id: consultant.stripe_account_id,
        },
      );
    } catch (error) {
      await logAudit(
        collab.consultant_id,
        "collaborator_transfer_failed",
        "formation",
        formationId,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          amount_cents: transferAmountCents,
          revenue_share: collab.revenue_share,
        },
      );
    }
  }
};

const handleBookingConfirmation = async (
  bookingId: string,
  paymentIntentId: string | null,
) => {
  await getSupabase()
    .from("bookings")
    .update({
      status: "confirmed",
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", bookingId);
};

const handleEventRegistration = async (
  clientId: string,
  eventId: string,
  paymentIntentId: string | null,
) => {
  await getSupabase().from("event_registrations").upsert(
    {
      client_id: clientId,
      event_id: eventId,
      stripe_payment_intent_id: paymentIntentId,
      status: "registered",
    },
    { onConflict: "event_id,client_id" },
  );
};

const sendCheckoutEmails = async (
  type: string,
  clientId: string,
  consultantId: string,
  referenceId: string,
) => {
  try {
    const supabase = getSupabase();

    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("id", clientId)
      .single();

    if (!clientProfile?.email) return;

    const clientName = clientProfile.first_name ?? "";

    if (type === "formation") {
      const { data: formation } = await supabase
        .from("formations")
        .select("title")
        .eq("id", referenceId)
        .single();

      if (formation) {
        await sendFormationAccess(clientProfile.email, {
          client_name: clientName,
          formation_title: formation.title,
        });
      }
    }

    if (type === "booking") {
      const { data: booking } = await supabase
        .from("bookings")
        .select(
          "starts_at, consultants(profiles!consultants_id_fkey(first_name, last_name))",
        )
        .eq("id", referenceId)
        .single();

      if (booking) {
        const consultant = booking.consultants as unknown as {
          profiles: {
            first_name: string | null;
            last_name: string | null;
          } | null;
        } | null;
        const consultantName = consultant?.profiles
          ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
          : "";
        const startsAt = new Date(booking.starts_at);

        await sendBookingConfirmation(clientProfile.email, {
          client_name: clientName,
          consultant_name: consultantName,
          date: startsAt.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          time: startsAt.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
    }
  } catch {
    // Non-blocking: email failure should never fail the webhook
  }
};

const logAudit = async (
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>,
) => {
  await getSupabase().from("audit_logs").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
};

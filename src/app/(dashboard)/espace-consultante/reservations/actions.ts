"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRefund } from "@/lib/stripe/connect";
import { differenceInHours } from "date-fns";
import { revalidatePath } from "next/cache";
import { siteConfig } from "@/config/site";
import type { ActionResult } from "@/types";

export const confirmBooking = async (
  bookingId: string
): Promise<ActionResult> => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: "Erreur lors de la confirmation" };
  }

  revalidatePath("/espace-consultante/reservations");
  return { success: true };
};

export const cancelBooking = async (
  bookingId: string,
  reason: string,
  cancelledBy: "client" | "consultant"
): Promise<ActionResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non autorisé" };
  }

  const adminClient = createAdminClient();
  const { data: booking } = await adminClient
    .from("bookings")
    .select("*, payments(amount_cents, stripe_payment_intent_id)")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return { success: false, error: "Réservation introuvable" };
  }

  if (booking.status === "cancelled") {
    return { success: false, error: "Déjà annulée" };
  }

  const hoursUntil = differenceInHours(
    new Date(booking.starts_at),
    new Date()
  );

  const payment = (
    booking.payments as unknown as {
      amount_cents: number;
      stripe_payment_intent_id: string;
    }[]
  )?.[0];

  let refundAmountCents = 0;

  if (payment?.stripe_payment_intent_id) {
    if (hoursUntil >= siteConfig.cancellationThresholdHours) {
      await createRefund(payment.stripe_payment_intent_id);
      refundAmountCents = payment.amount_cents;
    } else {
      const penaltyAmount = Math.round(
        payment.amount_cents * siteConfig.cancellationPenaltyRate
      );
      const refundAmount = payment.amount_cents - penaltyAmount;
      await createRefund(payment.stripe_payment_intent_id, refundAmount);
      refundAmountCents = refundAmount;
    }
  }

  const { error } = await adminClient
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      refund_amount_cents: refundAmountCents,
    })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: "Erreur lors de l'annulation" };
  }

  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    action: "booking_cancelled",
    entity_type: "booking",
    entity_id: bookingId,
    metadata: {
      cancelled_by: cancelledBy,
      reason,
      hours_until: hoursUntil,
      refund_amount_cents: refundAmountCents,
    },
  });

  revalidatePath("/espace-consultante/reservations");
  revalidatePath("/espace-client/reservations");
  return { success: true };
};

export const completeBooking = async (
  bookingId: string
): Promise<ActionResult> => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: "Erreur lors de la complétion" };
  }

  revalidatePath("/espace-consultante/reservations");
  return { success: true };
};

export const markNoShow = async (
  bookingId: string
): Promise<ActionResult> => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "no_show" })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/espace-consultante/reservations");
  return { success: true };
};

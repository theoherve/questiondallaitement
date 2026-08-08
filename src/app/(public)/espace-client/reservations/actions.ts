"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRefund } from "@/lib/stripe/connect";
import { sendBookingCancelled } from "@/lib/emails/send";
import { differenceInHours, format } from "date-fns";
import { fr } from "date-fns/locale";
import { siteConfig } from "@/config/site";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export const cancelBookingClient = async (
  bookingId: string,
  reason: string
): Promise<ActionResult> => {
  const { user } = await getSupabaseAndUser();
  const adminClient = createAdminClient();

  const { data: booking } = await adminClient
    .from("bookings")
    .select("*, payments(amount_cents, stripe_payment_intent_id)")
    .eq("id", bookingId)
    .eq("client_id", user.id)
    .single();

  if (!booking) {
    return { success: false, error: "Réservation introuvable" };
  }

  // Delete Zoom meeting if present (non-blocking)
  if (booking.zoom_meeting_id) {
    try {
      const { deleteMeeting } = await import("@/lib/zoom/client");
      await deleteMeeting(booking.consultant_id, booking.zoom_meeting_id);
    } catch {
      // Non-blocking
    }
  }

  if (["cancelled", "completed", "no_show"].includes(booking.status)) {
    return { success: false, error: "Cette réservation ne peut pas être annulée" };
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
      cancelled_by: "client",
      reason,
      hours_until: hoursUntil,
      refund_amount_cents: refundAmountCents,
    },
  });

  try {
    const dateStr = format(new Date(booking.starts_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
    let refundInfo = "Aucun remboursement.";
    if (refundAmountCents > 0) {
      refundInfo = `Remboursement de ${(refundAmountCents / 100).toFixed(2)} € effectué.`;
    }
    if (booking.payment_method === "on_site") {
      refundInfo = "Paiement sur place, aucun remboursement nécessaire.";
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, first_name")
      .eq("id", user.id)
      .single();

    if (profile?.email) {
      await sendBookingCancelled(profile.email, {
        client_name: profile.first_name ?? "",
        date: dateStr,
        refund_info: refundInfo,
      });
    }
  } catch {
    // Non-blocking
  }

  revalidatePath("/espace-client/reservations");
  return { success: true };
};

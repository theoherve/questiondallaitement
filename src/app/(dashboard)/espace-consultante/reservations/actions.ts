"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRefund } from "@/lib/stripe/connect";
import { differenceInHours } from "date-fns";
import { revalidatePath } from "next/cache";
import { siteConfig } from "@/config/site";
import { runAutomations } from "@/lib/automations/engine";
import { createNotification } from "@/lib/notifications";
import { computeBookingPrice } from "@/lib/booking/pricing";
import { consultantCanSell } from "@/lib/invoicing/consultant-billing";
import { emitInvoiceForPayment } from "@/lib/invoicing/emit";
import type { ActionResult } from "@/types";
import type { ConsultationTypeDuration } from "@/types/database";

export const confirmBooking = async (
  bookingId: string
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la confirmation" };
  }

  try {
    const { data: booking } = await supabase
      .from("bookings")
      .select("client_id, consultation_type_id, consultation_types(title)")
      .eq("id", bookingId)
      .single();

    if (booking) {
      const { data: client } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("id", booking.client_id)
        .single();

      const ctRaw = booking.consultation_types as { title: string } | { title: string }[] | null;
      const ct = Array.isArray(ctRaw) ? ctRaw[0] : ctRaw;
      await runAutomations("booking_confirmed", user.id, {
        client_id: booking.client_id,
        client_email: client?.email,
        client_name: client?.first_name ?? "",
        booking_id: bookingId,
        consultation_type_id: booking.consultation_type_id,
        consultation_type_title: ct?.title,
      });
      await createNotification(
        booking.client_id,
        "booking_confirmed",
        "Réservation confirmée",
        ct?.title ? `Votre consultation "${ct.title}" a été confirmée.` : "Votre consultation a été confirmée.",
        { booking_id: bookingId }
      );
    }
  } catch {
    // Non-blocking
  }

  revalidatePath("/espace-consultante/reservations");
  return { success: true };
};

export const cancelBooking = async (
  bookingId: string,
  reason: string,
  cancelledBy: "client" | "consultant"
): Promise<ActionResult> => {
  const { user } = await getSupabaseAndUser();
  const adminClient = createAdminClient();
  // `getSupabaseAndUser` ne verifie que l'authentification et rend un client
  // admin qui contourne les RLS : c'est a l'action de restreindre. Sans
  // `consultant_id`, n'importe quel compte connecte pouvait annuler la
  // reservation d'autrui a partir de son seul ID — et declencher un vrai
  // remboursement Stripe. `cancelBookingClient` filtre deja par `client_id`.
  const { data: booking } = await adminClient
    .from("bookings")
    .select("*, payments(amount_cents, stripe_payment_intent_id)")
    .eq("id", bookingId)
    .eq("consultant_id", user.id)
    .single();

  if (!booking) {
    return { success: false, error: "Réservation introuvable" };
  }

  // Statuts verrouilles avant toute action : une consultation honoree ou une
  // cliente absente ne se rembourse pas, et une reservation deja annulee
  // remboursee deux fois rend l'argent deux fois. Meme regle que cote cliente.
  if (["cancelled", "completed", "no_show"].includes(booking.status)) {
    return {
      success: false,
      error: "Cette réservation ne peut pas être annulée",
    };
  }

  // Apres le controle de statut : supprimer la reunion Zoom d'une reservation
  // qu'on refuse ensuite d'annuler laisserait un rendez-vous sans lien.
  if (booking.zoom_meeting_id) {
    try {
      const { deleteMeeting } = await import("@/lib/zoom/client");
      await deleteMeeting(booking.consultant_id, booking.zoom_meeting_id);
    } catch {
      // Non-blocking
    }
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
      payment_method: booking.payment_method ?? "online",
    },
  });

  try {
    const { sendBookingCancelled, sendBookingCancelledToConsultant } = await import("@/lib/emails/send");
    const { data: client } = await adminClient
      .from("profiles")
      .select("email, first_name")
      .eq("id", booking.client_id)
      .single();

    const { data: consultant } = await adminClient
      .from("consultants")
      .select("profiles!consultants_id_fkey (email, first_name, last_name)")
      .eq("id", booking.consultant_id)
      .single();

    const consultantProfile = consultant?.profiles as unknown as {
      email: string;
      first_name: string | null;
      last_name: string | null;
    } | null;

    const { format: fmtDate } = await import("date-fns");
    const { fr } = await import("date-fns/locale");
    const dateStr = fmtDate(new Date(booking.starts_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });

    let refundInfo = "Aucun remboursement.";
    if (refundAmountCents > 0) {
      refundInfo = `Remboursement de ${(refundAmountCents / 100).toFixed(2)} € effectué.`;
    }
    if (booking.payment_method === "on_site") {
      refundInfo = "Paiement sur place, aucun remboursement nécessaire.";
    }

    if (client?.email) {
      await sendBookingCancelled(client.email, {
        client_name: client.first_name ?? "",
        date: dateStr,
        refund_info: refundInfo,
      });
    }

    if (consultantProfile?.email) {
      await sendBookingCancelledToConsultant(consultantProfile.email, {
        consultant_name: `${consultantProfile.first_name ?? ""} ${consultantProfile.last_name ?? ""}`.trim(),
        client_name: client?.first_name ?? "Client",
        date: dateStr,
        reason,
      });
    }
  } catch {
    // Non-blocking
  }

  revalidatePath("/espace-consultante/reservations");
  revalidatePath("/espace-client/reservations");
  return { success: true };
};

export const completeBooking = async (
  bookingId: string
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", bookingId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la complétion" };
  }

  revalidatePath("/espace-consultante/reservations");
  return { success: true };
};

/**
 * Enregistre l'encaissement d'une reservation reglee sur place, et emet sa
 * facture.
 *
 * Le paiement en ligne cree sa ligne `payments` (et sa facture) via le webhook
 * Stripe ; le sur-place, lui, n'avait aucun moment « encaisse » — la vente
 * restait donc hors comptabilite et sans facture. Cette action comble ce trou :
 * la consultante confirme l'encaissement, une ligne `payments` est creee et la
 * facture emise, exactement comme pour une vente en ligne.
 *
 * Le montant n'est pas saisi mais recalcule a partir de l'option de duree, du
 * lieu et de la date : c'est le prix affiche a la cliente, donc celui qu'elle a
 * regle. Un cas particulier se corrige ensuite par avoir (espace facturation).
 */
export const markBookingPaid = async (
  bookingId: string
): Promise<ActionResult> => {
  const { user } = await getSupabaseAndUser();
  // Client admin (contourne les RLS) mais action scoppee au consultant_id : une
  // consultante ne peut encaisser que ses propres reservations.
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, client_id, consultant_id, duration_option_id, location, starts_at, payment_method, status"
    )
    .eq("id", bookingId)
    .eq("consultant_id", user.id)
    .single();

  if (!booking) {
    return { success: false, error: "Réservation introuvable" };
  }

  if (booking.payment_method !== "on_site") {
    return {
      success: false,
      error:
        "Seules les réservations réglées sur place peuvent être encaissées ici.",
    };
  }

  // Une consultation annulee ou une cliente absente ne s'encaisse pas.
  if (["cancelled", "no_show"].includes(booking.status)) {
    return {
      success: false,
      error: "Cette réservation ne peut pas être encaissée.",
    };
  }

  // Sans profil de facturation complet, aucune facture conforme : on refuse
  // plutot que d'encaisser sans pouvoir facturer.
  if (!(await consultantCanSell(admin, user.id))) {
    return {
      success: false,
      error:
        "Complétez vos informations de facturation avant d'encaisser une " +
        "réservation.",
    };
  }

  // Le booking ne stocke pas le montant : on le recalcule (prix affiche).
  const { data: durationOption } = await admin
    .from("consultation_type_durations")
    .select("*")
    .eq("id", booking.duration_option_id)
    .single();

  if (!durationOption) {
    return {
      success: false,
      error: "Option de durée introuvable pour cette réservation.",
    };
  }

  let surchargeCents = 0;
  if (booking.location === "domicile") {
    const { data: loc } = await admin
      .from("consultant_locations")
      .select("surcharge_cents")
      .eq("consultant_id", booking.consultant_id)
      .eq("location_type", "domicile")
      .eq("is_active", true)
      .maybeSingle();
    surchargeCents = loc?.surcharge_cents ?? 0;
  }

  const price = computeBookingPrice({
    duration: durationOption as ConsultationTypeDuration,
    date: new Date(booking.starts_at),
    location: booking.location,
    surchargeCents,
  });

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      stripe_payment_intent_id: null,
      client_id: booking.client_id,
      consultant_id: booking.consultant_id,
      amount_cents: price.totalCents,
      // Aucune commission plateforme sur un encaissement sur place : la
      // plateforme ne touche pas ces fonds.
      platform_fee_cents: 0,
      currency: "eur",
      type: "booking",
      reference_id: bookingId,
      status: "succeeded",
    })
    .select("id")
    .single();

  if (payErr || !payment) {
    // 23505 : double encaissement rattrape par l'index unique partiel (00055).
    if ((payErr as { code?: string } | null)?.code === "23505") {
      return { success: false, error: "Cette réservation est déjà encaissée." };
    }
    return {
      success: false,
      error: "Erreur lors de l'enregistrement de l'encaissement.",
    };
  }

  await emitInvoiceForPayment(admin, payment.id);

  await admin.from("audit_logs").insert({
    user_id: user.id,
    action: "booking_marked_paid",
    entity_type: "booking",
    entity_id: bookingId,
    metadata: { amount_cents: price.totalCents, payment_id: payment.id },
  });

  revalidatePath("/espace-consultante/reservations");
  revalidatePath(`/espace-consultante/reservations/${bookingId}`);
  return { success: true };
};

export const markNoShow = async (
  bookingId: string
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "no_show" })
    .eq("id", bookingId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/espace-consultante/reservations");
  return { success: true };
};

import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTransfer, createRefund } from "@/lib/stripe/connect";
import { stripe as stripeClient } from "@/lib/stripe/client";
import {
  splitFormationRevenue,
  type Collaborator,
} from "@/lib/stripe/revenue-split";
import {
  sendFormationAccess,
  sendBookingConfirmation,
  sendBookingConfirmedToConsultant,
  sendBookingSlotConflict,
} from "@/lib/emails/send";
import { siteConfig } from "@/config/site";
import { runAutomations } from "@/lib/automations/engine";
import { createNotification } from "@/lib/notifications";
import { autoAssignLabelsOnEnrollment } from "@/lib/admin-workflows/labels";
import { sendGuestSetupEmailIfNeeded } from "@/lib/auth/password-setup";

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

  let bookingOutcome: BookingOutcome = "created";

  switch (type) {
    case "formation":
      await handleFormationPurchase(
        client_id,
        reference_id,
        paymentIntentId ?? null,
      );
      break;
    case "booking":
      bookingOutcome = await handleBookingConfirmation(
        session,
        paymentIntentId ?? null,
      );
      break;
    case "event":
      await handleEventRegistration(
        client_id,
        reference_id,
        paymentIntentId ?? null,
      );
      break;
  }

  // Creneau vendu deux fois : la cliente a paye pour une consultation qui ne
  // peut pas avoir lieu. On rembourse plutot que de garder l'argent.
  const slotConflict = bookingOutcome === "slot_conflict";
  if (slotConflict && paymentIntentId) {
    await createRefund(paymentIntentId);
    await notifySlotConflict(session, client_id);
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
        status: slotConflict ? "refunded" : "succeeded",
      },
      { onConflict: "stripe_payment_intent_id" },
    );

  await logAudit(
    client_id,
    slotConflict ? "booking_slot_conflict_refunded" : "payment_completed",
    type,
    reference_id,
    { amount: session.amount_total, payment_intent: paymentIntentId },
  );

  // Confirmer une reservation qui n'existe pas serait pire que de ne rien
  // envoyer. Idem pour une redelivery : les emails sont deja partis.
  if (bookingOutcome === "created") {
    await sendCheckoutEmails(type, client_id, consultant_id, reference_id);
    await fireCheckoutAutomations(type, client_id, consultant_id, reference_id);
  }
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
  const supabase = getSupabase();

  await supabase
    .from("payments")
    .update({
      status: isFullRefund ? "refunded" : "partially_refunded",
      refund_amount_cents: refundedAmount,
      refunded_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntentId);

  await syncBookingAfterRefund(paymentIntentId, refundedAmount, isFullRefund);
};

/** Reservations que le remboursement peut encore annuler. */
const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"];

/**
 * Repercute un remboursement sur la reservation qu'il concerne.
 *
 * Un remboursement emis depuis le dashboard Stripe ne passe pas par
 * `cancelBooking` : cet evenement est le seul a en informer l'application.
 * Tant qu'il ne touchait que `payments`, la reservation restait active — la
 * consultante gardait le rendez-vous a son agenda, le creneau restait bloque
 * par l'index d'unicite, et la cliente croyait sa place reservee alors que son
 * argent lui avait ete rendu.
 *
 * Le montant est toujours enregistre ; l'annulation, elle, n'a lieu que si la
 * reservation est encore active. Rembourser une consultation honoree est un
 * geste commercial : elle a bien eu lieu, l'effacer de l'agenda serait faux.
 */
const syncBookingAfterRefund = async (
  paymentIntentId: string,
  refundedAmount: number,
  isFullRefund: boolean,
) => {
  const supabase = getSupabase();

  const { data: payment } = await supabase
    .from("payments")
    .select("type, reference_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (payment?.type !== "booking" || !payment.reference_id) return;

  const { data: booking } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", payment.reference_id)
    .single();

  if (!booking) return;

  const updates: Record<string, unknown> = {
    refund_amount_cents: refundedAmount,
  };

  if (isFullRefund && ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    updates.status = "cancelled";
    updates.cancelled_at = new Date().toISOString();
    updates.cancellation_reason = "Remboursement integral enregistre chez Stripe";
  }

  await supabase
    .from("bookings")
    .update(updates)
    .eq("id", payment.reference_id);
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
    .update({
      stripe_account_status: status,
      // `onboarding_completed` etait lu par l'admin — badge « onboarding non
      // termine » — mais ecrit nulle part : il restait `false` a vie, meme
      // pour une consultante parfaitement operationnelle. Seul cet evenement
      // sait quand Stripe a fini de valider le compte.
      //
      // On se cale sur `charges_enabled` et non sur `details_submitted` :
      // le second veut dire « formulaire envoye », pas « valide ». Stripe peut
      // encore reclamer des pieces, et le compte ne peut rien encaisser.
      onboarding_completed: account.charges_enabled === true,
    })
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
      // Le compte destinataire a disparu : la laisser « onboardee » afficherait
      // une consultante prete a encaisser alors qu'elle n'a plus ou recevoir.
      onboarding_completed: false,
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
  await distributeFormationRevenue(formationId, paymentIntentId);

  // 3. Auto-assign platform labels
  await autoAssignLabelsOnEnrollment(clientId, formationId).catch(
    console.error,
  );
};

/**
 * After a formation purchase, query collaborators and transfer their revenue share.
 * The main consultant receives the full payment via checkout transfer_data.destination,
 * then we create separate transfers from the platform balance to collaborators.
 *
 * Revenue share is calculated from the net amount (after platform fee).
 */
/**
 * Repartit le produit d'une vente entre proprietaire et collaboratrices.
 *
 * Ne fait rien sur une charge destination : la consultante a deja recu les
 * fonds directement. La repartition ne concerne que les ventes encaissees par
 * la plateforme, c'est-a-dire celles qui ont des collaboratrices.
 */
const distributeFormationRevenue = async (
  formationId: string,
  paymentIntentId: string | null,
) => {
  if (!paymentIntentId) return;

  const supabase = getSupabase();

  const { data: collaborators } = await supabase
    .from("formation_collaborators")
    .select(
      "consultant_id, revenue_share, consultants!formation_collaborators_consultant_id_fkey(stripe_account_id, stripe_account_status)",
    )
    .eq("formation_id", formationId);

  if (!collaborators?.length) return;

  const { data: formation } = await supabase
    .from("formations")
    .select("consultant_id")
    .eq("id", formationId)
    .single();

  if (!formation) return;

  const { data: payment } = await supabase
    .from("payments")
    .select("amount_cents, platform_fee_cents")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (!payment) return;

  // La charge doit etre restee sur la plateforme pour qu'il y ait quelque
  // chose a repartir. Si elle a ete versee directement a la consultante, la
  // vente a ete creee avant la bascule de modele : on le signale plutot que de
  // tenter un virement qui echouerait faute de fonds.
  const charge = await getPlatformCharge(paymentIntentId);

  if (!charge) {
    await logAudit(
      formation.consultant_id,
      "collaborator_split_impossible",
      "formation",
      formationId,
      {
        reason: "charge_versee_directement_a_la_consultante",
        payment_intent_id: paymentIntentId,
      },
    );
    return;
  }

  const eligible: Collaborator[] = [];

  for (const collab of collaborators) {
    const consultant = collab.consultants as unknown as {
      stripe_account_id: string | null;
      stripe_account_status: string | null;
    } | null;

    if (
      !consultant?.stripe_account_id ||
      consultant.stripe_account_status !== "active"
    ) {
      // Sa part reste a la proprietaire : la laisser sur la plateforme
      // reviendrait a garder de l'argent qui ne lui appartient pas.
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

    eligible.push({
      consultantId: collab.consultant_id,
      revenueShare: Number(collab.revenue_share),
    });
  }

  let parts;
  try {
    parts = splitFormationRevenue({
      amountCents: payment.amount_cents,
      platformFeeCents: payment.platform_fee_cents,
      ownerId: formation.consultant_id,
      collaborators: eligible,
    });
  } catch (error) {
    await logAudit(
      formation.consultant_id,
      "collaborator_split_invalid",
      "formation",
      formationId,
      { error: error instanceof Error ? error.message : "Unknown error" },
    );
    return;
  }

  const accounts = await stripeAccountsFor(parts.map((p) => p.consultantId));

  for (const part of parts) {
    const account = accounts.get(part.consultantId);
    if (!account) continue;

    try {
      await createTransfer(
        part.amountCents,
        account,
        {
          type: "formation_revenue_split",
          formation_id: formationId,
          consultant_id: part.consultantId,
          payment_intent_id: paymentIntentId,
        },
        {
          sourceTransaction: charge,
          transferGroup: paymentIntentId,
          // Une redelivery Stripe rejouerait la repartition : sans cette cle,
          // chaque part serait versee une seconde fois.
          idempotencyKey: `split:${paymentIntentId}:${part.consultantId}`,
        },
      );

      await logAudit(
        part.consultantId,
        "collaborator_transfer_completed",
        "formation",
        formationId,
        { amount_cents: part.amountCents },
      );
    } catch (error) {
      await logAudit(
        part.consultantId,
        "collaborator_transfer_failed",
        "formation",
        formationId,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          amount_cents: part.amountCents,
        },
      );
    }
  }
};

/** Identifiant de la charge si elle est restee sur la plateforme, sinon null. */
const getPlatformCharge = async (
  paymentIntentId: string,
): Promise<string | null> => {
  const intent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
  const chargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id;

  if (!chargeId) return null;

  const charge = await stripeClient.charges.retrieve(chargeId, {
    expand: ["transfer"],
  });

  // Une charge destination porte deja un transfert : les fonds sont partis.
  return charge.transfer ? null : chargeId;
};

/** Comptes Stripe actifs des consultantes concernees, indexes par identifiant. */
const stripeAccountsFor = async (
  consultantIds: string[],
): Promise<Map<string, string>> => {
  const { data } = await getSupabase()
    .from("consultants")
    .select("id, stripe_account_id, stripe_account_status")
    .in("id", consultantIds);

  const accounts = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.stripe_account_id && row.stripe_account_status === "active") {
      accounts.set(row.id, row.stripe_account_id);
    }
  }
  return accounts;
};

/** Nom de l'index unique garantissant qu'un creneau n'est vendu qu'une fois. */
const SLOT_CONSTRAINT = "bookings_consultant_slot_unique";

/** Code Postgres pour une violation de contrainte d'unicite. */
const UNIQUE_VIOLATION = "23505";

export type BookingOutcome =
  /** Reservation creee. */
  | "created"
  /** Deja traitee : redelivery Stripe du meme evenement. */
  | "duplicate"
  /** Le creneau a ete vendu a quelqu'un d'autre entre le paiement et le fulfillment. */
  | "slot_conflict";

const handleBookingConfirmation = async (
  session: Stripe.Checkout.Session,
  paymentIntentId: string | null,
): Promise<BookingOutcome> => {
  const meta = session.metadata ?? {};

  // The booking was not pre-created — insert it now with confirmed status.
  const { error } = await getSupabase()
    .from("bookings")
    .insert({
      id: meta.reference_id,
      client_id: meta.client_id,
      consultant_id: meta.consultant_id,
      consultation_type_id: meta.consultation_type_id,
      duration_option_id: meta.duration_option_id,
      starts_at: meta.starts_at,
      ends_at: meta.ends_at,
      status: "confirmed",
      location: meta.location,
      payment_method: "online",
      reason: meta.reason ?? "",
      stripe_payment_intent_id: paymentIntentId,
    });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      // Deux violations d'unicite tres differentes se ressemblent ici : celle
      // sur la cle primaire veut dire « deja fait », celle sur le creneau veut
      // dire « vendu deux fois ». Les confondre, c'est soit boucler sur des
      // redeliveries, soit encaisser une consultation impossible a honorer.
      if (error.message.includes(SLOT_CONSTRAINT)) return "slot_conflict";
      return "duplicate";
    }

    // Toute autre erreur doit remonter : sans ca, Stripe considere l'evenement
    // traite alors que la reservation n'existe pas, et la cliente a paye pour rien.
    throw new Error(`Insertion du booking echouee : ${error.message}`);
  }

  // Create in-app notification for the client (non-blocking)
  try {
    const { data: ct } = await getSupabase()
      .from("consultation_types")
      .select("title")
      .eq("id", meta.consultation_type_id)
      .single();
    await createNotification(
      meta.client_id,
      "booking_confirmed",
      "Réservation confirmée",
      ct?.title
        ? `Votre consultation "${ct.title}" a été confirmée.`
        : "Votre consultation a été confirmée.",
      { booking_id: meta.reference_id }
    );
  } catch {
    // Non-blocking
  }

  // Create Zoom meeting for teleconsultations (non-blocking)
  if (meta.location === "teleconsultation") {
    try {
      const { createMeeting } = await import("@/lib/zoom/client");
      const durationMinutes = Math.round(
        (new Date(meta.ends_at).getTime() - new Date(meta.starts_at).getTime()) / 60000,
      );
      const { data: consultationType } = await getSupabase()
        .from("consultation_types")
        .select("title")
        .eq("id", meta.consultation_type_id)
        .single();
      const topic = consultationType?.title
        ? `${consultationType.title} — Téléconsultation`
        : "Téléconsultation";
      const meeting = await createMeeting(
        meta.consultant_id,
        topic,
        meta.starts_at,
        durationMinutes,
      );
      await getSupabase()
        .from("bookings")
        .update({
          zoom_meeting_id: meeting.id,
          zoom_join_url: meeting.join_url,
          zoom_host_url: meeting.start_url,
        })
        .eq("id", meta.reference_id);
    } catch {
      // Non-blocking: Zoom failure should never fail the booking
    }
  }

  return "created";
};

/**
 * Previent la cliente que son creneau a ete pris et qu'elle a ete remboursee.
 *
 * Non bloquant : le remboursement est deja parti, et faire echouer le webhook
 * ici ferait retenter Stripe sur un evenement dont la partie argent est faite.
 */
const notifySlotConflict = async (
  session: Stripe.Checkout.Session,
  clientId: string,
) => {
  try {
    const meta = session.metadata ?? {};
    const { data: profile } = await getSupabase()
      .from("profiles")
      .select("email, first_name")
      .eq("id", clientId)
      .single();

    if (!profile?.email) return;

    const startsAt = meta.starts_at ? new Date(meta.starts_at) : null;
    const amount = ((session.amount_total ?? 0) / 100).toFixed(2);

    await sendBookingSlotConflict(profile.email, {
      client_name: profile.first_name ?? "",
      date: startsAt
        ? startsAt.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        : "",
      time: startsAt
        ? startsAt.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      amount_refunded: `${amount.replace(".", ",")} €`,
      booking_url: `${siteConfig.url}/reserver`,
    });
  } catch {
    // L'email est un pis-aller : son echec ne doit pas rejouer le webhook.
  }
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
      .select("email, first_name, password_hash")
      .eq("id", clientId)
      .single();

    if (!clientProfile?.email) return;

    const clientName = clientProfile.first_name ?? "";

    // Reservation en invitee payee en ligne : `createBooking` a cree le profil
    // avant de rediriger vers Checkout, mais il rend la main a Stripe et
    // n'envoie rien. Sans cet appel, la cliente a paye, sa reservation existe,
    // un compte porte son adresse — et personne ne lui a jamais dit comment y
    // acceder. Le lien ne partait que sur le chemin « paiement sur place ».
    await sendGuestSetupEmailIfNeeded(supabase, {
      id: clientId,
      email: clientProfile.email,
      first_name: clientProfile.first_name,
      password_hash: clientProfile.password_hash,
    });

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
          "starts_at, zoom_join_url, zoom_host_url, consultants(profiles!consultants_id_fkey(first_name, last_name, email))",
        )
        .eq("id", referenceId)
        .single();

      if (booking) {
        const consultant = booking.consultants as unknown as {
          profiles: {
            first_name: string | null;
            last_name: string | null;
            email: string | null;
          } | null;
        } | null;
        const consultantProfile = consultant?.profiles ?? null;
        const consultantName = consultantProfile
          ? `${consultantProfile.first_name ?? ""} ${consultantProfile.last_name ?? ""}`.trim()
          : "";
        const startsAt = new Date(booking.starts_at);
        const date = startsAt.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const time = startsAt.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        await sendBookingConfirmation(clientProfile.email, {
          client_name: clientName,
          consultant_name: consultantName,
          date,
          time,
          zoom_join_url: booking.zoom_join_url ?? undefined,
        });

        if (consultantProfile?.email) {
          await sendBookingConfirmedToConsultant(consultantProfile.email, {
            consultant_name: consultantName,
            client_name: clientName,
            date,
            time,
            zoom_host_url: booking.zoom_host_url ?? undefined,
          });
        }
      }
    }
  } catch {
    // Non-blocking: email failure should never fail the webhook
  }
};

const fireCheckoutAutomations = async (
  type: string,
  clientId: string,
  consultantId: string,
  referenceId: string,
) => {
  try {
    const supabase = getSupabase();
    const { data: client } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("id", clientId)
      .single();

    const triggerData = {
      client_id: clientId,
      client_email: client?.email,
      client_name: client?.first_name ?? "",
    };

    if (type === "formation") {
      const { data: formation } = await supabase
        .from("formations")
        .select("title")
        .eq("id", referenceId)
        .single();
      await runAutomations("formation_purchased", consultantId, {
        ...triggerData,
        formation_id: referenceId,
        formation_title: formation?.title,
      });
    } else if (type === "booking") {
      const { data: booking } = await supabase
        .from("bookings")
        .select("consultation_type_id, consultation_types(title)")
        .eq("id", referenceId)
        .single();
      const ctRaw = booking?.consultation_types as { title: string } | { title: string }[] | null | undefined;
      const ct = Array.isArray(ctRaw) ? ctRaw[0] : ctRaw ?? null;
      await runAutomations("booking_confirmed", consultantId, {
        ...triggerData,
        booking_id: referenceId,
        consultation_type_id: (booking as { consultation_type_id?: string })?.consultation_type_id,
        consultation_type_title: ct?.title,
      });
    } else if (type === "event") {
      const { data: event } = await supabase
        .from("events")
        .select("title, starts_at")
        .eq("id", referenceId)
        .single();
      await runAutomations("event_registered", consultantId, {
        ...triggerData,
        event_id: referenceId,
        event_title: event?.title,
        event_starts_at: event?.starts_at,
      });
    }
  } catch {
    // Non-blocking
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

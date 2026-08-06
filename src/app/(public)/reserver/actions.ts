"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe/connect";
import {
  routeSale,
  isPlatformOwnerConsultant,
} from "@/lib/stripe/sale-routing";
import { consultantCanSell } from "@/lib/invoicing/consultant-billing";
import {
  attachSessionToRedemption,
  resolvePromoForPurchase,
} from "@/lib/promo/reserve";
import { bookingRequiresWaiver } from "@/lib/legal/withdrawal";
import { recordWithdrawalWaiver } from "@/lib/legal/record-waiver";
import { computeAvailableSlots } from "@/lib/booking/slots";
import { computeBookingPrice } from "@/lib/booking/pricing";
import { contactSchema } from "@/validations/bookings";
import {
  sendBookingConfirmation,
  sendNewBookingNotification,
} from "@/lib/emails/send";
import { sendGuestSetupEmailIfNeeded } from "@/lib/auth/password-setup";
import { addMinutes, format, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { siteConfig } from "@/config/site";
import type { ActionResult } from "@/types";
import type { ConsultationLocation, BookingPaymentMethod, ConsultationTypeDuration } from "@/types/database";

export type BookingFormData = {
  consultation_type_id: string;
  consultant_id: string;
  duration_option_id: string;
  location: ConsultationLocation;
  starts_at: string;
  contact: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    reason: string;
  };
  payment_method: BookingPaymentMethod;
  /**
   * Renonciation au droit de retractation, recueillie a la confirmation.
   *
   * Obligatoire des lors que la consultation a lieu dans les quatorze jours :
   * la prestation serait executee avant l'expiration du delai legal.
   */
  withdrawal_waiver_accepted?: boolean;
  /**
   * Code promo saisi a l'etape paiement. Ignore hors paiement en ligne : un
   * reglement sur place ne passe pas par la plateforme.
   */
  promo_code?: string;
};

// ─── Public queries ──────────────────────────────────────────

/**
 * Returns unique service titles with their available locations.
 * Duration/price info is no longer per-service — it comes from the duration step.
 */
export const getConsultationTypes = async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("consultation_types")
    .select(
      "id, consultant_id, title, description, duration_minutes, price_cents, currency, is_online, buffer_minutes, available_locations"
    )
    .eq("is_active", true)
    .order("title");
  return data ?? [];
};

/**
 * Returns available duration options for a given service title.
 * Aggregates across all consultants so the client sees every possible duration.
 */
export const getDurationsForService = async (
  serviceTitle: string
): Promise<
  {
    duration_minutes: number;
    min_price_cents: number;
    max_price_cents: number;
    currency: string;
  }[]
> => {
  const supabase = createAdminClient();

  // Get all active consultation_type IDs for this service title
  const { data: types } = await supabase
    .from("consultation_types")
    .select("id, currency")
    .eq("title", serviceTitle)
    .eq("is_active", true);

  if (!types || types.length === 0) return [];

  const typeIds = types.map((t) => t.id);
  const currency = types[0].currency;

  const { data: durations } = await supabase
    .from("consultation_type_durations")
    .select("duration_minutes, price_cents")
    .in("consultation_type_id", typeIds)
    .order("duration_minutes");

  if (!durations || durations.length === 0) return [];

  // Group by duration_minutes and compute min/max price
  const grouped = new Map<
    number,
    { min: number; max: number }
  >();

  for (const d of durations) {
    const existing = grouped.get(d.duration_minutes);
    if (existing) {
      existing.min = Math.min(existing.min, d.price_cents);
      existing.max = Math.max(existing.max, d.price_cents);
    } else {
      grouped.set(d.duration_minutes, {
        min: d.price_cents,
        max: d.price_cents,
      });
    }
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([duration_minutes, prices]) => ({
      duration_minutes,
      min_price_cents: prices.min,
      max_price_cents: prices.max,
      currency,
    }));
};

export const getConsultantsForService = async (
  consultationTypeTitle: string,
  location: ConsultationLocation,
  durationMinutes?: number
) => {
  const supabase = await createClient();

  const { data: types } = await supabase
    .from("consultation_types")
    .select("id, consultant_id, is_online")
    .eq("title", consultationTypeTitle)
    .eq("is_active", true);

  type Row = { id: string; consultant_id: string; is_online?: boolean | null };
  let rows = (types ?? []) as Row[];

  // If a duration is specified, filter to only types that have this duration option
  if (durationMinutes && rows.length > 0) {
    const typeIds = rows.map((r) => r.id);
    const admin = createAdminClient();
    const { data: durRows } = await admin
      .from("consultation_type_durations")
      .select("consultation_type_id")
      .in("consultation_type_id", typeIds)
      .eq("duration_minutes", durationMinutes);

    const validTypeIds = new Set(
      (durRows ?? []).map((d) => d.consultation_type_id)
    );
    rows = rows.filter((r) => validTypeIds.has(r.id));
  }

  const consultantIds = [
    ...new Set(
      rows
        .filter((t) =>
          location === "teleconsultation" ? t.is_online !== false : true
        )
        .map((t) => t.consultant_id)
    ),
  ];
  if (consultantIds.length === 0) return [];

  const { data: locations } = await supabase
    .from("consultant_locations")
    .select("consultant_id")
    .eq("location_type", location)
    .eq("is_active", true)
    .in("consultant_id", consultantIds);

  const locationConsultantIds = (locations ?? []).map((l) => l.consultant_id);

  const filteredIds =
    location === "teleconsultation"
      ? consultantIds
      : consultantIds.filter((id) => locationConsultantIds.includes(id));

  if (filteredIds.length === 0) return [];

  const { data: consultants } = await supabase
    .from("consultants")
    .select(
      `
      id,
      slug,
      bio,
      specialties,
      profiles!consultants_id_fkey (
        first_name,
        last_name,
        avatar_url
      )
    `
    )
    .in("id", filteredIds)
    .eq("is_active", true)
    .eq("stripe_account_status", "active");

  return consultants ?? [];
};

export const getAvailableSlots = async (
  consultantId: string,
  consultationTypeId: string,
  dateStr: string,
  durationMinutes?: number
) => {
  const supabase = createAdminClient();
  const date = new Date(dateStr);

  const [availRes, exceptionRes, bookingRes, typeRes] = await Promise.all([
    supabase
      .from("availabilities")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("consultant_id", consultantId)
      .eq("is_active", true),
    supabase
      .from("availability_exceptions")
      .select("date, is_available, start_time, end_time")
      .eq("consultant_id", consultantId)
      .eq("date", format(date, "yyyy-MM-dd")),
    supabase
      .from("bookings")
      .select("starts_at, ends_at")
      .eq("consultant_id", consultantId)
      .in("status", ["pending", "confirmed"])
      .gte("starts_at", startOfDay(date).toISOString())
      .lte("starts_at", endOfDay(date).toISOString()),
    supabase
      .from("consultation_types")
      .select("duration_minutes, buffer_minutes")
      .eq("id", consultationTypeId)
      .single(),
  ]);

  if (!typeRes.data) return [];

  // Use the duration from the selected option if provided, fallback to type default
  const effectiveDuration = durationMinutes ?? typeRes.data.duration_minutes;

  const slots = computeAvailableSlots({
    date,
    availabilities: availRes.data ?? [],
    exceptions: exceptionRes.data ?? [],
    existingBookings: bookingRes.data ?? [],
    durationMinutes: effectiveDuration,
    bufferMinutes: typeRes.data.buffer_minutes ?? 15,
  });

  return slots.map((s) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    label: format(s.start, "HH:mm"),
  }));
};

export const getConsultantAvailableDays = async (
  consultantId: string,
  monthStr: string
) => {
  const supabase = createAdminClient();
  const monthStart = new Date(`${monthStr}-01`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);

  const [availRes, exceptionRes] = await Promise.all([
    supabase
      .from("availabilities")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("consultant_id", consultantId)
      .eq("is_active", true),
    supabase
      .from("availability_exceptions")
      .select("date, is_available, start_time, end_time")
      .eq("consultant_id", consultantId)
      .gte("date", format(monthStart, "yyyy-MM-dd"))
      .lte("date", format(monthEnd, "yyyy-MM-dd")),
  ]);

  const { getAvailableDates } = await import("@/lib/booking/slots");
  const dates = getAvailableDates({
    startDate: monthStart,
    endDate: monthEnd,
    availabilities: availRes.data ?? [],
    exceptions: exceptionRes.data ?? [],
  });

  return dates.map((d) => format(d, "yyyy-MM-dd"));
};

export const getConsultationTypeId = async (
  consultantId: string,
  serviceTitle: string,
  location: ConsultationLocation
): Promise<string | null> => {
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("consultation_types")
    .select("id, is_online")
    .eq("consultant_id", consultantId)
    .eq("title", serviceTitle)
    .eq("is_active", true);

  const list = (rows ?? []) as { id: string; is_online?: boolean | null }[];
  const match =
    location === "teleconsultation"
      ? list.find((r) => r.is_online !== false)
      : list[0];
  return match?.id ?? null;
};

/**
 * Returns the duration option for a consultant + service + duration_minutes combo.
 */
export const getDurationOptionForConsultant = async (
  consultantId: string,
  serviceTitle: string,
  durationMinutes: number
): Promise<ConsultationTypeDuration | null> => {
  const supabase = createAdminClient();

  const { data: types } = await supabase
    .from("consultation_types")
    .select("id")
    .eq("consultant_id", consultantId)
    .eq("title", serviceTitle)
    .eq("is_active", true);

  if (!types || types.length === 0) return null;

  const { data: duration } = await supabase
    .from("consultation_type_durations")
    .select("*")
    .in(
      "consultation_type_id",
      types.map((t) => t.id)
    )
    .eq("duration_minutes", durationMinutes)
    .limit(1)
    .single();

  return (duration as ConsultationTypeDuration) ?? null;
};

export const getSurcharge = async (
  consultantId: string,
  location: ConsultationLocation
): Promise<number> => {
  if (location !== "domicile") return 0;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("consultant_locations")
    .select("surcharge_cents")
    .eq("consultant_id", consultantId)
    .eq("location_type", "domicile")
    .eq("is_active", true)
    .single();

  return data?.surcharge_cents ?? 0;
};

/**
 * Compute the price for a specific slot given a duration option.
 * Called after slot selection to determine weekend/holiday pricing.
 */
export const computeSlotPrice = async (
  durationOptionId: string,
  slotStart: string,
  consultantId: string,
  location: ConsultationLocation
): Promise<{
  basePriceCents: number;
  isWeekendOrHoliday: boolean;
  surchargeCents: number;
  totalCents: number;
} | null> => {
  const supabase = createAdminClient();

  const { data: duration } = await supabase
    .from("consultation_type_durations")
    .select("*")
    .eq("id", durationOptionId)
    .single();

  if (!duration) return null;

  const surcharge = await getSurcharge(consultantId, location);
  const date = new Date(slotStart);

  return computeBookingPrice({
    duration: duration as ConsultationTypeDuration,
    date,
    location,
    surchargeCents: surcharge,
  });
};

// ─── Booking creation ────────────────────────────────────────

export const createBooking = async (
  formData: BookingFormData
): Promise<ActionResult<{ booking_id: string; redirect_url?: string }>> => {
  const contactParsed = contactSchema.safeParse(formData.contact);
  if (!contactParsed.success) {
    return { success: false, error: contactParsed.error.issues[0]?.message };
  }

  const { first_name, last_name, phone, email, reason } = contactParsed.data;
  const supabase = createAdminClient();

  // Fetch duration option
  const { data: durationOption } = await supabase
    .from("consultation_type_durations")
    .select("*")
    .eq("id", formData.duration_option_id)
    .single();

  if (!durationOption) {
    return { success: false, error: "Option de durée introuvable" };
  }

  // Fetch consultation type for metadata
  const { data: consultationType } = await supabase
    .from("consultation_types")
    .select("currency, title, buffer_minutes")
    .eq("id", formData.consultation_type_id)
    .single();

  if (!consultationType) {
    return { success: false, error: "Type de consultation introuvable" };
  }

  // Compute price with weekend/holiday detection
  const surcharge = await getSurcharge(formData.consultant_id, formData.location);
  const startsAt = new Date(formData.starts_at);

  const priceResult = computeBookingPrice({
    duration: durationOption as ConsultationTypeDuration,
    date: startsAt,
    location: formData.location,
    surchargeCents: surcharge,
  });

  const totalPriceCents = priceResult.totalCents;
  const endsAt = addMinutes(startsAt, durationOption.duration_minutes);

  // Verifie cote serveur, et pas seulement dans le formulaire : une server
  // action est un endpoint POST, appelable sans passer par l'interface.
  const waiverRequired = bookingRequiresWaiver(startsAt);
  if (waiverRequired && formData.withdrawal_waiver_accepted !== true) {
    return {
      success: false,
      error:
        "Vous devez accepter que la consultation ait lieu avant la fin du " +
        "délai de rétractation de quatorze jours.",
    };
  }

  // Guest checkout: find or create profile
  let clientId: string;
  // Pilote l'invitation a definir un mot de passe : une cliente qui reserve en
  // invitee pour la deuxieme fois sans avoir finalise son compte doit encore
  // recevoir le lien.
  let clientPasswordHash: string | null = null;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, password_hash")
    .eq("email", email.toLowerCase())
    .is("deleted_at", null)
    .single();

  if (existingProfile) {
    clientId = existingProfile.id;
    clientPasswordHash = existingProfile.password_hash;
    await supabase
      .from("profiles")
      .update({ first_name, last_name, phone })
      .eq("id", clientId);
  } else {
    const { data: newProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        roles: ["client"],
        first_name,
        last_name,
        phone,
      })
      .select("id")
      .single();

    if (profileError || !newProfile) {
      return { success: false, error: "Erreur lors de la création du profil" };
    }
    clientId = newProfile.id;
  }

  // Fetch consultant for Stripe and emails
  const { data: consultant } = await supabase
    .from("consultants")
    .select(
      "stripe_account_id, commission_rate, profiles!consultants_id_fkey (first_name, last_name, email)",
    )
    .eq("id", formData.consultant_id)
    .single();

  const consultantProfile = consultant?.profiles as unknown as {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;

  const consultantName = consultantProfile
    ? `${consultantProfile.first_name ?? ""} ${consultantProfile.last_name ?? ""}`.trim()
    : "Consultante";

  if (formData.payment_method === "on_site" && formData.location === "teleconsultation") {
    return { success: false, error: "Le paiement sur place n'est pas disponible pour les téléconsultations." };
  }

  if (formData.payment_method === "online") {
    // Ou vont les fonds : chez la consultante, ou sur la plateforme quand
    // c'est sa proprietaire qui consulte (voir sale-routing.ts).
    const isPlatformOwner = await isPlatformOwnerConsultant(
      supabase,
      formData.consultant_id,
    );

    const routing = consultant
      ? routeSale({
          isPlatformOwner,
          stripeAccountId: consultant.stripe_account_id,
          commissionRate: consultant.commission_rate,
          hasCollaborators: false,
        })
      : null;

    if (!routing) {
      return { success: false, error: "La consultante n'a pas configuré son compte Stripe" };
    }

    // Pas de vente en ligne sans pouvoir facturer : la facture est emise a
    // l'encaissement, et une facture sans les mentions obligatoires de
    // l'emettrice n'a aucune valeur. On refuse plutot que d'encaisser sans
    // pouvoir facturer.
    if (!(await consultantCanSell(supabase, formData.consultant_id))) {
      return {
        success: false,
        error:
          "La consultante n'a pas complété ses informations de facturation. " +
          "La réservation en ligne est momentanément indisponible.",
      };
    }

    // Pre-generate a booking ID to use in the success URL and Stripe metadata.
    // The booking record is NOT created here — it is created by the Stripe webhook
    // (handleCheckoutCompleted) once payment is confirmed. This ensures that abandoned
    // checkouts never leave orphan bookings in the database.
    const bookingId = crypto.randomUUID();

    const promo = formData.promo_code?.trim()
      ? await resolvePromoForPurchase({
          code: formData.promo_code,
          serviceKind: "booking",
          itemId: formData.consultation_type_id,
          amountCents: totalPriceCents,
          profileId: clientId,
          reserve: true,
          orderKind: "booking",
          referenceId: bookingId,
        })
      : null;

    if (promo && !promo.ok) {
      return { success: false, error: promo.error };
    }

    const chargedCents = promo?.ok ? promo.finalCents : totalPriceCents;

    if (waiverRequired) {
      const recorded = await recordWithdrawalWaiver(supabase, {
        clientId,
        context: "booking",
        referenceId: bookingId,
      });

      // Sans trace, la plateforme ne pourrait pas prouver la renonciation en
      // cas de litige. Mieux vaut refuser la vente que d'encaisser sans preuve.
      if (!recorded) {
        return {
          success: false,
          error: "Impossible d'enregistrer votre accord. Réessayez.",
        };
      }
    }

    try {
      const session = await createCheckoutSession({
        consultantStripeAccountId: routing.destinationAccountId ?? undefined,
        holdOnPlatform: routing.holdOnPlatform,
        transferGroup: bookingId,
        commissionRate: routing.commissionRate,
        priceInCents: chargedCents,
        currency: consultationType.currency,
        productName: consultationType.title,
        productDescription: `Consultation avec ${consultantName} — ${durationOption.duration_minutes} min`,
        customerEmail: email,
        metadata: {
          type: "booking",
          reference_id: bookingId,
          client_id: clientId,
          consultant_id: formData.consultant_id,
          consultation_type_id: formData.consultation_type_id,
          duration_option_id: formData.duration_option_id,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          location: formData.location,
          reason: reason.substring(0, 500),
          platform_fee_cents: Math.round(
            chargedCents * (routing.commissionRate / 100)
          ).toString(),
          ...(promo?.ok
            ? {
                promo_code: promo.code,
                promo_code_id: promo.promoCodeId,
                promo_redemption_id: promo.redemptionId as string,
                discount_cents: promo.discountCents.toString(),
                original_price_cents: totalPriceCents.toString(),
              }
            : {}),
        },
        successUrl: `${siteConfig.url}/reserver/confirmation?booking_id=${bookingId}`,
        cancelUrl: `${siteConfig.url}/reserver?cancelled=true`,
      });

      if (promo?.ok && promo.redemptionId) {
        await attachSessionToRedemption(promo.redemptionId, session.id);
      }

      return {
        success: true,
        data: { booking_id: bookingId, redirect_url: session.url ?? undefined },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Stripe";
      return { success: false, error: `Erreur paiement : ${message}` };
    }
  }

  // on_site payment: create the booking immediately
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      client_id: clientId,
      consultant_id: formData.consultant_id,
      consultation_type_id: formData.consultation_type_id,
      duration_option_id: formData.duration_option_id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "pending",
      location: formData.location,
      payment_method: formData.payment_method,
      reason,
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    return { success: false, error: "Erreur lors de la création de la réservation" };
  }

  if (waiverRequired) {
    await recordWithdrawalWaiver(supabase, {
      clientId,
      context: "booking",
      referenceId: booking.id,
    });
  }

  const dateFormatted = format(startsAt, "EEEE d MMMM yyyy", { locale: fr });
  const timeFormatted = format(startsAt, "HH:mm");

  try {
    await sendBookingConfirmation(email, {
      client_name: first_name,
      consultant_name: consultantName,
      date: dateFormatted,
      time: timeFormatted,
    });

    if (consultantProfile?.email) {
      await sendNewBookingNotification(consultantProfile.email, {
        consultant_name: consultantName,
        client_name: `${first_name} ${last_name}`,
        date: dateFormatted,
        time: timeFormatted,
        reason,
        payment_method: "Sur place",
      });
    }

  } catch {
    // Non-blocking: emails can fail silently
  }

  // Hors du try : un echec sur les emails ci-dessus ne doit pas priver la
  // cliente du seul lien qui lui donne acces a son compte.
  await sendGuestSetupEmailIfNeeded(supabase, {
    id: clientId,
    email,
    first_name,
    password_hash: clientPasswordHash,
  });

  return { success: true, data: { booking_id: booking.id } };
};

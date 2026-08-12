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
  cancelRedemption,
  confirmRedemption,
  resolvePromoForPurchase,
} from "@/lib/promo/reserve";
import { bookingRequiresWaiver } from "@/lib/legal/withdrawal";
import { recordWithdrawalWaiver } from "@/lib/legal/record-waiver";
import { computeAvailableSlots } from "@/lib/booking/slots";
import { computeBookingPrice } from "@/lib/booking/pricing";
import { contactSchema } from "@/validations/bookings";
import { sendNewBookingNotification } from "@/lib/emails/send";
import { sendGuestSetupEmailIfNeeded } from "@/lib/auth/password-setup";
import { findOrCreateGuestProfile } from "@/lib/auth/guest-profile";
import { lookupGiftCard } from "@/lib/gift-cards/balance";
import { redeemGiftCard } from "@/lib/gift-cards/redeem";
import {
  giftCardErrorMessage,
  type GiftCardBookingCheck,
} from "@/lib/gift-cards/booking-errors";
import { addMinutes, format, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { siteConfig } from "@/config/site";
import { notify } from "@/lib/notifications";
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
  /**
   * Code carte cadeau saisi a l'etape paiement. Seule la valeur est
   * transmise : la validite et le solde sont revalides cote serveur au
   * moment de la redemption (webhook), jamais fait confiance a un montant
   * fourni par le client.
   */
  giftCardCode?: string;
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

/**
 * Verification en lecture seule, utilisee par le formulaire avant soumission
 * pour afficher la remise attendue. N'ecrit rien : la redemption reelle a
 * lieu dans le webhook Stripe, une fois le paiement confirme, et revalide
 * tout cote serveur (voir finalizeBookingGiftCardRedemption).
 */
export const checkGiftCardForBooking = async (
  code: string,
  amountCents: number,
  consultationTypeId: string,
): Promise<GiftCardBookingCheck> => {
  const supabase = createAdminClient();
  const lookup = await lookupGiftCard(supabase, code);

  if (!lookup.ok) return { ok: false, error: lookup.error };

  // Une carte « prestation » est liee a un type de consultation precis
  // (§7.3). Sans ce controle, une carte vendue pour une consultation courte a
  // 45 € couvrait integralement une consultation longue a 170 € : le montant
  // renvoye etait le prix de la prestation reservee, quel qu'il soit.
  if (lookup.type === "service" && lookup.consultationTypeId !== consultationTypeId) {
    return { ok: false, error: "consultation_type_mismatch" };
  }

  const discountCents =
    lookup.type === "amount" ? Math.min(lookup.balanceCents!, amountCents) : amountCents;

  return { ok: true, discountCents };
};

// ─── Booking creation ────────────────────────────────────────

export type CreateBookingData = {
  booking_id: string;
  redirect_url?: string;
  /**
   * La carte cadeau couvrait la totalite du prix : la reservation est deja
   * confirmee, il n'y a pas de redirection Stripe a suivre. Le formulaire
   * enchaine directement sur la page de confirmation.
   */
  no_payment_required?: boolean;
};

export const createBooking = async (
  formData: BookingFormData
): Promise<ActionResult<CreateBookingData>> => {
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
  // Pilote l'invitation a definir un mot de passe : une cliente qui reserve en
  // invitee pour la deuxieme fois sans avoir finalise son compte doit encore
  // recevoir le lien.
  const guestProfile = await findOrCreateGuestProfile(supabase, {
    email,
    first_name,
    last_name,
    phone,
  });

  if (!guestProfile.success) {
    return { success: false, error: guestProfile.error };
  }

  const clientId = guestProfile.id;
  const clientPasswordHash = guestProfile.password_hash;

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

    let giftCardDiscountCents = 0;
    if (formData.giftCardCode) {
      const giftCardCheck = await checkGiftCardForBooking(
        formData.giftCardCode,
        chargedCents,
        formData.consultation_type_id,
      );

      // Un code refuse doit etre dit. Tant qu'on l'ignorait en silence, la
      // cliente qui avait saisi un code expire ou inconnu partait payer le
      // plein tarif sans qu'aucun message ne lui signale que sa carte n'avait
      // pas ete prise en compte. Meme traitement que le code promo juste
      // au-dessus, qui refuse la vente plutot que de remiser dans le vide.
      if (!giftCardCheck.ok) {
        // Le code promo a deja ete reserve : sans liberation, son quota se
        // consommerait sur un tunnel qui n'aboutira pas.
        if (promo?.ok && promo.redemptionId) {
          await cancelRedemption(promo.redemptionId as string);
        }
        return { success: false, error: giftCardErrorMessage(giftCardCheck.error) };
      }

      giftCardDiscountCents = giftCardCheck.discountCents;
    }
    const finalChargedCents = Math.max(0, chargedCents - giftCardDiscountCents);

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

    // Carte cadeau couvrant la totalite du prix : il n'y a rien a encaisser.
    // C'est le cas NORMAL d'une carte « prestation », et celui d'une carte
    // « montant » dont le solde couvre le tarif. Stripe refuse une session a 0
    // (montant minimum de charge) : tant qu'on l'appelait quand meme, ces
    // reservations echouaient sur une erreur de paiement generique alors que
    // precisement rien ne devait etre paye.
    if (finalChargedCents === 0 && formData.giftCardCode) {
      return await confirmGiftCardCoveredBooking({
        bookingId,
        clientId,
        consultantId: formData.consultant_id,
        consultationTypeId: formData.consultation_type_id,
        durationOptionId: formData.duration_option_id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        location: formData.location,
        reason,
        giftCardCode: formData.giftCardCode,
        giftCardAmountCents: giftCardDiscountCents,
        promoRedemptionId: promo?.ok ? (promo.redemptionId as string | undefined) : undefined,
      });
    }

    try {
      const session = await createCheckoutSession({
        consultantStripeAccountId: routing.destinationAccountId ?? undefined,
        holdOnPlatform: routing.holdOnPlatform,
        transferGroup: bookingId,
        commissionRate: routing.commissionRate,
        priceInCents: finalChargedCents,
        currency: consultationType.currency,
        productName: consultationType.title,
        productDescription: `Consultation avec ${consultantName}, ${durationOption.duration_minutes} min`,
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
            finalChargedCents * (routing.commissionRate / 100)
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
          ...(formData.giftCardCode
            ? {
                gift_card_code: formData.giftCardCode,
                gift_card_discount_cents: String(giftCardDiscountCents),
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
    await notify(
      "booking_confirmed",
      [{ userId: clientId, email }],
      {
        booking_id: booking.id,
        client_name: first_name,
        consultant_name: consultantName,
        date: dateFormatted,
        time: timeFormatted,
      },
      { dedupeId: booking.id }
    );

    if (consultantProfile?.email) {
      // L'email de la consultante reste envoye ici : `sendNewBookingNotification`
      // porte le motif et le mode de paiement, que le canal email du catalogue
      // ne transporte pas. Seule la ligne in-app passe par notify().
      await notify(
        "consultant_new_booking",
        [{ userId: formData.consultant_id }],
        {
          booking_id: booking.id,
          client_name: `${first_name} ${last_name}`,
          consultant_name: consultantName,
          date: dateFormatted,
          time: timeFormatted,
        },
        { dedupeId: booking.id, channels: ["in_app"] }
      );

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

/**
 * Confirme une reservation entierement couverte par une carte cadeau.
 *
 * Aucun paiement Stripe n'a lieu sur ce chemin : il n'y aura donc aucun
 * `checkout.session.completed`, et rien de ce que le webhook fait d'habitude ne
 * se produira tout seul. Cette fonction rejoue donc ici les etapes qui comptent
 * pour la cliente : creation de la reservation confirmee, debit de la carte,
 * salle Zoom, confirmations. Les briques sont importees de `webhooks.ts` plutot
 * que dupliquees, pour que les deux chemins ne divergent pas.
 *
 * Volontairement absent : la ligne `payments` et la facture. Il n'y a pas
 * d'encaissement a enregistrer — la vente a ete facturee a l'achat de la carte,
 * et l'ecriture comptable de son usage est la ligne `gift_card_redemptions`.
 * La notification « paiement recu » est ecartee pour la meme raison.
 *
 * Import dynamique de `webhooks.ts` : ce module charge le SDK Stripe, inutile
 * sur les autres chemins de reservation.
 */
const confirmGiftCardCoveredBooking = async (input: {
  bookingId: string;
  clientId: string;
  consultantId: string;
  consultationTypeId: string;
  durationOptionId: string;
  startsAt: string;
  endsAt: string;
  location: ConsultationLocation;
  reason: string;
  giftCardCode: string;
  giftCardAmountCents: number;
  promoRedemptionId?: string;
}): Promise<ActionResult<CreateBookingData>> => {
  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      id: input.bookingId,
      client_id: input.clientId,
      consultant_id: input.consultantId,
      consultation_type_id: input.consultationTypeId,
      duration_option_id: input.durationOptionId,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      // Meme etat terminal qu'une reservation payee en ligne
      // (`handleBookingConfirmation`) : la prestation est due.
      status: "confirmed",
      location: input.location,
      payment_method: "online",
      reason: input.reason,
    })
    .select("id")
    .single();

  if (error || !booking) {
    if (input.promoRedemptionId) await cancelRedemption(input.promoRedemptionId);
    if (error?.message?.includes("bookings_consultant_slot_unique")) {
      return {
        success: false,
        error: "Ce créneau vient d'être réservé. Choisissez-en un autre.",
      };
    }
    return { success: false, error: "Erreur lors de la création de la réservation" };
  }

  const redemption = await redeemGiftCard(supabase, {
    code: input.giftCardCode,
    amountCents: input.giftCardAmountCents,
    bookingId: booking.id,
    recordedBy: input.consultantId,
  });

  // Course perdue : le solde a ete consomme entre la verification et
  // maintenant. On defait la reservation plutot que de la laisser confirmee —
  // sans paiement et sans debit de carte, la consultation serait offerte a
  // l'insu de la consultante. Rien n'y est encore attache a cet instant (ni
  // email, ni salle Zoom) : la suppression est propre, et la cliente peut
  // reessayer.
  if (!redemption.ok) {
    await supabase.from("bookings").delete().eq("id", booking.id);
    if (input.promoRedemptionId) await cancelRedemption(input.promoRedemptionId);
    return {
      success: false,
      error:
        "Votre carte cadeau n'a pas pu être appliquée (solde entre-temps " +
        "consommé). Aucune réservation n'a été enregistrée, réessayez.",
    };
  }

  if (input.promoRedemptionId) {
    await confirmRedemption(input.promoRedemptionId, null);
  }

  const { attachZoomMeetingIfNeeded, sendCheckoutEmails, fireCheckoutAutomations } =
    await import("@/lib/stripe/webhooks");

  await attachZoomMeetingIfNeeded({
    bookingId: booking.id,
    consultantId: input.consultantId,
    consultationTypeId: input.consultationTypeId,
    location: input.location,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  });

  await sendCheckoutEmails("booking", input.clientId, input.consultantId, booking.id);
  await fireCheckoutAutomations("booking", input.clientId, input.consultantId, booking.id);

  return {
    success: true,
    data: { booking_id: booking.id, no_payment_required: true },
  };
};

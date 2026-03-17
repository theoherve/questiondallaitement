"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe/connect";
import { computeAvailableSlots } from "@/lib/booking/slots";
import { contactSchema } from "@/validations/bookings";
import {
  sendBookingConfirmation,
  sendGuestAccountEmail,
  sendNewBookingNotification,
} from "@/lib/emails/send";
import { addMinutes, format, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { siteConfig } from "@/config/site";
import type { ActionResult } from "@/types";
import type { ConsultationLocation, BookingPaymentMethod } from "@/types/database";

export type BookingFormData = {
  consultation_type_id: string;
  consultant_id: string;
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
};

export const getConsultationTypes = async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("consultation_types")
    .select(
      "id, consultant_id, title, description, duration_minutes, price_cents, currency, is_online, buffer_minutes"
    )
    .eq("is_active", true)
    .order("title");
  return data ?? [];
};

export const getConsultantsForService = async (
  consultationTypeTitle: string,
  location: ConsultationLocation
) => {
  const supabase = await createClient();

  const { data: types } = await supabase
    .from("consultation_types")
    .select("consultant_id, is_online")
    .eq("title", consultationTypeTitle)
    .eq("is_active", true);

  type Row = { consultant_id: string; is_online?: boolean | null };
  const rows = (types ?? []) as Row[];
  const consultantIds = [
    ...new Set(
      rows
        .filter(
          (t) =>
            location === "teleconsultation"
              ? t.is_online !== false
              : true
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
    .eq("is_active", true);

  return consultants ?? [];
};

export const getAvailableSlots = async (
  consultantId: string,
  consultationTypeId: string,
  dateStr: string
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

  const slots = computeAvailableSlots({
    date,
    availabilities: availRes.data ?? [],
    exceptions: exceptionRes.data ?? [],
    existingBookings: bookingRes.data ?? [],
    durationMinutes: typeRes.data.duration_minutes,
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

export const createBooking = async (
  formData: BookingFormData
): Promise<ActionResult<{ booking_id: string; redirect_url?: string }>> => {
  const contactParsed = contactSchema.safeParse(formData.contact);
  if (!contactParsed.success) {
    return { success: false, error: contactParsed.error.issues[0]?.message };
  }

  const { first_name, last_name, phone, email, reason } = contactParsed.data;
  const supabase = createAdminClient();

  // Guest checkout: find or create profile
  let clientId: string;
  let isNewAccount = false;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .is("deleted_at", null)
    .single();

  if (existingProfile) {
    clientId = existingProfile.id;
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
        role: "client",
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
    isNewAccount = true;
  }

  // Fetch consultation type for duration + price
  const { data: consultationType } = await supabase
    .from("consultation_types")
    .select("duration_minutes, price_cents, currency, title")
    .eq("id", formData.consultation_type_id)
    .single();

  if (!consultationType) {
    return { success: false, error: "Type de consultation introuvable" };
  }

  const surcharge = await getSurcharge(formData.consultant_id, formData.location);
  const totalPriceCents = consultationType.price_cents + surcharge;

  const startsAt = new Date(formData.starts_at);
  const endsAt = addMinutes(startsAt, consultationType.duration_minutes);

  // Create the booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      client_id: clientId,
      consultant_id: formData.consultant_id,
      consultation_type_id: formData.consultation_type_id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: formData.payment_method === "online" ? "pending" : "pending",
      location: formData.location,
      payment_method: formData.payment_method,
      reason,
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    return { success: false, error: "Erreur lors de la création de la réservation" };
  }

  // Fetch consultant for Stripe and emails
  const { data: consultant } = await supabase
    .from("consultants")
    .select("stripe_account_id, commission_rate, profiles (first_name, last_name, email)")
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

  if (formData.payment_method === "online") {
    if (!consultant?.stripe_account_id) {
      return { success: false, error: "La consultante n'a pas configuré son compte Stripe" };
    }

    try {
      const session = await createCheckoutSession({
        consultantStripeAccountId: consultant.stripe_account_id,
        commissionRate: consultant.commission_rate,
        priceInCents: totalPriceCents,
        currency: consultationType.currency,
        productName: consultationType.title,
        productDescription: `Consultation avec ${consultantName}`,
        customerEmail: email,
        metadata: {
          type: "booking",
          reference_id: booking.id,
          client_id: clientId,
          consultant_id: formData.consultant_id,
          platform_fee_cents: Math.round(
            totalPriceCents * (consultant.commission_rate / 100)
          ).toString(),
        },
        successUrl: `${siteConfig.url}/reserver/confirmation?booking_id=${booking.id}`,
        cancelUrl: `${siteConfig.url}/reserver?cancelled=true`,
      });

      return {
        success: true,
        data: { booking_id: booking.id, redirect_url: session.url ?? undefined },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Stripe";
      return { success: false, error: `Erreur paiement : ${message}` };
    }
  }

  // on_site payment
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

    if (isNewAccount) {
      await sendGuestAccountEmail(email, {
        client_name: first_name,
        setup_url: `${siteConfig.url}/reset-password?email=${encodeURIComponent(email)}`,
      });
    }
  } catch {
    // Non-blocking: emails can fail silently
  }

  return { success: true, data: { booking_id: booking.id } };
};

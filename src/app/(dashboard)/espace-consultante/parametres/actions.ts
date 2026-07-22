"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { ConsultationLocation } from "@/types/database";

const REVALIDATE_PATH = "/espace-consultante/parametres";

// ---- Facturation ----

/**
 * Enregistre l'identite de facturation. Ces mentions figurent sur chaque
 * facture emise par la consultante ; sans elles, aucune vente en ligne ne peut
 * aboutir (gate a l'emission). Le SIREN est laisse libre car pre-rempli depuis
 * le numero de TVA a la migration.
 */
export const updateBillingProfile = async (
  formData: FormData,
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const value = (key: string) =>
    ((formData.get(key) as string) || "").trim() || null;

  const { error } = await supabase
    .from("consultants")
    .update({
      billing_legal_name: value("billing_legal_name"),
      billing_address: value("billing_address"),
      billing_siren: value("billing_siren"),
      billing_vat_number: value("billing_vat_number"),
      billing_legal_form: value("billing_legal_form"),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de l'enregistrement." };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

// ---- Profile (08-11) ----

export const updateProfile = async (
  formData: FormData
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      phone: (formData.get("phone") as string) || null,
    })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: "Erreur mise à jour du profil" };
  }

  const { error: consultantError } = await supabase
    .from("consultants")
    .update({
      bio: (formData.get("bio") as string) || null,
      specialties: (formData.get("specialties") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    })
    .eq("id", user.id);

  if (consultantError) {
    return { success: false, error: "Erreur mise à jour consultante" };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

export const uploadAvatar = async (
  formData: FormData
): Promise<ActionResult<{ url: string }>> => {
  const { supabase, user } = await getSupabaseAndUser();

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "Fichier requis" };

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Le fichier dépasse 5 Mo" };
  }

  try {
    const { uploadFile } = await import("@/lib/storage/helpers");
    const result = await uploadFile("avatars", user.id, file);

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: result.url })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: "Erreur mise à jour de l'avatar" };
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: { url: result.url } };
  } catch {
    return { success: false, error: "Erreur lors de l'upload" };
  }
};

// ---- Locations (08-12) ----

export type LocationFormData = {
  location_type: ConsultationLocation;
  label: string;
  address: string;
  city: string;
  postal_code: string;
  radius_km: number | null;
  surcharge_cents: number;
  is_active: boolean;
};

export const getLocations = async () => {
  const { supabase, user } = await getSupabaseAndUser();
  const { data } = await supabase
    .from("consultant_locations")
    .select("*")
    .eq("consultant_id", user.id)
    .order("created_at");

  return data ?? [];
};

export const upsertLocation = async (
  formData: LocationFormData
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: existing } = await supabase
    .from("consultant_locations")
    .select("id")
    .eq("consultant_id", user.id)
    .eq("location_type", formData.location_type)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("consultant_locations")
      .update({
        label: formData.label || null,
        address: formData.address || null,
        city: formData.city || null,
        postal_code: formData.postal_code || null,
        radius_km: formData.radius_km,
        surcharge_cents: formData.surcharge_cents,
        is_active: formData.is_active,
      })
      .eq("id", existing.id);

    if (error) return { success: false, error: "Erreur mise à jour du lieu" };
  } else {
    const { error } = await supabase.from("consultant_locations").insert({
      consultant_id: user.id,
      location_type: formData.location_type,
      label: formData.label || null,
      address: formData.address || null,
      city: formData.city || null,
      postal_code: formData.postal_code || null,
      radius_km: formData.radius_km,
      surcharge_cents: formData.surcharge_cents,
      is_active: formData.is_active,
    });

    if (error) return { success: false, error: "Erreur création du lieu" };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

// ---- Consultation Types (08-13) ----

export type ConsultationTypeFormData = {
  title: string;
  description: string;
  available_locations: ConsultationLocation[];
  buffer_minutes: number;
};

export type DurationOptionFormData = {
  duration_minutes: number;
  price_cents: number;
  weekend_price_cents: number | null;
  is_default: boolean;
};

export const getConsultationTypes = async () => {
  const { supabase, user } = await getSupabaseAndUser();
  const { data } = await supabase
    .from("consultation_types")
    .select("*")
    .eq("consultant_id", user.id)
    .eq("is_active", true)
    .order("created_at");

  return data ?? [];
};

export const createConsultationType = async (
  formData: ConsultationTypeFormData
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: created, error } = await supabase
    .from("consultation_types")
    .insert({
      consultant_id: user.id,
      title: formData.title,
      description: formData.description || null,
      duration_minutes: 60, // default, actual durations stored in consultation_type_durations
      price_cents: 9000, // default, actual prices stored in consultation_type_durations
      available_locations: formData.available_locations,
      is_online: formData.available_locations.includes("teleconsultation"),
      buffer_minutes: formData.buffer_minutes,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !created) return { success: false, error: "Erreur création du type" };

  // Seed default duration options
  const { DEFAULT_DURATION_OPTIONS } = await import("@/lib/booking/pricing");
  const durationRows = DEFAULT_DURATION_OPTIONS.map((d) => ({
    consultation_type_id: created.id,
    duration_minutes: d.duration_minutes,
    price_cents: d.price_cents,
    is_default: "is_default" in d ? d.is_default : false,
    position: d.position,
  }));

  await supabase.from("consultation_type_durations").insert(durationRows);

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

export const updateConsultationType = async (
  id: string,
  formData: ConsultationTypeFormData
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("consultation_types")
    .update({
      title: formData.title,
      description: formData.description || null,
      available_locations: formData.available_locations,
      is_online: formData.available_locations.includes("teleconsultation"),
      buffer_minutes: formData.buffer_minutes,
    })
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) return { success: false, error: "Erreur mise à jour" };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

export const deleteConsultationType = async (
  id: string
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("consultation_types")
    .update({ is_active: false })
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) return { success: false, error: "Erreur suppression" };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

// ---- Duration Options ----

export const getDurationOptions = async (consultationTypeId: string) => {
  const { supabase } = await getSupabaseAndUser();
  const { data } = await supabase
    .from("consultation_type_durations")
    .select("*")
    .eq("consultation_type_id", consultationTypeId)
    .order("position");

  return data ?? [];
};

export const saveDurationOptions = async (
  consultationTypeId: string,
  options: DurationOptionFormData[]
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  // Verify ownership
  const { data: ct } = await supabase
    .from("consultation_types")
    .select("id")
    .eq("id", consultationTypeId)
    .eq("consultant_id", user.id)
    .single();

  if (!ct) return { success: false, error: "Type de consultation introuvable" };

  // Delete existing durations and re-insert
  await supabase
    .from("consultation_type_durations")
    .delete()
    .eq("consultation_type_id", consultationTypeId);

  if (options.length === 0) {
    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  }

  const rows = options.map((opt, i) => ({
    consultation_type_id: consultationTypeId,
    duration_minutes: opt.duration_minutes,
    price_cents: opt.price_cents,
    weekend_price_cents: opt.weekend_price_cents,
    is_default: opt.is_default,
    position: i,
  }));

  const { error } = await supabase
    .from("consultation_type_durations")
    .insert(rows);

  if (error) return { success: false, error: "Erreur sauvegarde des durées" };

  // Sync the parent row with the default duration for backward compatibility
  const defaultOpt = options.find((o) => o.is_default) ?? options[0];
  await supabase
    .from("consultation_types")
    .update({
      duration_minutes: defaultOpt.duration_minutes,
      price_cents: defaultOpt.price_cents,
    })
    .eq("id", consultationTypeId);

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

// ---- Availabilities (08-14) ----

export type AvailabilityFormData = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export const getAvailabilities = async () => {
  const { supabase, user } = await getSupabaseAndUser();
  const { data } = await supabase
    .from("availabilities")
    .select("*")
    .eq("consultant_id", user.id)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  return data ?? [];
};

export const createAvailability = async (
  formData: AvailabilityFormData
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  if (formData.start_time >= formData.end_time) {
    return { success: false, error: "L'heure de fin doit être après l'heure de début" };
  }

  const { error } = await supabase.from("availabilities").insert({
    consultant_id: user.id,
    day_of_week: formData.day_of_week,
    start_time: formData.start_time,
    end_time: formData.end_time,
    is_active: true,
  });

  if (error) return { success: false, error: "Erreur création du créneau" };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

export const deleteAvailability = async (
  id: string
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("availabilities")
    .update({ is_active: false })
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) return { success: false, error: "Erreur suppression" };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

// ---- Availability Exceptions (08-15) ----

export type ExceptionFormData = {
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string;
};

export const getExceptions = async () => {
  const { supabase, user } = await getSupabaseAndUser();
  const { data } = await supabase
    .from("availability_exceptions")
    .select("*")
    .eq("consultant_id", user.id)
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date");

  return data ?? [];
};

export const createException = async (
  formData: ExceptionFormData
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase.from("availability_exceptions").insert({
    consultant_id: user.id,
    date: formData.date,
    is_available: formData.is_available,
    start_time: formData.is_available ? formData.start_time : null,
    end_time: formData.is_available ? formData.end_time : null,
    reason: formData.reason || null,
  });

  if (error) return { success: false, error: "Erreur création de l'exception" };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

export const deleteException = async (
  id: string
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("availability_exceptions")
    .delete()
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) return { success: false, error: "Erreur suppression" };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
};

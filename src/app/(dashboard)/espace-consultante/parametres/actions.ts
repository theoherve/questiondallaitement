"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { ConsultationLocation } from "@/types/database";

const REVALIDATE_PATH = "/espace-consultante/parametres";

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
  duration_minutes: number;
  price_cents: number;
  available_locations: ConsultationLocation[];
  buffer_minutes: number;
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

  const { error } = await supabase.from("consultation_types").insert({
    consultant_id: user.id,
    title: formData.title,
    description: formData.description || null,
    duration_minutes: formData.duration_minutes,
    price_cents: formData.price_cents,
    available_locations: formData.available_locations,
    buffer_minutes: formData.buffer_minutes,
    is_active: true,
  });

  if (error) return { success: false, error: "Erreur création du type" };

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
      duration_minutes: formData.duration_minutes,
      price_cents: formData.price_cents,
      available_locations: formData.available_locations,
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

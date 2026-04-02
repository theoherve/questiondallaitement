"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { ConsultationLocation } from "@/types/database";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/admin");
};

// ---- Consultation Types ----

export type AdminConsultationTypeFormData = {
  title: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  available_locations: ConsultationLocation[];
  buffer_minutes: number;
};

export const adminGetConsultationTypes = async (consultantId: string) => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("consultation_types")
    .select(
      "id, title, description, duration_minutes, price_cents, available_locations, buffer_minutes"
    )
    .eq("consultant_id", consultantId)
    .eq("is_active", true)
    .order("created_at");
  return data ?? [];
};

export const adminGetConsultationTypeTemplates = async (excludeConsultantId: string) => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("consultation_types")
    .select("title, description, duration_minutes, price_cents, available_locations, buffer_minutes")
    .neq("consultant_id", excludeConsultantId)
    .eq("is_active", true)
    .order("title");

  if (!data) return [];

  const seen = new Set<string>();
  return data.filter((t) => {
    if (seen.has(t.title)) return false;
    seen.add(t.title);
    return true;
  });
};

export const adminCreateConsultationType = async (
  consultantId: string,
  formData: AdminConsultationTypeFormData
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("consultation_types").insert({
    consultant_id: consultantId,
    title: formData.title,
    description: formData.description || null,
    duration_minutes: formData.duration_minutes,
    price_cents: formData.price_cents,
    available_locations: formData.available_locations,
    is_online: formData.available_locations.includes("teleconsultation"),
    buffer_minutes: formData.buffer_minutes,
    is_active: true,
  });

  if (error) return { success: false, error: "Erreur création du type" };
  revalidatePath(`/admin/consultantes/${consultantId}`);
  return { success: true };
};

export const adminUpdateConsultationType = async (
  consultantId: string,
  id: string,
  formData: AdminConsultationTypeFormData
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("consultation_types")
    .update({
      title: formData.title,
      description: formData.description || null,
      duration_minutes: formData.duration_minutes,
      price_cents: formData.price_cents,
      available_locations: formData.available_locations,
      is_online: formData.available_locations.includes("teleconsultation"),
      buffer_minutes: formData.buffer_minutes,
    })
    .eq("id", id)
    .eq("consultant_id", consultantId);

  if (error) return { success: false, error: "Erreur mise à jour" };
  revalidatePath(`/admin/consultantes/${consultantId}`);
  return { success: true };
};

export const adminDeleteConsultationType = async (
  consultantId: string,
  id: string
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("consultation_types")
    .update({ is_active: false })
    .eq("id", id)
    .eq("consultant_id", consultantId);

  if (error) return { success: false, error: "Erreur suppression" };
  revalidatePath(`/admin/consultantes/${consultantId}`);
  return { success: true };
};

// ---- Availabilities ----

export type AdminAvailabilityFormData = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export const adminGetAvailabilities = async (consultantId: string) => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("availabilities")
    .select("id, day_of_week, start_time, end_time")
    .eq("consultant_id", consultantId)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");
  return data ?? [];
};

export const adminCreateAvailability = async (
  consultantId: string,
  formData: AdminAvailabilityFormData
): Promise<ActionResult> => {
  await requireAdmin();
  if (formData.start_time >= formData.end_time) {
    return { success: false, error: "L'heure de fin doit être après l'heure de début" };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("availabilities").insert({
    consultant_id: consultantId,
    day_of_week: formData.day_of_week,
    start_time: formData.start_time,
    end_time: formData.end_time,
    is_active: true,
  });
  if (error) return { success: false, error: "Erreur création du créneau" };
  revalidatePath(`/admin/consultantes/${consultantId}`);
  return { success: true };
};

export const adminDeleteAvailability = async (
  consultantId: string,
  id: string
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("availabilities")
    .update({ is_active: false })
    .eq("id", id)
    .eq("consultant_id", consultantId);
  if (error) return { success: false, error: "Erreur suppression" };
  revalidatePath(`/admin/consultantes/${consultantId}`);
  return { success: true };
};

export const adminUploadAvatar = async (
  consultantId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> => {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "Fichier requis" };
  if (file.size > 5 * 1024 * 1024)
    return { success: false, error: "Le fichier dépasse 5 Mo" };

  try {
    const { uploadFile } = await import("@/lib/storage/helpers");
    const result = await uploadFile("avatars", consultantId, file);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: result.url })
      .eq("id", consultantId);
    if (error) return { success: false, error: "Erreur mise à jour de l'avatar" };
    revalidatePath(`/admin/consultantes/${consultantId}`);
    return { success: true, data: { url: result.url } };
  } catch {
    return { success: false, error: "Erreur lors de l'upload" };
  }
};

export const adminCopyAvailabilities = async (
  consultantId: string,
  fromDay: number,
  toDays: number[],
  slots: { start_time: string; end_time: string }[]
): Promise<ActionResult> => {
  await requireAdmin();
  if (toDays.length === 0 || slots.length === 0)
    return { success: false, error: "Aucun jour ou créneau à copier" };
  const supabase = createAdminClient();
  const rows = toDays.flatMap((day) =>
    slots.map((slot) => ({
      consultant_id: consultantId,
      day_of_week: day,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_active: true,
    }))
  );
  const { error } = await supabase.from("availabilities").insert(rows);
  if (error) return { success: false, error: "Erreur lors de la copie" };
  revalidatePath(`/admin/consultantes/${consultantId}`);
  return { success: true };
};

// ---- Locations ----

export type AdminLocationFormData = {
  location_type: ConsultationLocation;
  label: string;
  address: string;
  city: string;
  postal_code: string;
  radius_km: number | null;
  surcharge_cents: number;
  is_active: boolean;
};

export const adminGetLocations = async (consultantId: string) => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("consultant_locations")
    .select("*")
    .eq("consultant_id", consultantId)
    .order("created_at");
  return data ?? [];
};

export const adminUpsertLocation = async (
  consultantId: string,
  formData: AdminLocationFormData
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("consultant_locations")
    .select("id")
    .eq("consultant_id", consultantId)
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
      consultant_id: consultantId,
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

  revalidatePath(`/admin/consultantes/${consultantId}`);
  return { success: true };
};

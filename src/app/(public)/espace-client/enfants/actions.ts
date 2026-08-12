"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { childSchema, weightMeasurementSchema } from "@/validations/children";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { Child, WeightMeasurement } from "@/types/database";

export const listMyChildren = async (): Promise<Child[]> => {
  const { user } = await getSupabaseAndUser();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("children")
    .select("*")
    .eq("client_id", user.id)
    .order("birth_date", { ascending: false });
  return data ?? [];
};

export const createChild = async (
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const { user } = await getSupabaseAndUser();
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("gdpr_consent_at")
    .eq("id", user.id)
    .single();

  if (!profile?.gdpr_consent_at) {
    return {
      success: false,
      error:
        "Le consentement RGPD doit être accepté avant d'ajouter un enfant.",
    };
  }

  const parsed = childSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { data: child, error } = await supabase
    .from("children")
    .insert({
      client_id: user.id,
      first_name: parsed.data.first_name,
      birth_date: parsed.data.birth_date,
      sex: parsed.data.sex,
      is_premature: parsed.data.is_premature,
      gestational_age_weeks: parsed.data.gestational_age_weeks ?? null,
    })
    .select("id")
    .single();

  if (error || !child) {
    return { success: false, error: "Erreur lors de la création de l'enfant" };
  }

  revalidatePath("/espace-client/enfants");
  return { success: true, data: child };
};

export const deleteChild = async (childId: string): Promise<ActionResult> => {
  const { user } = await getSupabaseAndUser();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("children")
    .delete()
    .eq("id", childId)
    .eq("client_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Enfant introuvable" };
  }

  revalidatePath("/espace-client/enfants");
  return { success: true };
};

export const listWeightMeasurements = async (
  childId: string,
): Promise<WeightMeasurement[]> => {
  const { user } = await getSupabaseAndUser();
  const supabase = createAdminClient();

  const { data: child } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("client_id", user.id)
    .single();
  if (!child) return [];

  const { data } = await supabase
    .from("weight_measurements")
    .select("*")
    .eq("child_id", childId)
    .order("measured_at", { ascending: true });
  return data ?? [];
};

export const addWeightMeasurement = async (
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const { user } = await getSupabaseAndUser();

  const parsed = weightMeasurementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: child } = await supabase
    .from("children")
    .select("id, birth_date")
    .eq("id", parsed.data.child_id)
    .eq("client_id", user.id)
    .single();
  if (!child) {
    return { success: false, error: "Enfant introuvable" };
  }

  // Une pesée antérieure à la naissance est forcément une erreur de saisie.
  if (child.birth_date && parsed.data.measured_at < child.birth_date) {
    return {
      success: false,
      error: "La date de la pesée ne peut pas précéder la date de naissance.",
    };
  }

  const { data: measurement, error } = await supabase
    .from("weight_measurements")
    .insert({
      child_id: parsed.data.child_id,
      weight_grams: parsed.data.weight_grams,
      measured_at: parsed.data.measured_at,
      source: "home",
      recorded_by: user.id,
    })
    .select("id")
    .single();

  if (error || !measurement) {
    return { success: false, error: "Erreur lors de l'ajout de la pesée" };
  }

  revalidatePath(`/espace-client/enfants/${parsed.data.child_id}`);
  return { success: true, data: measurement };
};

export const deleteWeightMeasurement = async (
  measurementId: string,
): Promise<ActionResult> => {
  const { user } = await getSupabaseAndUser();
  const supabase = createAdminClient();

  const { data: measurement } = await supabase
    .from("weight_measurements")
    .select("id, child_id, recorded_by, created_at")
    .eq("id", measurementId)
    .single();

  if (!measurement) {
    return { success: false, error: "Pesée introuvable" };
  }
  if (measurement.recorded_by !== user.id) {
    return {
      success: false,
      error:
        "Cette pesée a été saisie par votre consultante, vous ne pouvez pas la supprimer.",
    };
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const isPastEditWindow =
    Date.now() - new Date(measurement.created_at).getTime() > ONE_DAY_MS;
  if (isPastEditWindow) {
    return {
      success: false,
      error: "Cette pesée ne peut plus être supprimée après 24h.",
    };
  }

  const { error } = await supabase
    .from("weight_measurements")
    .delete()
    .eq("id", measurementId);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/espace-client/enfants/${measurement.child_id}`);
  return { success: true };
};

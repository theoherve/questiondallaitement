"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { revalidatePath } from "next/cache";
import { automationSchema } from "@/validations/automations";
import type { ActionResult } from "@/types";

export const getAutomationFormOptions = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const [formationsRes, consultationTypesRes, eventsRes, tagsRes] =
    await Promise.all([
      supabase
        .from("formations")
        .select("id, title")
        .eq("consultant_id", user.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("title"),
      supabase
        .from("consultation_types")
        .select("id, title")
        .eq("consultant_id", user.id)
        .eq("is_active", true)
        .order("title"),
      supabase
        .from("events")
        .select("id, title")
        .eq("consultant_id", user.id)
        .eq("is_published", true)
        .order("starts_at", { ascending: false })
        .limit(20),
      supabase
        .from("crm_tags")
        .select("id, name")
        .or(`consultant_id.eq.${user.id},consultant_id.is.null`)
        .order("name"),
    ]);

  return {
    formations: formationsRes.data ?? [],
    consultationTypes: consultationTypesRes.data ?? [],
    events: eventsRes.data ?? [],
    tags: tagsRes.data ?? [],
  };
};

export const getAutomations = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data } = await supabase
    .from("automations")
    .select("*")
    .eq("consultant_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
};

export const getAutomation = async (id: string) => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data } = await supabase
    .from("automations")
    .select("*")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  return data;
};

export const createAutomation = async (
  formData: FormData
): Promise<ActionResult<{ id: string }>> => {
  const { supabase, user } = await getSupabaseAndUser();

  const raw = {
    name: formData.get("name"),
    trigger_type: formData.get("trigger_type"),
    trigger_config: parseJson(formData.get("trigger_config")),
    actions: parseJson(formData.get("actions")),
    is_active: formData.get("is_active") === "on",
  };

  const parsed = automationSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  const { data, error } = await supabase
    .from("automations")
    .insert({
      consultant_id: user.id,
      name: parsed.data.name,
      trigger_type: parsed.data.trigger_type,
      trigger_config: parsed.data.trigger_config,
      actions: parsed.data.actions,
      is_active: parsed.data.is_active,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/espace-consultante/automations");
  return { success: true, data: { id: data.id } };
};

export const updateAutomation = async (
  id: string,
  formData: FormData
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const raw = {
    name: formData.get("name"),
    trigger_type: formData.get("trigger_type"),
    trigger_config: parseJson(formData.get("trigger_config")),
    actions: parseJson(formData.get("actions")),
    is_active: formData.get("is_active") === "on",
  };

  const parsed = automationSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  const { error } = await supabase
    .from("automations")
    .update({
      name: parsed.data.name,
      trigger_type: parsed.data.trigger_type,
      trigger_config: parsed.data.trigger_config,
      actions: parsed.data.actions,
      is_active: parsed.data.is_active,
    })
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/espace-consultante/automations");
  revalidatePath(`/espace-consultante/automations/${id}`);
  return { success: true };
};

export const toggleAutomationActive = async (
  id: string,
  isActive: boolean
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("automations")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/espace-consultante/automations");
  return { success: true };
};

export const deleteAutomation = async (id: string): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("automations")
    .delete()
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/espace-consultante/automations");
  return { success: true };
};

export const getAutomationLogs = async (automationId?: string) => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: automationIds } = await supabase
    .from("automations")
    .select("id")
    .eq("consultant_id", user.id);

  const ids = (automationIds ?? []).map((a) => a.id);
  if (ids.length === 0) return [];

  let query = supabase
    .from("automation_logs")
    .select("id, automation_id, trigger_data, result, status, executed_at")
    .in("automation_id", ids)
    .order("executed_at", { ascending: false })
    .limit(50);

  if (automationId) {
    query = query.eq("automation_id", automationId);
  }

  const { data } = await query;
  return data ?? [];
};

function parseJson(value: FormDataEntryValue | null): unknown {
  if (value == null || typeof value !== "string") return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

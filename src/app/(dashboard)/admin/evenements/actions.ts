"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventSchema } from "@/validations/events";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");
  return user;
};

// ─── Create Event ───────────────────────────────────────────

export const createEvent = async (
  data: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> => {
  await requireAdmin();
  const parsed = eventSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      starts_at: new Date(parsed.data.starts_at).toISOString(),
      ends_at: new Date(parsed.data.ends_at).toISOString(),
      location: parsed.data.location ?? null,
      max_participants: parsed.data.max_participants ?? null,
      price_cents: parsed.data.price_cents,
      currency: parsed.data.currency,
      consultant_id: parsed.data.consultant_id,
      is_published: parsed.data.is_published,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    console.error("Create event error:", error);
    return { success: false, error: "Erreur lors de la création" };
  }

  revalidatePath("/admin/evenements");
  revalidatePath("/evenements");
  return { success: true, data: event };
};

// ─── Update Event ───────────────────────────────────────────

export const updateEvent = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = eventSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();

  const { data: currentEvent } = await supabase
    .from("events")
    .select("slug")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("events")
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      starts_at: new Date(parsed.data.starts_at).toISOString(),
      ends_at: new Date(parsed.data.ends_at).toISOString(),
      location: parsed.data.location ?? null,
      max_participants: parsed.data.max_participants ?? null,
      price_cents: parsed.data.price_cents,
      currency: parsed.data.currency,
      consultant_id: parsed.data.consultant_id,
      is_published: parsed.data.is_published,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/admin/evenements");
  revalidatePath(`/admin/evenements/${id}/edit`);
  revalidatePath(`/evenements/${parsed.data.slug}`);
  if (currentEvent?.slug && currentEvent.slug !== parsed.data.slug) {
    revalidatePath(`/evenements/${currentEvent.slug}`);
  }
  revalidatePath("/evenements");
  return { success: true };
};

// ─── Toggle Publish ─────────────────────────────────────────

export const toggleEventPublish = async (
  id: string,
  isPublished: boolean,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("events")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors du changement de statut" };
  }

  revalidatePath("/admin/evenements");
  revalidatePath(`/admin/evenements/${id}/edit`);
  revalidatePath("/evenements");
  return { success: true };
};

// ─── Delete Event ───────────────────────────────────────────

export const deleteEvent = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  // Check if there are registrations
  const { count } = await supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id);

  if (count && count > 0) {
    return {
      success: false,
      error: `Impossible de supprimer : ${count} inscription(s) existante(s)`,
    };
  }

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/admin/evenements");
  revalidatePath("/evenements");
  return { success: true };
};

// ─── Get Event Registrations Count ──────────────────────────

export const getEventRegistrationsCount = async (
  eventId: string,
): Promise<number> => {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "registered");

  return count ?? 0;
};

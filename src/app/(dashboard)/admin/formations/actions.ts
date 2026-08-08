"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formationSchema } from "@/validations/formations";
import { normalizeRichText } from "@/lib/html/rich-text";
import { filterFormationHighlightKeys } from "@/config/formation-highlights";
import { slugifyProviderName } from "@/lib/formations/providers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

// ─── Create Training Provider ───────────────────────────────────

/**
 * Cree un organisme de formation a la volee depuis le formulaire.
 *
 * Le catalogue d'organismes n'a pas d'ecran d'administration : sans cela, une
 * formation portee par un nouveau partenaire attendrait une migration. La
 * creation est idempotente sur le slug — resaisir un nom deja connu renvoie
 * l'organisme existant plutot qu'une erreur, puisque l'intention est la meme.
 */
export const createTrainingProvider = async (
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> => {
  await requireAdmin();

  const trimmed = name.trim();
  const slug = slugifyProviderName(trimmed);
  if (trimmed.length < 2 || !slug) {
    return { success: false, error: "Le nom de l'organisme est requis" };
  }

  const supabase = createAdminClient();
  const { data: provider, error } = await supabase
    .from("training_providers")
    .insert({ name: trimmed, slug })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("training_providers")
        .select("id, name")
        .eq("slug", slug)
        .single();
      if (existing) return { success: true, data: existing };
    }
    console.error("Create training provider error:", error);
    return { success: false, error: "Erreur lors de la création de l'organisme" };
  }

  revalidatePath("/admin/formations");
  return { success: true, data: provider };
};

// ─── Create Formation ───────────────────────────────────────────

export const createFormation = async (
  data: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> => {
  await requireAdmin();
  const parsed = formationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: formation, error } = await supabase
    .from("formations")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      summary_html: normalizeRichText(parsed.data.summary_html),
      objectives_html: normalizeRichText(parsed.data.objectives_html),
      program_html: normalizeRichText(parsed.data.program_html),
      audience_html: normalizeRichText(parsed.data.audience_html),
      highlights: filterFormationHighlightKeys(parsed.data.highlights),
      thumbnail_url: parsed.data.thumbnail_url ?? null,
      type: parsed.data.type,
      starts_at: new Date(parsed.data.starts_at).toISOString(),
      ends_at: new Date(parsed.data.ends_at).toISOString(),
      show_time: parsed.data.show_time,
      location: parsed.data.location ?? null,
      max_participants: parsed.data.max_participants ?? null,
      price_cents: parsed.data.price_cents,
      discounted_price_cents: parsed.data.discounted_price_cents ?? null,
      currency: parsed.data.currency,
      show_price: parsed.data.show_price,
      provider_id: parsed.data.provider_id ?? null,
      external_url: parsed.data.external_url ?? null,
      consultant_id: parsed.data.consultant_id,
      is_published: parsed.data.is_published,
      category: parsed.data.category,
      badge: parsed.data.badge || null,
      is_evergreen: parsed.data.is_evergreen,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    console.error("Create formation error:", error);
    return { success: false, error: "Erreur lors de la création" };
  }

  revalidatePath("/admin/formations");
  revalidatePath("/formations");
  return { success: true, data: formation };
};

// ─── Update Formation ───────────────────────────────────────────

export const updateFormation = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = formationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();

  const { data: currentFormation } = await supabase
    .from("formations")
    .select("slug")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("formations")
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      summary_html: normalizeRichText(parsed.data.summary_html),
      objectives_html: normalizeRichText(parsed.data.objectives_html),
      program_html: normalizeRichText(parsed.data.program_html),
      audience_html: normalizeRichText(parsed.data.audience_html),
      highlights: filterFormationHighlightKeys(parsed.data.highlights),
      thumbnail_url: parsed.data.thumbnail_url ?? null,
      type: parsed.data.type,
      starts_at: new Date(parsed.data.starts_at).toISOString(),
      ends_at: new Date(parsed.data.ends_at).toISOString(),
      show_time: parsed.data.show_time,
      location: parsed.data.location ?? null,
      max_participants: parsed.data.max_participants ?? null,
      price_cents: parsed.data.price_cents,
      discounted_price_cents: parsed.data.discounted_price_cents ?? null,
      currency: parsed.data.currency,
      show_price: parsed.data.show_price,
      provider_id: parsed.data.provider_id ?? null,
      external_url: parsed.data.external_url ?? null,
      consultant_id: parsed.data.consultant_id,
      is_published: parsed.data.is_published,
      category: parsed.data.category,
      badge: parsed.data.badge || null,
      is_evergreen: parsed.data.is_evergreen,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/admin/formations");
  revalidatePath(`/admin/formations/${id}/edit`);
  revalidatePath(`/formations/${parsed.data.slug}`);
  if (currentFormation?.slug && currentFormation.slug !== parsed.data.slug) {
    revalidatePath(`/formations/${currentFormation.slug}`);
  }
  revalidatePath("/formations");
  return { success: true };
};

// ─── Toggle Publish ─────────────────────────────────────────

export const toggleFormationPublish = async (
  id: string,
  isPublished: boolean,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("formations")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors du changement de statut" };
  }

  revalidatePath("/admin/formations");
  revalidatePath(`/admin/formations/${id}/edit`);
  revalidatePath("/formations");
  return { success: true };
};

// ─── Delete Formation ───────────────────────────────────────────

export const deleteFormation = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  // Check if there are registrations
  const { count } = await supabase
    .from("formation_registrations")
    .select("*", { count: "exact", head: true })
    .eq("formation_id", id);

  if (count && count > 0) {
    return {
      success: false,
      error: `Impossible de supprimer : ${count} inscription(s) existante(s)`,
    };
  }

  const { error } = await supabase.from("formations").delete().eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/admin/formations");
  revalidatePath("/formations");
  return { success: true };
};

// ─── Get Formation Registrations Count ──────────────────────────

export const getFormationRegistrationsCount = async (
  formationId: string,
): Promise<number> => {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("formation_registrations")
    .select("*", { count: "exact", head: true })
    .eq("formation_id", formationId)
    .eq("status", "registered");

  return count ?? 0;
};

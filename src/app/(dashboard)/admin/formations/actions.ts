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
      audience_group: parsed.data.audience_group,
      badge: parsed.data.badge || null,
      partner_promo_codes: parsed.data.partner_promo_codes,
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
      audience_group: parsed.data.audience_group,
      badge: parsed.data.badge || null,
      partner_promo_codes: parsed.data.partner_promo_codes,
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

// ─── Duplicate Formation ─────────────────────────────────────────

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Slug libre : ajoute -2, -3… tant qu'une formation porte deja le meme. */
const findAvailableSlug = async (base: string): Promise<string> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("formations")
    .select("slug")
    .like("slug", `${base}%`);

  const taken = new Set((data ?? []).map((row) => row.slug));
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

/**
 * Duplique une formation : contenu, programme, tarifs et classement sont
 * recopies.
 *
 * La copie part en brouillon : les dates de l'original sont recopiees telles
 * quelles, mais elles ne conviennent presque jamais a une nouvelle session —
 * la laisser publiee par erreur enverrait la mauvaise date en ligne.
 */
export const duplicateFormation = async (
  id: string,
  newTitle?: string,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: source, error: sourceError } = await supabase
    .from("formations")
    .select(
      `title, description, summary_html, objectives_html, program_html,
       audience_html, highlights, thumbnail_url, type, starts_at, ends_at,
       show_time, location, max_participants, price_cents,
       discounted_price_cents, currency, show_price, provider_id,
       external_url, consultant_id, category, audience_group, badge,
       partner_promo_codes, is_evergreen`,
    )
    .eq("id", id)
    .single();

  if (sourceError || !source) {
    return { success: false, error: "Formation introuvable" };
  }

  const title = newTitle?.trim() || `${source.title} (copie)`;
  const slug = await findAvailableSlug(slugify(title));

  const { data: copy, error: insertError } = await supabase
    .from("formations")
    .insert({
      ...source,
      title,
      slug,
      is_published: false,
    })
    .select("id")
    .single();

  if (insertError || !copy) {
    return { success: false, error: "Erreur lors de la duplication" };
  }

  revalidatePath("/admin/formations");
  return { success: true, data: copy };
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

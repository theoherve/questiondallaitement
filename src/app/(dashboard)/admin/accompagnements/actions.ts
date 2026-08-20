"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { accompagnementSchema, sectionSchema } from "@/validations/accompagnements";
import { accompagnementCollaboratorSchema } from "@/validations/crm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

// ─── Accompagnements ─────────────────────────────────────────────

export const createAccompagnement = async (
  data: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> => {
  await requireAdmin();
  const parsed = accompagnementSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: accompagnement, error } = await supabase
    .from("accompagnements")
    .insert({
      ...parsed.data,
      thumbnail_url: parsed.data.thumbnail_url || null,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    return { success: false, error: "Erreur lors de la création" };
  }

  revalidatePath("/admin/accompagnements");
  return { success: true, data: accompagnement };
};

export const updateAccompagnement = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = accompagnementSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const updateData: Record<string, unknown> = {
    ...parsed.data,
    thumbnail_url: parsed.data.thumbnail_url || null,
  };

  if (parsed.data.status === "published") {
    updateData.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("accompagnements")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/admin/accompagnements");
  revalidatePath(`/admin/accompagnements/${id}/edit`);
  revalidatePath(`/accompagnements/${parsed.data.slug}`);
  return { success: true };
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Slug libre : ajoute -2, -3… tant qu'un accompagnement porte déjà le même. */
const findAvailableSlug = async (base: string): Promise<string> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("accompagnements")
    .select("slug")
    .like("slug", `${base}%`);

  const taken = new Set((data ?? []).map((row) => row.slug));
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

/**
 * Duplique un accompagnement avec toutes ses sections et tous ses blocs.
 *
 * La copie part en brouillon et son prix est remis à zéro : dupliquer sert à
 * bâtir une variante (un pack premium, par exemple), et laisser filer en ligne
 * un doublon au prix de l'original serait le pire accident possible ici.
 * Les collaboratrices ne sont pas reprises — les parts de revenus se
 * redéfinissent à chaque offre.
 */
export const duplicateAccompagnement = async (
  id: string,
  newTitle?: string,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: source, error: sourceError } = await supabase
    .from("accompagnements")
    .select(
      "title, description, short_description, long_description_html, thumbnail_url, consultant_id",
    )
    .eq("id", id)
    .single();

  if (sourceError || !source) {
    return { success: false, error: "Accompagnement introuvable" };
  }

  const title = newTitle?.trim() || `${source.title} (copie)`;
  const slug = await findAvailableSlug(slugify(title));

  const { data: copy, error: insertError } = await supabase
    .from("accompagnements")
    .insert({
      title,
      slug,
      description: source.description,
      short_description: source.short_description,
      long_description_html: source.long_description_html,
      thumbnail_url: source.thumbnail_url,
      consultant_id: source.consultant_id,
      price_cents: 0,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !copy) {
    return { success: false, error: "Erreur lors de la duplication" };
  }

  const { data: sections } = await supabase
    .from("accompagnement_sections")
    .select("id, title, position, accompagnement_blocks(type, content, position)")
    .eq("accompagnement_id", id)
    .order("position", { ascending: true });

  for (const section of sections ?? []) {
    const { data: newSection, error: sectionError } = await supabase
      .from("accompagnement_sections")
      .insert({
        accompagnement_id: copy.id,
        title: section.title,
        position: section.position,
      })
      .select("id")
      .single();

    if (sectionError || !newSection) continue;

    const blocks = (section.accompagnement_blocks ?? []) as {
      type: string;
      content: Record<string, unknown>;
      position: number;
    }[];

    if (blocks.length === 0) continue;

    await supabase.from("accompagnement_blocks").insert(
      blocks.map((block) => ({
        section_id: newSection.id,
        type: block.type,
        content: block.content,
        position: block.position,
      })),
    );
  }

  revalidatePath("/admin/accompagnements");
  return { success: true, data: { id: copy.id } };
};

export const deleteAccompagnement = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("accompagnements")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/admin/accompagnements");
  return { success: true };
};

export const updateAccompagnementStatus = async (
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "published") {
    updateData.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("accompagnements")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors du changement de statut" };
  }

  revalidatePath("/admin/accompagnements");
  revalidatePath(`/admin/accompagnements/${id}/edit`);
  return { success: true };
};

// ─── Sections ───────────────────────────────────────────────

export const createSection = async (
  accompagnementId: string,
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = sectionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: section, error } = await supabase
    .from("accompagnement_sections")
    .insert({
      accompagnement_id: accompagnementId,
      ...parsed.data,
      content_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: "Erreur lors de la création de la section",
    };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true, data: section };
};

export const updateSection = async (
  id: string,
  accompagnementId: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = sectionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("accompagnement_sections")
    .update({ ...parsed.data, content_updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true };
};

export const deleteSection = async (
  id: string,
  accompagnementId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("accompagnement_sections")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true };
};

export const reorderSections = async (
  accompagnementId: string,
  orderedIds: string[],
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("accompagnement_sections")
      .update({ position: index })
      .eq("id", id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { success: false, error: "Erreur lors du réordonnancement" };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true };
};

// ─── Blocks ─────────────────────────────────────────────────

export const createBlock = async (
  sectionId: string,
  accompagnementId: string,
  type: string,
  content: unknown,
  position: number,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: block, error } = await supabase
    .from("accompagnement_blocks")
    .insert({
      section_id: sectionId,
      type,
      content: content as Record<string, unknown>,
      position,
      content_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création du bloc" };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true, data: block };
};

export const updateBlock = async (
  id: string,
  accompagnementId: string,
  content: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("accompagnement_blocks")
    .update({
      content: content as Record<string, unknown>,
      content_updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true };
};

export const deleteBlock = async (
  id: string,
  accompagnementId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("accompagnement_blocks")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true };
};

/**
 * Deplace un bloc vers une autre section du meme accompagnement, en fin de
 * liste. Aucune contrainte DB ne garantit que les deux sections appartiennent
 * au meme accompagnement (`section_id` reference juste `accompagnement_sections`),
 * donc c'est verifie ici avant l'update.
 */
export const moveBlockToSection = async (
  blockId: string,
  targetSectionId: string,
  accompagnementId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: targetSection, error: targetError } = await supabase
    .from("accompagnement_sections")
    .select("accompagnement_id")
    .eq("id", targetSectionId)
    .single();

  if (targetError || !targetSection || targetSection.accompagnement_id !== accompagnementId) {
    return { success: false, error: "Section de destination introuvable" };
  }

  const { count } = await supabase
    .from("accompagnement_blocks")
    .select("id", { count: "exact", head: true })
    .eq("section_id", targetSectionId);

  const { error } = await supabase
    .from("accompagnement_blocks")
    .update({ section_id: targetSectionId, position: count ?? 0 })
    .eq("id", blockId);

  if (error) {
    return { success: false, error: "Erreur lors du déplacement" };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true };
};

export const reorderBlocks = async (
  sectionId: string,
  accompagnementId: string,
  orderedIds: string[],
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const updates = orderedIds.map((id, index) =>
    supabase.from("accompagnement_blocks").update({ position: index }).eq("id", id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { success: false, error: "Erreur lors du réordonnancement" };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true };
};

// ─── Collaborators ──────────────────────────────────────────

export type AccompagnementCollaboratorRow = {
  consultant_id: string;
  revenue_share: number;
  consultant: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
};

export const getAccompagnementCollaborators = async (
  accompagnementId: string,
): Promise<AccompagnementCollaboratorRow[]> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("accompagnement_collaborators")
    .select(
      "consultant_id, revenue_share, profiles!accompagnement_collaborators_consultant_id_fkey(first_name, last_name, email)",
    )
    .eq("accompagnement_id", accompagnementId);

  return (data ?? []).map((row) => ({
    consultant_id: row.consultant_id,
    revenue_share: Number(row.revenue_share),
    consultant:
      row.profiles as unknown as AccompagnementCollaboratorRow["consultant"],
  }));
};

export const addCollaborator = async (
  accompagnementId: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = accompagnementCollaboratorSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();

  // Verify the consultant exists and has consultant role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, roles")
    .eq("id", parsed.data.consultant_id)
    .single();

  if (!profile || !(profile.roles as string[]).includes("consultant")) {
    return { success: false, error: "Ce profil n'est pas une consultante" };
  }

  const { error } = await supabase.from("accompagnement_collaborators").insert({
    accompagnement_id: accompagnementId,
    consultant_id: parsed.data.consultant_id,
    revenue_share: parsed.data.revenue_share,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Cette consultante est déjà collaboratrice",
      };
    }
    return {
      success: false,
      error: "Erreur lors de l'ajout de la collaboratrice",
    };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true };
};

export const updateCollaboratorShare = async (
  accompagnementId: string,
  consultantId: string,
  revenueShare: number,
): Promise<ActionResult> => {
  await requireAdmin();

  if (revenueShare < 0 || revenueShare > 100) {
    return { success: false, error: "Le pourcentage doit être entre 0 et 100" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("accompagnement_collaborators")
    .update({ revenue_share: revenueShare })
    .eq("accompagnement_id", accompagnementId)
    .eq("consultant_id", consultantId);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true };
};

export const removeCollaborator = async (
  accompagnementId: string,
  consultantId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("accompagnement_collaborators")
    .delete()
    .eq("accompagnement_id", accompagnementId)
    .eq("consultant_id", consultantId);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/admin/accompagnements/${accompagnementId}/edit`);
  return { success: true };
};

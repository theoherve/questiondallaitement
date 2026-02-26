"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formationSchema, sectionSchema } from "@/validations/formations";
import { formationCollaboratorSchema } from "@/validations/crm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");
  return user;
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ─── Formations ─────────────────────────────────────────────

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

  revalidatePath("/admin/formations");
  return { success: true, data: formation };
};

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
  const updateData: Record<string, unknown> = {
    ...parsed.data,
    thumbnail_url: parsed.data.thumbnail_url || null,
  };

  if (parsed.data.status === "published") {
    updateData.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("formations")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/admin/formations");
  revalidatePath(`/admin/formations/${id}/edit`);
  revalidatePath(`/formations/${parsed.data.slug}`);
  return { success: true };
};

export const deleteFormation = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("formations")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/admin/formations");
  return { success: true };
};

export const updateFormationStatus = async (
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
    .from("formations")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors du changement de statut" };
  }

  revalidatePath("/admin/formations");
  revalidatePath(`/admin/formations/${id}/edit`);
  return { success: true };
};

// ─── Sections ───────────────────────────────────────────────

export const createSection = async (
  formationId: string,
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = sectionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: section, error } = await supabase
    .from("formation_sections")
    .insert({ formation_id: formationId, ...parsed.data })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: "Erreur lors de la création de la section",
    };
  }

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true, data: section };
};

export const updateSection = async (
  id: string,
  formationId: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = sectionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("formation_sections")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true };
};

export const deleteSection = async (
  id: string,
  formationId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("formation_sections")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true };
};

export const reorderSections = async (
  formationId: string,
  orderedIds: string[],
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("formation_sections")
      .update({ position: index })
      .eq("id", id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { success: false, error: "Erreur lors du réordonnancement" };
  }

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true };
};

// ─── Blocks ─────────────────────────────────────────────────

export const createBlock = async (
  sectionId: string,
  formationId: string,
  type: string,
  content: unknown,
  position: number,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: block, error } = await supabase
    .from("formation_blocks")
    .insert({
      section_id: sectionId,
      type,
      content: content as Record<string, unknown>,
      position,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création du bloc" };
  }

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true, data: block };
};

export const updateBlock = async (
  id: string,
  formationId: string,
  content: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("formation_blocks")
    .update({ content: content as Record<string, unknown> })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true };
};

export const deleteBlock = async (
  id: string,
  formationId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("formation_blocks")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true };
};

export const reorderBlocks = async (
  sectionId: string,
  formationId: string,
  orderedIds: string[],
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const updates = orderedIds.map((id, index) =>
    supabase.from("formation_blocks").update({ position: index }).eq("id", id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { success: false, error: "Erreur lors du réordonnancement" };
  }

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true };
};

// ─── Collaborators ──────────────────────────────────────────

export type FormationCollaboratorRow = {
  consultant_id: string;
  revenue_share: number;
  consultant: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
};

export const getFormationCollaborators = async (
  formationId: string,
): Promise<FormationCollaboratorRow[]> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("formation_collaborators")
    .select(
      "consultant_id, revenue_share, profiles!formation_collaborators_consultant_id_fkey(first_name, last_name, email)",
    )
    .eq("formation_id", formationId);

  return (data ?? []).map((row) => ({
    consultant_id: row.consultant_id,
    revenue_share: Number(row.revenue_share),
    consultant:
      row.profiles as unknown as FormationCollaboratorRow["consultant"],
  }));
};

export const addCollaborator = async (
  formationId: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = formationCollaboratorSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();

  // Verify the consultant exists and has consultant role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", parsed.data.consultant_id)
    .single();

  if (!profile || profile.role !== "consultant") {
    return { success: false, error: "Ce profil n'est pas une consultante" };
  }

  const { error } = await supabase.from("formation_collaborators").insert({
    formation_id: formationId,
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

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true };
};

export const updateCollaboratorShare = async (
  formationId: string,
  consultantId: string,
  revenueShare: number,
): Promise<ActionResult> => {
  await requireAdmin();

  if (revenueShare < 0 || revenueShare > 100) {
    return { success: false, error: "Le pourcentage doit être entre 0 et 100" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("formation_collaborators")
    .update({ revenue_share: revenueShare })
    .eq("formation_id", formationId)
    .eq("consultant_id", consultantId);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true };
};

export const removeCollaborator = async (
  formationId: string,
  consultantId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("formation_collaborators")
    .delete()
    .eq("formation_id", formationId)
    .eq("consultant_id", consultantId);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/admin/formations/${formationId}/edit`);
  return { success: true };
};

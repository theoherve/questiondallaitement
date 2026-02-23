"use server";

import { createClient } from "@/lib/supabase/server";
import { formationSchema, sectionSchema } from "@/validations/formations";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export const createFormation = async (
  data: unknown
): Promise<ActionResult<{ id: string; slug: string }>> => {
  const parsed = formationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non autorisé" };
  }

  const { data: formation, error } = await supabase
    .from("formations")
    .insert({
      consultant_id: user.id,
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

  revalidatePath("/espace-consultante/formations");
  return { success: true, data: formation };
};

export const updateFormation = async (
  id: string,
  data: unknown
): Promise<ActionResult> => {
  const parsed = formationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("formations")
    .update({
      ...parsed.data,
      thumbnail_url: parsed.data.thumbnail_url || null,
      published_at:
        parsed.data.status === "published" ? new Date().toISOString() : undefined,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/espace-consultante/formations");
  revalidatePath(`/formations/${parsed.data.slug}`);
  return { success: true };
};

export const deleteFormation = async (id: string): Promise<ActionResult> => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("formations")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/espace-consultante/formations");
  return { success: true };
};

export const createSection = async (
  formationId: string,
  data: unknown
): Promise<ActionResult<{ id: string }>> => {
  const parsed = sectionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data: section, error } = await supabase
    .from("formation_sections")
    .insert({
      formation_id: formationId,
      ...parsed.data,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création de la section" };
  }

  revalidatePath(`/espace-consultante/formations/${formationId}/edit`);
  return { success: true, data: section };
};

export const updateSection = async (
  id: string,
  data: unknown
): Promise<ActionResult> => {
  const parsed = sectionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("formation_sections")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  return { success: true };
};

export const deleteSection = async (id: string): Promise<ActionResult> => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("formation_sections")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  return { success: true };
};

export const createBlock = async (
  sectionId: string,
  type: string,
  content: unknown,
  position: number
): Promise<ActionResult<{ id: string }>> => {
  const supabase = await createClient();

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

  return { success: true, data: block };
};

export const updateBlock = async (
  id: string,
  content: unknown
): Promise<ActionResult> => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("formation_blocks")
    .update({ content: content as Record<string, unknown> })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  return { success: true };
};

export const deleteBlock = async (id: string): Promise<ActionResult> => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("formation_blocks")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  return { success: true };
};

export const updateProgress = async (
  enrollmentId: string,
  blockId: string,
  completed: boolean
): Promise<ActionResult> => {
  const supabase = await createClient();

  const { error } = await supabase.from("formation_progress").upsert(
    {
      enrollment_id: enrollmentId,
      block_id: blockId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "enrollment_id,block_id" }
  );

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  return { success: true };
};

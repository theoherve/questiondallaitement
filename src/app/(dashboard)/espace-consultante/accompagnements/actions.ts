"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { accompagnementSchema, sectionSchema } from "@/validations/accompagnements";
import { revalidatePath } from "next/cache";
import {
  canEditAccompagnement,
  canEditSection,
  canEditBlock,
} from "@/lib/accompagnements/authorization";
import type { ActionResult } from "@/types";

/**
 * Message unique pour tous les refus d'acces.
 *
 * Distinguer « ça n'existe pas » de « ça ne vous appartient pas » revient a
 * confirmer l'existence d'un identifiant a qui n'y a pas droit.
 */
const FORBIDDEN = "Accès refusé à ce contenu";

export const createAccompagnement = async (
  data: unknown
): Promise<ActionResult<{ id: string; slug: string }>> => {
  const parsed = accompagnementSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { supabase, user } = await getSupabaseAndUser();

  const { data: accompagnement, error } = await supabase
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

  revalidatePath("/espace-consultante/accompagnements");
  return { success: true, data: accompagnement };
};

export const updateAccompagnement = async (
  id: string,
  data: unknown
): Promise<ActionResult> => {
  const parsed = accompagnementSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { supabase, user } = await getSupabaseAndUser();
  const { error } = await supabase
    .from("formations")
    .update({
      ...parsed.data,
      thumbnail_url: parsed.data.thumbnail_url || null,
      published_at:
        parsed.data.status === "published" ? new Date().toISOString() : undefined,
    })
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/espace-consultante/accompagnements");
  revalidatePath(`/accompagnements/${parsed.data.slug}`);
  return { success: true };
};

export const deleteAccompagnement = async (id: string): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("formations")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/espace-consultante/accompagnements");
  return { success: true };
};

export const createSection = async (
  accompagnementId: string,
  data: unknown
): Promise<ActionResult<{ id: string }>> => {
  const parsed = sectionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { supabase, user } = await getSupabaseAndUser();

  // `accompagnementId` vient du client : sans ce controle, on peut greffer une
  // section dans l'accompagnement de n'importe quelle consultante.
  if (!(await canEditAccompagnement(supabase, accompagnementId, user.id))) {
    return { success: false, error: FORBIDDEN };
  }

  const { data: section, error } = await supabase
    .from("formation_sections")
    .insert({
      formation_id: accompagnementId,
      ...parsed.data,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création de la section" };
  }

  revalidatePath(`/espace-consultante/accompagnements/${accompagnementId}/edit`);
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

  const { supabase, user } = await getSupabaseAndUser();

  if (!(await canEditSection(supabase, id, user.id))) {
    return { success: false, error: FORBIDDEN };
  }

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
  const { supabase, user } = await getSupabaseAndUser();

  if (!(await canEditSection(supabase, id, user.id))) {
    return { success: false, error: FORBIDDEN };
  }

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
  const { supabase, user } = await getSupabaseAndUser();

  if (!(await canEditSection(supabase, sectionId, user.id))) {
    return { success: false, error: FORBIDDEN };
  }

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
  const { supabase, user } = await getSupabaseAndUser();

  if (!(await canEditBlock(supabase, id, user.id))) {
    return { success: false, error: FORBIDDEN };
  }

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
  const { supabase, user } = await getSupabaseAndUser();

  if (!(await canEditBlock(supabase, id, user.id))) {
    return { success: false, error: FORBIDDEN };
  }

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
  const { supabase } = await getSupabaseAndUser();

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

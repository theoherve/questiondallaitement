"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export const markBlockComplete = async (
  enrollmentId: string,
  blockId: string
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: enrollment } = await supabase
    .from("formation_enrollments")
    .select("id")
    .eq("id", enrollmentId)
    .eq("client_id", user.id)
    .single();

  if (!enrollment) {
    return { success: false, error: "Inscription introuvable" };
  }

  const { error } = await supabase.from("formation_progress").upsert(
    {
      enrollment_id: enrollmentId,
      block_id: blockId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "enrollment_id,block_id" }
  );

  if (error) {
    return { success: false, error: "Erreur mise à jour progression" };
  }

  revalidatePath(`/espace-client/accompagnements`);
  return { success: true };
};

export const toggleBookmark = async (
  enrollmentId: string,
  blockId: string,
  bookmarked: boolean
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: enrollment } = await supabase
    .from("formation_enrollments")
    .select("id")
    .eq("id", enrollmentId)
    .eq("client_id", user.id)
    .single();

  if (!enrollment) {
    return { success: false, error: "Inscription introuvable" };
  }

  if (bookmarked) {
    const { error } = await supabase.from("formation_bookmarks").upsert(
      { enrollment_id: enrollmentId, block_id: blockId },
      { onConflict: "enrollment_id,block_id" }
    );
    if (error) return { success: false, error: "Erreur ajout favori" };
  } else {
    const { error } = await supabase
      .from("formation_bookmarks")
      .delete()
      .eq("enrollment_id", enrollmentId)
      .eq("block_id", blockId);
    if (error) return { success: false, error: "Erreur retrait favori" };
  }

  return { success: true };
};

export const markBlockIncomplete = async (
  enrollmentId: string,
  blockId: string
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: enrollment } = await supabase
    .from("formation_enrollments")
    .select("id")
    .eq("id", enrollmentId)
    .eq("client_id", user.id)
    .single();

  if (!enrollment) {
    return { success: false, error: "Inscription introuvable" };
  }

  const { error } = await supabase
    .from("formation_progress")
    .update({ completed: false, completed_at: null })
    .eq("enrollment_id", enrollmentId)
    .eq("block_id", blockId);

  if (error) {
    return { success: false, error: "Erreur mise à jour progression" };
  }

  revalidatePath(`/espace-client/accompagnements`);
  return { success: true };
};

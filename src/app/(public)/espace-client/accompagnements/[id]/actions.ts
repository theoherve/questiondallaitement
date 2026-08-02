"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage/helpers";
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

/**
 * Ouvre une pièce jointe stockée dans le bucket privé `downloads`.
 *
 * Le bucket n'est pas public : l'URL enregistrée dans le bloc ne mène à rien
 * telle quelle. On vérifie ici que la personne est bien inscrite à
 * l'accompagnement, puis on signe une URL temporaire pour ce fichier.
 */
export const getAttachmentUrl = async (
  formationId: string,
  blockId: string
): Promise<ActionResult<{ url: string }>> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: enrollment } = await supabase
    .from("formation_enrollments")
    .select("id")
    .eq("formation_id", formationId)
    .eq("client_id", user.id)
    .maybeSingle();

  if (!enrollment) {
    return { success: false, error: "Accompagnement non accessible" };
  }

  const admin = createAdminClient();
  const { data: block } = await admin
    .from("formation_blocks")
    .select("content, formation_sections!inner(formation_id)")
    .eq("id", blockId)
    .eq("formation_sections.formation_id", formationId)
    .maybeSingle();

  const url = (block?.content as { url?: string } | null)?.url;
  if (!url) {
    return { success: false, error: "Fichier introuvable" };
  }

  // Les fichiers hébergés hors du bucket privé (anciens blocs, liens externes)
  // restent servis tels quels.
  const path = extractDownloadPath(url);
  if (!path) return { success: true, data: { url } };

  try {
    const signed = await getSignedUrl("downloads", path);
    return { success: true, data: { url: signed } };
  } catch {
    return { success: false, error: "Lien de téléchargement indisponible" };
  }
};

/** Chemin interne au bucket `downloads`, ou `null` si l'URL n'en vient pas. */
const extractDownloadPath = (url: string): string | null => {
  const marker = "/downloads/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
};

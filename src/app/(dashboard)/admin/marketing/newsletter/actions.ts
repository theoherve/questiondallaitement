"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

/**
 * Enregistre l'URL du memo offert a l'inscription.
 *
 * En base plutot qu'en variable d'environnement : Carole doit pouvoir
 * remplacer le fichier sans redeploiement. Le fichier lui-meme est deja dans
 * le bucket public « ressources » quand cette action est appelee — on ne
 * conserve ici que son adresse.
 */
export const saveMemoUrl = async (url: string): Promise<ActionResult> => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) {
    return { success: false, error: "Non autorisé" };
  }

  const trimmed = url.trim();

  // Seules les adresses de notre propre stockage sont acceptees. Sans ce
  // garde-fou, le champ deviendrait un moyen de faire pointer un email signe
  // « Question d'Allaitement » vers un fichier arbitraire.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (trimmed !== "" && !trimmed.startsWith(`${supabaseUrl}/storage/v1/object/public/ressources/`)) {
    return {
      success: false,
      error: "Le fichier doit être déposé via ce formulaire.",
    };
  }

  const { error } = await createAdminClient()
    .from("platform_settings")
    .update({ value: trimmed, updated_at: new Date().toISOString() })
    .eq("key", "newsletter_memo_url");

  if (error) {
    console.error("[newsletter] URL du mémo non enregistrée", error);
    return { success: false, error: "Enregistrement impossible" };
  }

  revalidatePath("/admin/marketing/newsletter");
  return { success: true };
};

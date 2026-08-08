"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formationTemplateSchema } from "@/validations/formation-templates";
import { normalizeRichText } from "@/lib/html/rich-text";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

/**
 * Colonnes ecrites a la creation comme a la mise a jour.
 *
 * Le contenu riche passe par `normalizeRichText` : l'editeur renvoie
 * `<p></p>` pour une section videe, et cette coquille priverait les sessions
 * de leur heritage sans rien afficher a la place.
 */
const toRow = (data: ReturnType<typeof formationTemplateSchema.parse>) => ({
  title: data.title,
  slug: data.slug,
  summary_html: normalizeRichText(data.summary_html),
  objectives_html: normalizeRichText(data.objectives_html),
  program_html: normalizeRichText(data.program_html),
  audience_html: normalizeRichText(data.audience_html),
  external_url: data.external_url || null,
  badge: data.badge || null,
  category: data.category,
});

/**
 * Rafraichit les pages publiques des sessions rattachees a la fiche.
 *
 * Une fiche n'a pas d'URL publique : ce sont les sessions qui affichent son
 * contenu. Sans cela, une correction de programme resterait invisible jusqu'a
 * la prochaine revalidation de chaque fiche de session.
 */
const revalidateAttachedFormations = async (templateId: string) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("formations")
    .select("slug")
    .eq("template_id", templateId);

  for (const formation of data ?? []) {
    revalidatePath(`/formations/${formation.slug}`);
  }
  revalidatePath("/formations");
  revalidatePath("/admin/formations/fiches");
};

// ─── Create ─────────────────────────────────────────────────────

export const createFormationTemplate = async (
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = formationTemplateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: template, error } = await supabase
    .from("formation_templates")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    console.error("Create formation template error:", error);
    return { success: false, error: "Erreur lors de la création" };
  }

  revalidatePath("/admin/formations/fiches");
  return { success: true, data: template };
};

// ─── Update ─────────────────────────────────────────────────────

export const updateFormationTemplate = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = formationTemplateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("formation_templates")
    .update({ ...toRow(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    console.error("Update formation template error:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath(`/admin/formations/fiches/${id}/edit`);
  await revalidateAttachedFormations(id);
  return { success: true };
};

// ─── Delete ─────────────────────────────────────────────────────

/**
 * Supprimer une fiche encore rattachee ferait disparaitre le contenu de
 * plusieurs sessions d'un coup (la cle etrangere est `ON DELETE SET NULL`).
 * On refuse tant qu'il en reste, comme pour une formation inscrite.
 */
export const deleteFormationTemplate = async (
  id: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("formations")
    .select("*", { count: "exact", head: true })
    .eq("template_id", id);

  if (count && count > 0) {
    return {
      success: false,
      error: `Impossible de supprimer : ${count} session(s) utilisent cette fiche`,
    };
  }

  const { error } = await supabase
    .from("formation_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete formation template error:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/admin/formations/fiches");
  return { success: true };
};

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

const revalidateLiens = (id?: string) => {
  revalidatePath("/liens");
  revalidatePath("/admin/liens");
  if (id) revalidatePath(`/admin/liens/${id}/edit`);
};

/**
 * Une rubrique n'a pas d'URL, un lien en exige une. Le `superRefine` porte donc
 * la règle que la contrainte SQL `bio_links_link_needs_url` applique en base :
 * ici pour afficher le message sous le bon champ, là-bas pour qu'aucune autre
 * voie d'écriture ne puisse la contourner.
 */
const bioLinkSchema = z
  .object({
    kind: z.enum(["link", "header"]),
    title: z.string().trim().min(1, "Le titre est requis"),
    subtitle: z.string().trim().optional().nullable(),
    url: z.string().trim().optional().nullable(),
    thumbnail_url: z.string().trim().optional().nullable(),
    is_featured: z.boolean(),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.kind !== "link") return;

    if (!data.url) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "L'adresse est requise pour un lien",
      });
      return;
    }

    if (!/^https?:\/\/|^\//.test(data.url)) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message:
          "L'adresse doit commencer par https:// ou par / pour une page du site",
      });
    }
  });

export type BioLinkFormData = z.infer<typeof bioLinkSchema>;

/** Une rubrique ne porte ni adresse, ni vignette, ni mise en avant. */
const toRow = (data: BioLinkFormData) => ({
  kind: data.kind,
  title: data.title,
  subtitle: data.subtitle?.trim() || null,
  url: data.kind === "header" ? null : data.url || null,
  thumbnail_url: data.kind === "header" ? null : data.thumbnail_url || null,
  is_featured: data.kind === "header" ? false : data.is_featured,
  is_active: data.is_active,
});

const fieldErrorsFrom = (error: z.ZodError) => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
};

// ─── Création ───────────────────────────────────────────────

export const createBioLink = async (
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();

  const parsed = bioLinkSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = createAdminClient();

  // Ajout en fin de liste : la nouvelle entrée doit être visible sans avoir à
  // faire défiler, et l'ordre se règle ensuite au glisser-déposer.
  const { data: last } = await supabase
    .from("bio_links")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("bio_links")
    .insert({ ...toRow(parsed.data), position: (last?.position ?? 0) + 10 })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création" };
  }

  revalidateLiens();

  return { success: true, data: created };
};

// ─── Modification ───────────────────────────────────────────

export const updateBioLink = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();

  const parsed = bioLinkSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bio_links")
    .update(toRow(parsed.data))
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidateLiens(id);

  return { success: true };
};

// ─── Suppression ────────────────────────────────────────────

export const deleteBioLink = async (id: string): Promise<ActionResult> => {
  await requireAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase.from("bio_links").delete().eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidateLiens();

  return { success: true };
};

// ─── Affichage sur la page ──────────────────────────────────

export const toggleBioLinkActive = async (
  id: string,
  isActive: boolean,
): Promise<ActionResult> => {
  await requireAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bio_links")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidateLiens();

  return { success: true };
};

// ─── Ordre ──────────────────────────────────────────────────

export const reorderBioLinks = async (
  orderedIds: string[],
): Promise<ActionResult> => {
  await requireAdmin();

  const parsed = z.array(z.string().uuid()).min(1).safeParse(orderedIds);
  if (!parsed.success) {
    return { success: false, error: "Ordre invalide" };
  }

  const supabase = createAdminClient();

  // Positions espacées de 10 : une insertion manuelle en base peut se glisser
  // entre deux entrées sans avoir à tout renuméroter.
  const updates = parsed.data.map((id, index) =>
    supabase
      .from("bio_links")
      .update({ position: (index + 1) * 10 })
      .eq("id", id),
  );

  const results = await Promise.all(updates);
  if (results.some((result) => result.error)) {
    return { success: false, error: "Erreur lors du réordonnancement" };
  }

  revalidateLiens();

  return { success: true };
};

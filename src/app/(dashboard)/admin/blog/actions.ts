"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { blogPostSchema, blogCategorySchema } from "@/validations/blog";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

/**
 * Traduit un échec Zod en `ActionResult` exploitable par le formulaire :
 * un message principal + le détail champ par champ.
 */
const validationFailure = (error: {
  issues: { path: PropertyKey[]; message: string }[];
}): ActionResult<never> => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }

  return {
    success: false,
    error: error.issues[0]?.message ?? "Certains champs sont invalides",
    fieldErrors,
  };
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ─── Categories ─────────────────────────────────────────────

export const getCategories = async () => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_categories")
    .select("*")
    .order("position", { ascending: true });

  if (error) return [];
  return data;
};

export const createCategory = async (
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = blogCategorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: category, error } = await supabase
    .from("blog_categories")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    return { success: false, error: "Erreur lors de la création" };
  }

  revalidatePath("/admin/blog");
  return { success: true, data: category };
};

export const updateCategory = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = blogCategorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("blog_categories")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/admin/blog");
  return { success: true };
};

export const deleteCategory = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("blog_categories")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/admin/blog");
  return { success: true };
};

// ─── Blog Posts ─────────────────────────────────────────────

export const createBlogPost = async (
  data: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> => {
  const user = await requireAdmin();
  const parsed = blogPostSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const supabase = createAdminClient();

  const insertData: Record<string, unknown> = {
    ...parsed.data,
    slug: slugify(parsed.data.slug),
    author_id: user.id,
    body_html: parsed.data.body_html ?? "",
    excerpt: parsed.data.excerpt ?? null,
    meta_title: parsed.data.meta_title ?? null,
    meta_description: parsed.data.meta_description ?? null,
    thumbnail_url: parsed.data.thumbnail_url || null,
    og_image_url: parsed.data.og_image_url || null,
    category_id: parsed.data.category_id || null,
    consultant_id: parsed.data.consultant_id || null,
    conclusion_title: parsed.data.conclusion_title ?? null,
    conclusion_text: parsed.data.conclusion_text ?? null,
    references_html: parsed.data.references_html ?? null,
    related_post_ids: parsed.data.related_post_ids ?? [],
  };

  // La date saisie prime ; sinon on horodate une publication immediate.
  if (parsed.data.published_at) {
    insertData.published_at = parsed.data.published_at;
  } else if (parsed.data.status === "published") {
    insertData.published_at = new Date().toISOString();
  } else {
    insertData.published_at = null;
  }

  const { data: post, error } = await supabase
    .from("blog_posts")
    .insert(insertData)
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    console.error("Create blog post error:", error);
    return { success: false, error: "Erreur lors de la création" };
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true, data: post };
};

export const updateBlogPost = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = blogPostSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const supabase = createAdminClient();

  // Get current post to check status change
  const { data: currentPost } = await supabase
    .from("blog_posts")
    .select("status, slug, published_at")
    .eq("id", id)
    .single();

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    slug: slugify(parsed.data.slug),
    body_html: parsed.data.body_html ?? "",
    excerpt: parsed.data.excerpt ?? null,
    meta_title: parsed.data.meta_title ?? null,
    meta_description: parsed.data.meta_description ?? null,
    thumbnail_url: parsed.data.thumbnail_url || null,
    og_image_url: parsed.data.og_image_url || null,
    category_id: parsed.data.category_id || null,
    consultant_id: parsed.data.consultant_id || null,
    conclusion_title: parsed.data.conclusion_title ?? null,
    conclusion_text: parsed.data.conclusion_text ?? null,
    references_html: parsed.data.references_html ?? null,
    // Un article ne peut pas s'epingler lui-meme : la suggestion serait un
    // lien vers la page courante.
    related_post_ids: (parsed.data.related_post_ids ?? []).filter(
      (relatedId) => relatedId !== id,
    ),
  };

  // Date de publication : la valeur saisie prime, sinon on horodate la premiere
  // publication et on conserve la date existante dans tous les autres cas — un
  // champ vide ne doit jamais effacer une date deja corrigee a la main.
  if (parsed.data.published_at) {
    updateData.published_at = parsed.data.published_at;
  } else if (
    parsed.data.status === "published" &&
    !currentPost?.published_at
  ) {
    updateData.published_at = new Date().toISOString();
  } else {
    updateData.published_at = currentPost?.published_at ?? null;
  }

  const { error } = await supabase
    .from("blog_posts")
    .update(updateData)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  const newSlug = slugify(parsed.data.slug);
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}/edit`);
  revalidatePath(`/blog/${newSlug}`);
  if (currentPost?.slug && currentPost.slug !== newSlug) {
    revalidatePath(`/blog/${currentPost.slug}`);
  }
  revalidatePath("/blog");
  return { success: true };
};

export const deleteBlogPost = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  // Soft delete
  const { error } = await supabase
    .from("blog_posts")
    .update({
      deleted_at: new Date().toISOString(),
      status: "archived",
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
};

export const updateBlogPostStatus = async (
  id: string,
  status: "draft" | "scheduled" | "published" | "archived",
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "published") {
    // On n'horodate que la premiere publication : re-publier un article archive
    // ne doit pas ecraser sa date d'origine.
    const { data: current } = await supabase
      .from("blog_posts")
      .select("published_at")
      .eq("id", id)
      .single();
    if (!current?.published_at) {
      updateData.published_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("blog_posts")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors du changement de statut" };
  }

  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}/edit`);
  revalidatePath("/blog");
  return { success: true };
};

// ─── Cron: Publish Scheduled Posts ──────────────────────────

export const publishScheduledPosts = async (): Promise<{
  published: number;
}> => {
  const supabase = createAdminClient();

  const now = new Date().toISOString();

  const { data: postsToPublish, error: fetchError } = await supabase
    .from("blog_posts")
    .select("id, slug")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .is("deleted_at", null);

  if (fetchError || !postsToPublish?.length) {
    return { published: 0 };
  }

  const ids = postsToPublish.map((p) => p.id);

  const { error: updateError } = await supabase
    .from("blog_posts")
    .update({
      status: "published",
      published_at: now,
    })
    .in("id", ids);

  if (updateError) {
    console.error("Error publishing scheduled posts:", updateError);
    return { published: 0 };
  }

  // Revalidate paths
  revalidatePath("/blog");
  for (const post of postsToPublish) {
    revalidatePath(`/blog/${post.slug}`);
  }

  return { published: postsToPublish.length };
};

"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

const STAFF_ROLES = [
  "admin",
  "marketing_manager",
  "consultant",
  "consultant_limited",
] as const;

const requireStaff = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.some((r) => STAFF_ROLES.includes(r as typeof STAFF_ROLES[number]))) {
    redirect("/connexion");
  }
  return user;
};

export type WysiwygSnippet = {
  id: string;
  name: string;
  html: string;
  category: string | null;
  created_by: string | null;
  created_at: string;
};

export const listSnippets = async (): Promise<WysiwygSnippet[]> => {
  await requireStaff();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("wysiwyg_snippets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as WysiwygSnippet[];
};

export const createSnippet = async (input: {
  name: string;
  html: string;
  category?: string;
}): Promise<ActionResult<{ id: string }>> => {
  const user = await requireStaff();
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    return { success: false, error: "Nom requis" };
  }
  if (!input.html.trim()) {
    return { success: false, error: "Contenu requis" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("wysiwyg_snippets")
    .insert({
      name: trimmedName,
      html: input.html,
      category: input.category?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/formations", "layout");
  revalidatePath("/admin/blog", "layout");
  return { success: true, data: { id: data.id } };
};

export const deleteSnippet = async (id: string): Promise<ActionResult> => {
  await requireStaff();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("wysiwyg_snippets")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/formations", "layout");
  revalidatePath("/admin/blog", "layout");
  return { success: true };
};

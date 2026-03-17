"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";

const EDITABLE_ROLES = [
  "client",
  "consultant",
  "consultant_limited",
  "marketing_manager",
  "admin",
] as const;

const updatePlatformUserSchema = z.object({
  userId: z.uuid("Utilisateur invalide"),
  first_name: z.string().trim().max(100, "Prénom trop long").nullable(),
  last_name: z.string().trim().max(100, "Nom trop long").nullable(),
  role: z.enum(EDITABLE_ROLES, "Rôle invalide"),
});

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");
  return user;
};

const emptyToNull = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const updatePlatformUser = async (formData: FormData): Promise<void> => {
  await requireAdmin();

  const parsed = updatePlatformUserSchema.safeParse({
    userId: formData.get("userId"),
    first_name: emptyToNull(formData.get("first_name")),
    last_name: emptyToNull(formData.get("last_name")),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return;
  }

  const supabase = createAdminClient();
  await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      role: parsed.data.role,
    })
    .eq("id", parsed.data.userId)
    .is("deleted_at", null);

  revalidatePath("/admin/utilisateurs");
};

export const deletePlatformUser = async (
  userId: string,
): Promise<ActionResult> => {
  const admin = await requireAdmin();

  const parsedUserId = z.uuid("Utilisateur invalide").safeParse(userId);
  if (!parsedUserId.success) {
    return { success: false, error: "Utilisateur invalide" };
  }

  if (parsedUserId.data === admin.id) {
    return {
      success: false,
      error: "Vous ne pouvez pas supprimer votre propre compte.",
    };
  }

  const supabase = createAdminClient();

  const { data: targetUser, error: targetError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", parsedUserId.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (targetError || !targetUser) {
    return { success: false, error: "Compte introuvable" };
  }

  if (targetUser.role === "admin") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .is("deleted_at", null);

    if ((count ?? 0) <= 1) {
      return {
        success: false,
        error: "Impossible de supprimer le dernier compte administrateur.",
      };
    }
  }

  const { error: deleteError } = await supabase
    .from("profiles")
    .update({
      deleted_at: new Date().toISOString(),
      role: "client",
      first_name: null,
      last_name: null,
      phone: null,
      avatar_url: null,
      password_hash: null,
      password_reset_token: null,
      password_reset_expires: null,
      email_verification_token: null,
      email_verification_expires: null,
    })
    .eq("id", parsedUserId.data)
    .is("deleted_at", null);

  if (deleteError) {
    return { success: false, error: "Erreur lors de la suppression du compte" };
  }

  await supabase
    .from("consultants")
    .update({ is_active: false })
    .eq("id", parsedUserId.data);

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "platform_user_deleted",
    entity_type: "profiles",
    entity_id: parsedUserId.data,
  });

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/consultantes");

  return { success: true };
};

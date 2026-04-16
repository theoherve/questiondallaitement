"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

// ─── Update profile ────────────────────────────────────────

const EDITABLE_ROLES = [
  "client",
  "consultant",
  "consultant_limited",
  "marketing_manager",
  "admin",
] as const;

const updateProfileSchema = z.object({
  userId: z.uuid("Utilisateur invalide"),
  first_name: z.string().trim().max(100).nullable(),
  last_name: z.string().trim().max(100).nullable(),
  phone: z.string().trim().max(20).nullable(),
  roles: z.array(z.enum(EDITABLE_ROLES)).min(1, "Au moins un rôle requis"),
});

export const updateUserProfile = async (
  formData: FormData,
): Promise<ActionResult> => {
  const admin = await requireAdmin();

  const emptyToNull = (v: FormDataEntryValue | null) => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
  };

  const rolesRaw = formData
    .getAll("roles")
    .filter((v) => typeof v === "string") as string[];

  const parsed = updateProfileSchema.safeParse({
    userId: formData.get("userId"),
    first_name: emptyToNull(formData.get("first_name")),
    last_name: emptyToNull(formData.get("last_name")),
    phone: emptyToNull(formData.get("phone")),
    roles: rolesRaw,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone,
      roles: parsed.data.roles,
    })
    .eq("id", parsed.data.userId)
    .is("deleted_at", null);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "admin_profile_updated",
    entity_type: "profiles",
    entity_id: parsed.data.userId,
    metadata: { roles: parsed.data.roles },
  });

  revalidatePath(`/admin/utilisateurs/${parsed.data.userId}`);
  revalidatePath("/admin/utilisateurs");
  return { success: true };
};

// ─── Reset password ────────────────────────────────────────

export const resetUserPassword = async (
  userId: string,
): Promise<ActionResult<{ message: string }>> => {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (!profile) {
    return { success: false, error: "Utilisateur introuvable" };
  }

  const { error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
  });

  if (error) {
    return {
      success: false,
      error: "Erreur lors de la génération du lien de reset",
    };
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "admin_password_reset",
    entity_type: "profiles",
    entity_id: userId,
  });

  return {
    success: true,
    data: { message: `Email de réinitialisation envoyé à ${profile.email}` },
  };
};

// ─── Ban / Unban ───────────────────────────────────────────

export const toggleUserBan = async (
  userId: string,
  ban: boolean,
): Promise<ActionResult> => {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { success: false, error: "Vous ne pouvez pas vous bannir" };
  }

  const supabase = createAdminClient();

  if (ban) {
    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", userId)
      .is("deleted_at", null);

    if (error) return { success: false, error: "Erreur lors du bannissement" };

    await supabase
      .from("consultants")
      .update({ is_active: false })
      .eq("id", userId);
  } else {
    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: null })
      .eq("id", userId);

    if (error)
      return { success: false, error: "Erreur lors du débannissement" };
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: ban ? "admin_user_banned" : "admin_user_unbanned",
    entity_type: "profiles",
    entity_id: userId,
  });

  revalidatePath(`/admin/utilisateurs/${userId}`);
  revalidatePath("/admin/utilisateurs");
  return { success: true };
};

// ─── Export user data ──────────────────────────────────────

export const exportUserData = async (
  userId: string,
): Promise<ActionResult<Record<string, unknown>>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const [profile, bookings, enrollments, payments, events, tags, notes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("bookings")
        .select("*")
        .eq("client_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("formation_enrollments")
        .select("*, formations(title)")
        .eq("client_id", userId),
      supabase
        .from("payments")
        .select("*")
        .eq("client_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("event_registrations")
        .select("*, events(title)")
        .eq("client_id", userId),
      supabase
        .from("crm_contact_tags")
        .select("crm_tags(name, color)")
        .eq("client_id", userId),
      supabase
        .from("crm_notes")
        .select("content, created_at")
        .eq("client_id", userId),
    ]);

  if (!profile.data) {
    return { success: false, error: "Utilisateur introuvable" };
  }

  return {
    success: true,
    data: {
      profile: profile.data,
      bookings: bookings.data ?? [],
      enrollments: enrollments.data ?? [],
      payments: payments.data ?? [],
      events: events.data ?? [],
      tags: tags.data ?? [],
      notes: notes.data ?? [],
      exported_at: new Date().toISOString(),
    },
  };
};

// ─── Admin CRM: tags ───────────────────────────────────────

export const adminAssignTag = async (
  clientId: string,
  tagId: string,
): Promise<ActionResult> => {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("crm_contact_tags").upsert(
    {
      client_id: clientId,
      tag_id: tagId,
      consultant_id: admin.id,
    },
    { onConflict: "client_id,tag_id,consultant_id" },
  );

  if (error) {
    return { success: false, error: "Erreur lors de l'assignation du tag" };
  }

  revalidatePath(`/admin/utilisateurs/${clientId}`);
  return { success: true };
};

export const adminRemoveTag = async (
  clientId: string,
  tagId: string,
  consultantId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("crm_contact_tags")
    .delete()
    .eq("client_id", clientId)
    .eq("tag_id", tagId)
    .eq("consultant_id", consultantId);

  if (error) {
    return { success: false, error: "Erreur lors du retrait du tag" };
  }

  revalidatePath(`/admin/utilisateurs/${clientId}`);
  return { success: true };
};

// ─── Admin CRM: notes ──────────────────────────────────────

export const adminCreateNote = async (
  clientId: string,
  content: string,
): Promise<ActionResult> => {
  const admin = await requireAdmin();
  if (!content.trim()) {
    return { success: false, error: "Le contenu est requis" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_notes").insert({
    client_id: clientId,
    consultant_id: admin.id,
    content: content.trim(),
  });

  if (error) {
    return { success: false, error: "Erreur lors de la création de la note" };
  }

  revalidatePath(`/admin/utilisateurs/${clientId}`);
  return { success: true };
};

export const adminDeleteNote = async (
  noteId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("crm_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/admin/utilisateurs");
  return { success: true };
};

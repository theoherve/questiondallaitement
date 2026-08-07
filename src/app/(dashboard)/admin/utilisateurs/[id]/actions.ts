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

const parseUuid = (value: unknown) => {
  const parsed = z.uuid("Identifiant invalide").safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
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
  const parsedId = parseUuid(userId);
  if (!parsedId) return { success: false, error: "Utilisateur invalide" };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", parsedId)
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
    entity_id: parsedId,
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
  const parsedId = parseUuid(userId);
  if (!parsedId) return { success: false, error: "Utilisateur invalide" };

  if (parsedId === admin.id) {
    return { success: false, error: "Vous ne pouvez pas vous bannir" };
  }

  const supabase = createAdminClient();

  // Last-admin protection (same pattern as deletePlatformUser)
  if (ban) {
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", parsedId)
      .single();

    if (targetUser && (targetUser.roles as string[]).includes("admin")) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .contains("roles", ["admin"])
        .is("deleted_at", null);

      if ((count ?? 0) <= 1) {
        return {
          success: false,
          error: "Impossible de bannir le dernier administrateur.",
        };
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", parsedId)
      .is("deleted_at", null);

    if (error) return { success: false, error: "Erreur lors du bannissement" };

    await supabase
      .from("consultants")
      .update({ is_active: false })
      .eq("id", parsedId);
  } else {
    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: null })
      .eq("id", parsedId);

    if (error)
      return { success: false, error: "Erreur lors du débannissement" };
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: ban ? "admin_user_banned" : "admin_user_unbanned",
    entity_type: "profiles",
    entity_id: parsedId,
  });

  revalidatePath(`/admin/utilisateurs/${parsedId}`);
  revalidatePath("/admin/utilisateurs");
  return { success: true };
};

// ─── Export user data ──────────────────────────────────────

export const exportUserData = async (
  userId: string,
): Promise<ActionResult<Record<string, unknown>>> => {
  await requireAdmin();
  const parsedId = parseUuid(userId);
  if (!parsedId) return { success: false, error: "Utilisateur invalide" };

  const supabase = createAdminClient();

  const [profile, bookings, enrollments, payments, formations, tags, notes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", parsedId).single(),
      supabase
        .from("bookings")
        .select("*")
        .eq("client_id", parsedId)
        .order("created_at", { ascending: false }),
      supabase
        .from("formation_enrollments")
        .select("*, formations(title)")
        .eq("client_id", parsedId),
      supabase
        .from("payments")
        .select("*")
        .eq("client_id", parsedId)
        .order("created_at", { ascending: false }),
      supabase
        .from("event_registrations")
        .select("*, events(title)")
        .eq("client_id", parsedId),
      supabase
        .from("crm_contact_tags")
        .select("crm_tags(name, color)")
        .eq("client_id", parsedId),
      supabase
        .from("crm_notes")
        .select("content, created_at")
        .eq("client_id", parsedId),
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
      events: formations.data ?? [],
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
  const parsedClientId = parseUuid(clientId);
  const parsedTagId = parseUuid(tagId);
  if (!parsedClientId || !parsedTagId)
    return { success: false, error: "Identifiant invalide" };

  const supabase = createAdminClient();

  const { error } = await supabase.from("crm_contact_tags").upsert(
    {
      client_id: parsedClientId,
      tag_id: parsedTagId,
      consultant_id: admin.id,
    },
    { onConflict: "client_id,tag_id,consultant_id" },
  );

  if (error) {
    return { success: false, error: "Erreur lors de l'assignation du tag" };
  }

  revalidatePath(`/admin/utilisateurs/${parsedClientId}`);
  return { success: true };
};

export const adminRemoveTag = async (
  clientId: string,
  tagId: string,
  consultantId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsedClientId = parseUuid(clientId);
  const parsedTagId = parseUuid(tagId);
  const parsedConsultantId = parseUuid(consultantId);
  if (!parsedClientId || !parsedTagId || !parsedConsultantId)
    return { success: false, error: "Identifiant invalide" };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("crm_contact_tags")
    .delete()
    .eq("client_id", parsedClientId)
    .eq("tag_id", parsedTagId)
    .eq("consultant_id", parsedConsultantId);

  if (error) {
    return { success: false, error: "Erreur lors du retrait du tag" };
  }

  revalidatePath(`/admin/utilisateurs/${parsedClientId}`);
  return { success: true };
};

// ─── Admin CRM: notes ──────────────────────────────────────

export const adminCreateNote = async (
  clientId: string,
  content: string,
): Promise<ActionResult> => {
  const admin = await requireAdmin();
  const parsedClientId = parseUuid(clientId);
  if (!parsedClientId)
    return { success: false, error: "Identifiant invalide" };
  if (!content.trim()) {
    return { success: false, error: "Le contenu est requis" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_notes").insert({
    client_id: parsedClientId,
    consultant_id: admin.id,
    content: content.trim(),
  });

  if (error) {
    return { success: false, error: "Erreur lors de la création de la note" };
  }

  revalidatePath(`/admin/utilisateurs/${parsedClientId}`);
  return { success: true };
};

export const adminDeleteNote = async (
  noteId: string,
  clientId: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsedNoteId = parseUuid(noteId);
  const parsedClientId = parseUuid(clientId);
  if (!parsedNoteId || !parsedClientId)
    return { success: false, error: "Identifiant invalide" };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("crm_notes")
    .delete()
    .eq("id", parsedNoteId);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/admin/utilisateurs/${parsedClientId}`);
  return { success: true };
};

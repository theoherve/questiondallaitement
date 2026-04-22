"use server";

import { randomBytes } from "crypto";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFormationAccess } from "@/lib/emails/send";
import { baseUrl } from "@/lib/url";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import type { ActionResult } from "@/types";

// Matches the MIGRATION_TOKEN_EXPIRY_HOURS window used for Wix-migrated users
// in src/app/(auth)/actions.ts — new manually-enrolled accounts share the same
// "set your password" landing flow.
const SETUP_TOKEN_EXPIRY_HOURS = 72;

const requireEnrollRole = async () => {
  const user = await getSessionUser();
  if (
    !user ||
    !(user.roles.includes("admin") || user.roles.includes("marketing_manager"))
  ) {
    redirect("/connexion");
  }
  return user;
};

const uuidSchema = z.uuid("Identifiant invalide");

export type ClientSearchResult = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

export const searchClientsForEnroll = async (
  query: string,
  formationId: string,
): Promise<ActionResult<ClientSearchResult[]>> => {
  await requireEnrollRole();

  const parsedFormationId = uuidSchema.safeParse(formationId);
  if (!parsedFormationId.success) {
    return { success: false, error: "Accompagnement invalide" };
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { success: true, data: [] };
  }

  const supabase = createAdminClient();

  const { data: alreadyEnrolled } = await supabase
    .from("formation_enrollments")
    .select("client_id")
    .eq("formation_id", parsedFormationId.data);

  const excludeIds = (alreadyEnrolled ?? []).map((e) => e.client_id);

  // Strip every ILIKE/postgrest-sensitive char (%, _, \, comma, parens) before
  // building the pattern — otherwise an operator typing `a_@` would silently
  // do a broader match than they expect.
  const escaped = trimmed.replace(/[\\%_,()]/g, " ");
  const pattern = `%${escaped}%`;

  let builder = supabase
    .from("profiles")
    .select("id, email, first_name, last_name, phone")
    .is("deleted_at", null)
    .or(
      `email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (excludeIds.length > 0) {
    builder = builder.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await builder;

  if (error) {
    return { success: false, error: "Erreur lors de la recherche" };
  }

  return { success: true, data: (data ?? []) as ClientSearchResult[] };
};

const newClientSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  first_name: z.string().trim().min(1, "Prénom requis").max(100),
  last_name: z.string().trim().min(1, "Nom requis").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

type EnrollOutcome = ActionResult<{ client_id: string; enrollment_id: string }>;

const insertEnrollmentAndNotify = async (args: {
  adminId: string;
  clientId: string;
  clientEmail: string;
  clientFirstName: string | null;
  formationId: string;
  formationTitle: string;
  isNewAccount: boolean;
}): Promise<EnrollOutcome> => {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("formation_enrollments")
    .select("id")
    .eq("client_id", args.clientId)
    .eq("formation_id", args.formationId)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: "Cet utilisateur est déjà inscrit à cet accompagnement",
    };
  }

  const { data: enrollment, error } = await supabase
    .from("formation_enrollments")
    .insert({
      client_id: args.clientId,
      formation_id: args.formationId,
      source: "manual",
      enrolled_by: args.adminId,
    })
    .select("id")
    .single();

  if (error || !enrollment) {
    return { success: false, error: "Erreur lors de l'inscription" };
  }

  const root = baseUrl();
  const formationUrl = `${root}/espace-client/accompagnements/${args.formationId}`;

  // For new accounts, provision a password-setup token (same pattern as the
  // Wix-migration flow in (auth)/actions.ts) and build a `/reset-password?token=`
  // URL the user can actually consume. After password creation they land on
  // /connexion; they navigate to the formation from /espace-client.
  let accessUrl = formationUrl;
  if (args.isNewAccount) {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(
      Date.now() + SETUP_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    ).toISOString();
    await supabase
      .from("profiles")
      .update({
        password_reset_token: token,
        password_reset_expires: expires,
      })
      .eq("id", args.clientId);
    accessUrl = `${root}/reset-password?token=${token}`;
  }

  try {
    await sendFormationAccess(args.clientEmail, {
      client_name: args.clientFirstName ?? "",
      formation_title: args.formationTitle,
      access_url: accessUrl,
      is_new_account: args.isNewAccount,
    });
  } catch (err) {
    // Non-blocking: enrollment already persisted. Log so admin can diagnose
    // and resend manually if needed.
    console.error("[manualEnroll] sendFormationAccess failed:", err);
  }

  await supabase.from("audit_logs").insert({
    user_id: args.adminId,
    action: "admin_manual_formation_enrollment",
    entity_type: "formation_enrollments",
    entity_id: enrollment.id,
    metadata: {
      formation_id: args.formationId,
      client_id: args.clientId,
      is_new_account: args.isNewAccount,
    },
  });

  revalidatePath(`/admin/formations/${args.formationId}/edit`);
  revalidatePath(`/admin/utilisateurs/${args.clientId}`);

  return {
    success: true,
    data: { client_id: args.clientId, enrollment_id: enrollment.id },
  };
};

const loadFormationTitle = async (
  formationId: string,
): Promise<{ title: string } | null> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("formations")
    .select("title")
    .eq("id", formationId)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
};

export const manualEnrollExistingClient = async (
  formationId: string,
  clientId: string,
): Promise<EnrollOutcome> => {
  const admin = await requireEnrollRole();

  const parsedFormation = uuidSchema.safeParse(formationId);
  const parsedClient = uuidSchema.safeParse(clientId);
  if (!parsedFormation.success || !parsedClient.success) {
    return { success: false, error: "Identifiants invalides" };
  }

  const formation = await loadFormationTitle(parsedFormation.data);
  if (!formation) {
    return { success: false, error: "Accompagnement introuvable" };
  }

  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("profiles")
    .select("id, email, first_name")
    .eq("id", parsedClient.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (!client) {
    return { success: false, error: "Utilisateur introuvable" };
  }

  return insertEnrollmentAndNotify({
    adminId: admin.id,
    clientId: client.id,
    clientEmail: client.email,
    clientFirstName: client.first_name,
    formationId: parsedFormation.data,
    formationTitle: formation.title,
    isNewAccount: false,
  });
};

export const manualEnrollNewClient = async (
  formationId: string,
  input: unknown,
): Promise<EnrollOutcome> => {
  const admin = await requireEnrollRole();

  const parsedFormation = uuidSchema.safeParse(formationId);
  if (!parsedFormation.success) {
    return { success: false, error: "Accompagnement invalide" };
  }

  const parsed = newClientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const formation = await loadFormationTitle(parsedFormation.data);
  if (!formation) {
    return { success: false, error: "Accompagnement introuvable" };
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error:
        "Un compte existe déjà avec cet email. Utilisez la recherche pour l'inscrire.",
    };
  }

  const phone =
    parsed.data.phone && parsed.data.phone.length > 0 ? parsed.data.phone : null;

  const { data: newProfile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: crypto.randomUUID(),
      email: parsed.data.email,
      roles: ["client"],
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone,
    })
    .select("id, email, first_name")
    .single();

  if (profileError || !newProfile) {
    return { success: false, error: "Erreur lors de la création du profil" };
  }

  return insertEnrollmentAndNotify({
    adminId: admin.id,
    clientId: newProfile.id,
    clientEmail: newProfile.email,
    clientFirstName: newProfile.first_name,
    formationId: parsedFormation.data,
    formationTitle: formation.title,
    isNewAccount: true,
  });
};

export type AvailableFormation = {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
};

export const listAvailableFormationsForClient = async (
  clientId: string,
): Promise<ActionResult<AvailableFormation[]>> => {
  await requireEnrollRole();

  const parsed = uuidSchema.safeParse(clientId);
  if (!parsed.success) return { success: false, error: "Utilisateur invalide" };

  const supabase = createAdminClient();

  const { data: enrolled } = await supabase
    .from("formation_enrollments")
    .select("formation_id")
    .eq("client_id", parsed.data);

  const excludeIds = (enrolled ?? []).map((e) => e.formation_id);

  let builder = supabase
    .from("formations")
    .select("id, title, status")
    .is("deleted_at", null)
    .in("status", ["published", "draft"])
    .order("title", { ascending: true });

  if (excludeIds.length > 0) {
    builder = builder.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await builder;
  if (error) {
    return { success: false, error: "Erreur lors du chargement" };
  }

  return { success: true, data: (data ?? []) as AvailableFormation[] };
};

export const unenrollFromFormation = async (
  enrollmentId: string,
): Promise<ActionResult> => {
  const admin = await requireEnrollRole();
  const parsed = uuidSchema.safeParse(enrollmentId);
  if (!parsed.success) return { success: false, error: "Inscription invalide" };

  const supabase = createAdminClient();
  const { data: enrollment } = await supabase
    .from("formation_enrollments")
    .select("id, source, formation_id, client_id")
    .eq("id", parsed.data)
    .maybeSingle();

  if (!enrollment) {
    return { success: false, error: "Inscription introuvable" };
  }

  if (enrollment.source !== "manual") {
    return {
      success: false,
      error:
        "Seules les inscriptions manuelles peuvent être retirées depuis l'admin",
    };
  }

  const { error } = await supabase
    .from("formation_enrollments")
    .delete()
    .eq("id", parsed.data);

  if (error) {
    return { success: false, error: "Erreur lors du retrait" };
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "admin_manual_formation_unenrollment",
    entity_type: "formation_enrollments",
    entity_id: parsed.data,
    metadata: {
      formation_id: enrollment.formation_id,
      client_id: enrollment.client_id,
    },
  });

  revalidatePath(`/admin/formations/${enrollment.formation_id}/edit`);
  revalidatePath(`/admin/utilisateurs/${enrollment.client_id}`);

  return { success: true };
};

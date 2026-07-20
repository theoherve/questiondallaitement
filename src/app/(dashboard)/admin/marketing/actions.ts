"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  emailTemplateSchema,
  emailCampaignSchema,
  consultantBrevoListSchema,
} from "@/validations/emails";
import {
  createEmailCampaign as brevoCreateCampaign,
  updateEmailCampaign as brevoUpdateCampaign,
  sendCampaignNow,
  getCampaignReport,
  getLists as brevoGetLists,
} from "@/lib/brevo/client";
import { syncAllContactsToBrevo } from "@/lib/brevo/sync";
import { renderBlockEmail } from "@/lib/emails/render-block-email";
import { DEFAULT_TEMPLATE_DESIGNS } from "@/lib/emails/default-template-designs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import type { CampaignStats } from "@/types/database";
import type { JSONContent } from "@maily-to/render";

/**
 * If a block design is present, render it to HTML and cache in body_html.
 * For marketing (Brevo), Brevo receives final HTML — pre-rendering is required.
 * Template variables stay as {{var}} placeholders (replaceVariables=false).
 */
const withRenderedHtml = async <T extends { body_html?: string; body_design?: Record<string, unknown> | null }>(
  input: T,
): Promise<T & { body_html: string }> => {
  if (input.body_design && Object.keys(input.body_design).length > 0) {
    const html = await renderBlockEmail(input.body_design as JSONContent, {
      replaceVariables: false,
    });
    return { ...input, body_html: html };
  }
  return { ...input, body_html: input.body_html ?? "" };
};

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

// ─── Templates ──────────────────────────────────────────────

export const getTemplates = async (type?: "transactional" | "marketing") => {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase
    .from("email_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) return [];
  return data;
};

export const getTemplate = async (id: string) => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();

  return data;
};

export const createTemplate = async (
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireAdmin();
  const parsed = emailTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const rendered = await withRenderedHtml(parsed.data);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .insert({ ...rendered, created_by: user.id })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création du template." };
  }

  revalidatePath("/admin/marketing");
  return { success: true, data: { id: data.id } };
};

export const updateTemplate = async (
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = emailTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const rendered = await withRenderedHtml(parsed.data);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("email_templates")
    .update(rendered)
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }

  revalidatePath("/admin/marketing");
  return { success: true, data: { id } };
};

export const deleteTemplate = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression." };
  }

  revalidatePath("/admin/marketing");
  return { success: true };
};

// ─── Campaigns ──────────────────────────────────────────────

export const getCampaigns = async () => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*, consultant:consultants(id, profiles!consultants_id_fkey(first_name, last_name))")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data;
};

export const getCampaign = async (id: string) => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  return data;
};

export const createCampaign = async (
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = emailCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const rendered = await withRenderedHtml(parsed.data);
  const supabase = createAdminClient();

  // Create in local DB first
  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({
      name: rendered.name,
      subject: rendered.subject,
      body_html: rendered.body_html,
      body_design: rendered.body_design ?? null,
      recipient_list_ids: rendered.recipient_list_ids,
      status: "draft",
      consultant_id: null, // admin campaign
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: "Erreur lors de la création de la campagne.",
    };
  }

  revalidatePath("/admin/marketing");
  return { success: true, data: { id: data.id } };
};

export const updateCampaign = async (
  id: string,
  input: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = emailCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();

  // Check campaign is still in draft
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("status, brevo_campaign_id")
    .eq("id", id)
    .single();

  if (!campaign || campaign.status !== "draft") {
    return {
      success: false,
      error: "Seules les campagnes brouillon peuvent être modifiées.",
    };
  }

  const rendered = await withRenderedHtml(parsed.data);

  const { error } = await supabase
    .from("email_campaigns")
    .update({
      name: rendered.name,
      subject: rendered.subject,
      body_html: rendered.body_html,
      body_design: rendered.body_design ?? null,
      recipient_list_ids: rendered.recipient_list_ids,
      scheduled_at: rendered.scheduled_at ?? null,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }

  // Update in Brevo if already synced
  if (campaign.brevo_campaign_id) {
    await brevoUpdateCampaign(campaign.brevo_campaign_id, {
      name: rendered.name,
      subject: rendered.subject,
      htmlContent: rendered.body_html,
      recipients: { listIds: rendered.recipient_list_ids },
    });
  }

  revalidatePath("/admin/marketing");
  return { success: true };
};

export const sendCampaign = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign || campaign.status !== "draft") {
    return {
      success: false,
      error: "Cette campagne ne peut pas être envoyée.",
    };
  }

  if (!campaign.body_html) {
    return { success: false, error: "Le contenu de la campagne est vide." };
  }

  const senderName = process.env.BREVO_SENDER_NAME ?? "Question d'Allaitement";
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ?? "contact@questiondallaitement.com";

  // Create campaign in Brevo
  const { ok, data: brevoData } = await brevoCreateCampaign({
    name: campaign.name,
    subject: campaign.subject,
    htmlContent: campaign.body_html,
    sender: { name: senderName, email: senderEmail },
    recipients: { listIds: campaign.recipient_list_ids ?? [] },
  });

  if (!ok || !brevoData) {
    return { success: false, error: "Erreur lors de la création sur Brevo." };
  }

  // Send immediately
  const sendResult = await sendCampaignNow(brevoData.id);
  if (!sendResult.ok) {
    return { success: false, error: "Erreur lors de l'envoi sur Brevo." };
  }

  // Update local DB
  await supabase
    .from("email_campaigns")
    .update({
      brevo_campaign_id: String(brevoData.id),
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/marketing");
  return { success: true };
};

export const scheduleCampaign = async (
  id: string,
  scheduledAt: string,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign || campaign.status !== "draft") {
    return {
      success: false,
      error: "Cette campagne ne peut pas être programmée.",
    };
  }

  if (!campaign.body_html) {
    return { success: false, error: "Le contenu de la campagne est vide." };
  }

  const senderName = process.env.BREVO_SENDER_NAME ?? "Question d'Allaitement";
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ?? "contact@questiondallaitement.com";

  // Create scheduled campaign in Brevo
  const { ok, data: brevoData } = await brevoCreateCampaign({
    name: campaign.name,
    subject: campaign.subject,
    htmlContent: campaign.body_html,
    sender: { name: senderName, email: senderEmail },
    recipients: { listIds: campaign.recipient_list_ids ?? [] },
    scheduledAt,
  });

  if (!ok || !brevoData) {
    return {
      success: false,
      error: "Erreur lors de la programmation sur Brevo.",
    };
  }

  await supabase
    .from("email_campaigns")
    .update({
      brevo_campaign_id: String(brevoData.id),
      status: "scheduled",
      scheduled_at: scheduledAt,
    })
    .eq("id", id);

  revalidatePath("/admin/marketing");
  return { success: true };
};

export const deleteCampaign = async (id: string): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("status")
    .eq("id", id)
    .single();

  if (
    !campaign ||
    (campaign.status !== "draft" && campaign.status !== "scheduled")
  ) {
    return {
      success: false,
      error:
        "Seules les campagnes brouillon ou programmées peuvent être supprimées.",
    };
  }

  const { error } = await supabase
    .from("email_campaigns")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression." };
  }

  revalidatePath("/admin/marketing");
  return { success: true };
};

export const refreshCampaignStats = async (
  id: string,
): Promise<ActionResult<CampaignStats>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("brevo_campaign_id")
    .eq("id", id)
    .single();

  if (!campaign?.brevo_campaign_id) {
    return { success: false, error: "Campagne non synchronisée avec Brevo." };
  }

  const stats = await getCampaignReport(campaign.brevo_campaign_id);
  if (!stats) {
    return {
      success: false,
      error: "Impossible de récupérer les statistiques.",
    };
  }

  await supabase.from("email_campaigns").update({ stats }).eq("id", id);

  revalidatePath("/admin/marketing");
  return { success: true, data: stats };
};

// ─── Brevo Lists Management ────────────────────────────────

export const getBrevoLists = async () => {
  await requireAdmin();
  return brevoGetLists();
};

export const getConsultantBrevoLists = async (consultantId: string) => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("consultant_brevo_lists")
    .select("*")
    .eq("consultant_id", consultantId)
    .order("created_at", { ascending: true });

  return data ?? [];
};

export const assignBrevoListToConsultant = async (
  input: unknown,
): Promise<ActionResult> => {
  await requireAdmin();
  const parsed = consultantBrevoListSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("consultant_brevo_lists")
    .upsert(parsed.data, { onConflict: "consultant_id,brevo_list_id" });

  if (error) {
    return { success: false, error: "Erreur lors de l'assignation." };
  }

  revalidatePath("/admin/marketing");
  return { success: true };
};

export const removeBrevoListFromConsultant = async (
  consultantId: string,
  brevoListId: number,
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("consultant_brevo_lists")
    .delete()
    .eq("consultant_id", consultantId)
    .eq("brevo_list_id", brevoListId);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression." };
  }

  revalidatePath("/admin/marketing");
  return { success: true };
};

// ─── Default transactional designs ──────────────────────────

const TEMPLATE_DEFAULT_SUBJECTS: Record<string, string> = {
  booking_confirmation: "Votre réservation est confirmée — {{date}}",
  booking_reminder: "Rappel : votre consultation demain à {{time}}",
  booking_cancelled: "Votre réservation du {{date}} a été annulée",
  formation_access:
    "Votre accompagnement « {{formation_title}} » est disponible",
  welcome: "Bienvenue sur Question d'Allaitement",
  password_reset: "Réinitialisation de votre mot de passe",
};

const TEMPLATE_DEFAULT_VARIABLES: Record<string, string[]> = {
  booking_confirmation: ["client_name", "consultant_name", "date", "time"],
  booking_reminder: ["client_name", "consultant_name", "time"],
  booking_cancelled: ["client_name", "date", "refund_info"],
  formation_access: ["client_name", "formation_title", "formation_url"],
  welcome: ["client_name", "dashboard_url"],
  password_reset: ["client_name", "reset_url"],
};

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const buildDefaultTemplatePayload = async (name: string) => {
  const design = DEFAULT_TEMPLATE_DESIGNS[name];
  if (!design) return null;
  const body_html = await renderBlockEmail(design as JSONContent, {
    replaceVariables: false,
  });
  return {
    name,
    subject: TEMPLATE_DEFAULT_SUBJECTS[name] ?? name,
    body_html,
    body_design: design,
    variables: TEMPLATE_DEFAULT_VARIABLES[name] ?? [],
    type: "transactional" as const,
  };
};

const upsertDefaultTemplateByName = async (
  supabase: SupabaseAdmin,
  name: string,
): Promise<{ id: string } | null> => {
  const payload = await buildDefaultTemplatePayload(name);
  if (!payload) return null;

  const { data: existing } = await supabase
    .from("email_templates")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("email_templates")
      .update(payload)
      .eq("id", existing.id);
    if (error) return null;
    return { id: existing.id };
  }

  const { data: inserted, error } = await supabase
    .from("email_templates")
    .insert(payload)
    .select("id")
    .single();
  if (error || !inserted?.id) return null;
  return { id: inserted.id };
};

/**
 * Upsert the bundled brand-styled designs for every seeded transactional
 * template. Idempotent — re-running overwrites design/body_html/subject with
 * the latest defaults, leaves created_at untouched.
 */
export const restoreDefaultTemplates = async (): Promise<
  ActionResult<{ updated: number }>
> => {
  await requireAdmin();
  const supabase = createAdminClient();
  let updated = 0;

  for (const name of Object.keys(DEFAULT_TEMPLATE_DESIGNS)) {
    const result = await upsertDefaultTemplateByName(supabase, name);
    if (result) updated++;
  }

  revalidatePath("/admin/marketing");
  return { success: true, data: { updated } };
};

/**
 * Restore the bundled default design for a single template identified by name.
 * Used from the template editor when `body_design` is empty but a bundled
 * default exists — lets the admin reclaim an editable block version without
 * reseeding every template.
 */
export const restoreTemplateDesign = async (
  name: string,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  if (!DEFAULT_TEMPLATE_DESIGNS[name]) {
    return { success: false, error: "Aucun design par défaut pour ce template." };
  }

  const supabase = createAdminClient();
  const result = await upsertDefaultTemplateByName(supabase, name);
  if (!result) {
    return { success: false, error: "Erreur lors de la restauration." };
  }

  revalidatePath("/admin/marketing");
  revalidatePath(`/admin/marketing/templates/${result.id}/edit`);
  return { success: true, data: { id: result.id } };
};

// ─── Batch Sync ─────────────────────────────────────────────

export const triggerBatchSync = async (): Promise<
  ActionResult<{ total: number; synced: number; errors: number }>
> => {
  await requireAdmin();
  const result = await syncAllContactsToBrevo();
  return { success: true, data: result };
};

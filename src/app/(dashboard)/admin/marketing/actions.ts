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
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import type { CampaignStats } from "@/types/database";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");
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

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .insert({ ...parsed.data, created_by: user.id })
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

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("email_templates")
    .update(parsed.data)
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
    .select("*, consultant:consultants(id, profiles(first_name, last_name))")
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

  const supabase = createAdminClient();

  // Create in local DB first
  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({
      name: parsed.data.name,
      subject: parsed.data.subject,
      body_html: parsed.data.body_html,
      recipient_list_ids: parsed.data.recipient_list_ids,
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

  const { error } = await supabase
    .from("email_campaigns")
    .update({
      name: parsed.data.name,
      subject: parsed.data.subject,
      body_html: parsed.data.body_html,
      recipient_list_ids: parsed.data.recipient_list_ids,
      scheduled_at: parsed.data.scheduled_at ?? null,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }

  // Update in Brevo if already synced
  if (campaign.brevo_campaign_id) {
    await brevoUpdateCampaign(campaign.brevo_campaign_id, {
      name: parsed.data.name,
      subject: parsed.data.subject,
      htmlContent: parsed.data.body_html,
      recipients: { listIds: parsed.data.recipient_list_ids },
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

// ─── Batch Sync ─────────────────────────────────────────────

export const triggerBatchSync = async (): Promise<
  ActionResult<{ total: number; synced: number; errors: number }>
> => {
  await requireAdmin();
  const result = await syncAllContactsToBrevo();
  return { success: true, data: result };
};

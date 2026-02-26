"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailCampaignSchema } from "@/validations/emails";
import {
  createEmailCampaign as brevoCreateCampaign,
  sendCampaignNow,
  getCampaignReport,
} from "@/lib/brevo/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import type { CampaignStats } from "@/types/database";

const requireConsultant = async () => {
  const user = await getSessionUser();
  if (!user || (user.role !== "consultant" && user.role !== "admin")) {
    redirect("/connexion");
  }
  return user;
};

// ─── Campaigns ──────────────────────────────────────────────

export const getMyBrevoLists = async () => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("consultant_brevo_lists")
    .select("*")
    .eq("consultant_id", user.id)
    .order("created_at", { ascending: true });

  return data ?? [];
};

export const getMyCampaigns = async () => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("consultant_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data;
};

export const getMyCampaign = async (id: string) => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  return data;
};

export const createMyCampaign = async (
  input: unknown
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireConsultant();
  const parsed = emailCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  // Verify the consultant has access to these lists
  const supabase = createAdminClient();
  const { data: assignedLists } = await supabase
    .from("consultant_brevo_lists")
    .select("brevo_list_id")
    .eq("consultant_id", user.id);

  const allowedIds = new Set(
    (assignedLists ?? []).map((l) => l.brevo_list_id)
  );
  const unauthorized = parsed.data.recipient_list_ids.filter(
    (id) => !allowedIds.has(id)
  );
  if (unauthorized.length > 0) {
    return {
      success: false,
      error: "Vous n'avez pas accès à certaines listes sélectionnées.",
    };
  }

  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({
      name: parsed.data.name,
      subject: parsed.data.subject,
      body_html: parsed.data.body_html,
      recipient_list_ids: parsed.data.recipient_list_ids,
      status: "draft",
      consultant_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: "Erreur lors de la création de la campagne.",
    };
  }

  revalidatePath("/espace-consultante/emails");
  return { success: true, data: { id: data.id } };
};

export const updateMyCampaign = async (
  id: string,
  input: unknown
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const parsed = emailCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("status, consultant_id")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  if (!campaign || campaign.status !== "draft") {
    return {
      success: false,
      error: "Seules les campagnes brouillon peuvent être modifiées.",
    };
  }

  // Verify list access
  const { data: assignedLists } = await supabase
    .from("consultant_brevo_lists")
    .select("brevo_list_id")
    .eq("consultant_id", user.id);

  const allowedIds = new Set(
    (assignedLists ?? []).map((l) => l.brevo_list_id)
  );
  const unauthorized = parsed.data.recipient_list_ids.filter(
    (listId) => !allowedIds.has(listId)
  );
  if (unauthorized.length > 0) {
    return {
      success: false,
      error: "Vous n'avez pas accès à certaines listes sélectionnées.",
    };
  }

  const { error } = await supabase
    .from("email_campaigns")
    .update({
      name: parsed.data.name,
      subject: parsed.data.subject,
      body_html: parsed.data.body_html,
      recipient_list_ids: parsed.data.recipient_list_ids,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }

  revalidatePath("/espace-consultante/emails");
  return { success: true };
};

export const sendMyCampaign = async (
  id: string
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  if (!campaign || campaign.status !== "draft") {
    return { success: false, error: "Cette campagne ne peut pas être envoyée." };
  }

  if (!campaign.body_html) {
    return { success: false, error: "Le contenu de la campagne est vide." };
  }

  // Get consultant info for sender name
  const { data: consultant } = await supabase
    .from("consultants")
    .select("profiles(first_name, last_name, email)")
    .eq("id", user.id)
    .single();

  const profiles = (consultant as unknown as { profiles: { first_name: string; last_name: string; email: string }[] | null })?.profiles;
  const profile = profiles?.[0] ?? null;
  const senderName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : "Question d'Allaitement";
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ?? "contact@questiondallaitement.com";

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

  const sendResult = await sendCampaignNow(brevoData.id);
  if (!sendResult.ok) {
    return { success: false, error: "Erreur lors de l'envoi sur Brevo." };
  }

  await supabase
    .from("email_campaigns")
    .update({
      brevo_campaign_id: String(brevoData.id),
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/espace-consultante/emails");
  return { success: true };
};

export const deleteMyCampaign = async (
  id: string
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("status")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  if (!campaign || campaign.status !== "draft") {
    return {
      success: false,
      error: "Seules les campagnes brouillon peuvent être supprimées.",
    };
  }

  const { error } = await supabase
    .from("email_campaigns")
    .delete()
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression." };
  }

  revalidatePath("/espace-consultante/emails");
  return { success: true };
};

export const refreshMyCampaignStats = async (
  id: string
): Promise<ActionResult<CampaignStats>> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("brevo_campaign_id")
    .eq("id", id)
    .eq("consultant_id", user.id)
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

  await supabase
    .from("email_campaigns")
    .update({ stats })
    .eq("id", id);

  revalidatePath("/espace-consultante/emails");
  return { success: true, data: stats };
};

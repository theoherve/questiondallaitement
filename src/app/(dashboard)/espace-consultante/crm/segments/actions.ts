"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { crmSegmentSchema } from "@/validations/crm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import type { CrmSegment, SegmentCondition } from "@/types/database";
import { loadClientStats, matchesConditions } from "@/lib/crm/segment-eval";
import type { SegmentClientStats } from "@/lib/crm/segment-eval";

const requireConsultant = async () => {
  const user = await getSessionUser();
  if (!user || (!user.roles.includes("consultant") && !user.roles.includes("admin")))
    redirect("/connexion");
  return user;
};

// ─── Segments CRUD ───────────────────────────────────────────

export const getSegments = async (): Promise<CrmSegment[]> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("crm_segments")
    .select("*")
    .eq("consultant_id", user.id)
    .order("name", { ascending: true });

  return (data ?? []) as CrmSegment[];
};

export const createSegment = async (
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireConsultant();
  const parsed = crmSegmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: segment, error } = await supabase
    .from("crm_segments")
    .insert({
      consultant_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color ?? "#6B7280",
      conditions: parsed.data.conditions,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création du segment" };
  }

  revalidatePath("/espace-consultante/crm/segments");
  return { success: true, data: segment };
};

export const updateSegment = async (
  segmentId: string,
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const parsed = crmSegmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_segments")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color ?? "#6B7280",
      conditions: parsed.data.conditions,
    })
    .eq("id", segmentId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/espace-consultante/crm/segments");
  return { success: true };
};

export const deleteSegment = async (segmentId: string): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("crm_segments")
    .delete()
    .eq("id", segmentId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/espace-consultante/crm/segments");
  return { success: true };
};

// ─── Segment Evaluation ──────────────────────────────────────

export type { SegmentClientStats } from "@/lib/crm/segment-eval";

/**
 * Recalcule le score de chaque cliente, que l'evaluateur partage laisse a 0 :
 * la RPC `calculate_client_score` prend le couple cliente-consultante, notion
 * qui n'existe pas hors du CRM.
 */
const withScores = async (
  consultantId: string,
  clients: SegmentClientStats[],
): Promise<SegmentClientStats[]> => {
  const supabase = createAdminClient();
  const scores = await Promise.all(
    clients.map((c) =>
      supabase.rpc("calculate_client_score", {
        p_client_id: c.id,
        p_consultant_id: consultantId,
      }),
    ),
  );
  return clients.map((c, i) => ({
    ...c,
    score: (scores[i]?.data as number | null) ?? 0,
  }));
};

export const evaluateSegment = async (
  segmentId: string,
): Promise<SegmentClientStats[]> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data: segment } = await supabase
    .from("crm_segments")
    .select("conditions")
    .eq("id", segmentId)
    .eq("consultant_id", user.id)
    .single();

  if (!segment) return [];

  const conditions = segment.conditions as SegmentCondition[];
  const stats = await loadClientStats({ consultantId: user.id });
  const matched = stats.filter((client) => matchesConditions(client, conditions));
  return withScores(user.id, matched);
};

/**
 * Evalue tous les segments d'une consultante en un seul chargement de stats.
 * A utiliser a la place de Promise.all(segments.map(evaluateSegment)) pour
 * eviter le pattern N+1.
 */
export const evaluateAllSegments = async (
  segments: { id: string; conditions: SegmentCondition[] }[],
): Promise<Map<string, number>> => {
  const user = await requireConsultant();

  if (segments.length === 0) return new Map();

  const stats = await loadClientStats({ consultantId: user.id });

  const counts = new Map<string, number>();
  for (const segment of segments) {
    counts.set(
      segment.id,
      stats.filter((client) => matchesConditions(client, segment.conditions))
        .length,
    );
  }
  return counts;
};

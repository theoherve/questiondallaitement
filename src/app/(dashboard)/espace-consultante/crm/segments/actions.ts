"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { crmSegmentSchema } from "@/validations/crm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import type { CrmSegment, SegmentCondition } from "@/types/database";

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

export type SegmentClientStats = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  booking_count: number;
  total_spent_cents: number;
  formation_count: number;
  event_count: number;
  inactive_days: number;
  days_since_registration: number;
  score: number;
};

export const evaluateSegment = async (
  segmentId: string,
): Promise<SegmentClientStats[]> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  // Load segment conditions
  const { data: segment } = await supabase
    .from("crm_segments")
    .select("conditions")
    .eq("id", segmentId)
    .eq("consultant_id", user.id)
    .single();

  if (!segment) return [];

  const conditions = segment.conditions as SegmentCondition[];
  const stats = await getConsultantClientStats(user.id);
  return stats.filter((client) => matchesConditions(client, conditions));
};

/**
 * Évalue tous les segments d'une consultante en un seul chargement de stats.
 * À utiliser à la place de Promise.all(segments.map(evaluateSegment)) pour
 * éviter le pattern N+1 (une requête getConsultantClientStats par segment).
 */
export const evaluateAllSegments = async (
  segments: { id: string; conditions: SegmentCondition[] }[],
): Promise<Map<string, number>> => {
  await requireConsultant();
  const user = await (async () => {
    const u = await getSessionUser();
    return u!;
  })();

  if (segments.length === 0) return new Map();

  // Stats chargées une seule fois pour tous les segments
  const stats = await getConsultantClientStats(user.id);

  const counts = new Map<string, number>();
  for (const segment of segments) {
    const matched = stats.filter((client) =>
      matchesConditions(client, segment.conditions),
    );
    counts.set(segment.id, matched.length);
  }
  return counts;
};

const matchesConditions = (
  client: SegmentClientStats,
  conditions: SegmentCondition[],
): boolean => {
  return conditions.every((cond) => {
    const val = client[cond.field as keyof SegmentClientStats] as number;
    switch (cond.op) {
      case ">=": return val >= cond.value;
      case "<=": return val <= cond.value;
      case "=":  return val === cond.value;
      case "!=": return val !== cond.value;
      default:   return false;
    }
  });
};

const getConsultantClientStats = async (
  consultantId: string,
): Promise<SegmentClientStats[]> => {
  const supabase = createAdminClient();

  // Get all client IDs for this consultant
  const [bookingsRes, formationIdsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("client_id, starts_at, status")
      .eq("consultant_id", consultantId)
      .not("status", "eq", "cancelled"),
    supabase
      .from("formations")
      .select("id")
      .eq("consultant_id", consultantId),
  ]);

  const consultantFormationIds =
    (formationIdsRes.data ?? []).map((f) => f.id);

  const enrollmentsRes =
    consultantFormationIds.length > 0
      ? await supabase
          .from("formation_enrollments")
          .select("client_id, enrolled_at")
          .in("formation_id", consultantFormationIds)
      : { data: [] };

  const allClientIds = [
    ...new Set([
      ...(bookingsRes.data ?? []).map((b) => b.client_id),
      ...(enrollmentsRes.data ?? []).map((e) => e.client_id),
    ]),
  ];

  if (allClientIds.length === 0) return [];

  const [profilesRes, paymentsRes, eventsRes, scoresArr] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, created_at")
      .in("id", allClientIds),
    supabase
      .from("payments")
      .select("client_id, amount_cents")
      .eq("consultant_id", consultantId)
      .eq("status", "succeeded")
      .in("client_id", allClientIds),
    supabase
      .from("event_registrations")
      .select("client_id")
      .eq("status", "confirmed")
      .in("client_id", allClientIds),
    Promise.all(
      allClientIds.map((id) =>
        supabase.rpc("calculate_client_score", {
          p_client_id: id,
          p_consultant_id: consultantId,
        }),
      ),
    ),
  ]);

  const scoreMap = new Map<string, number>();
  allClientIds.forEach((id, i) => {
    scoreMap.set(id, (scoresArr[i]?.data as number | null) ?? 0);
  });

  const bookingCountMap = new Map<string, number>();
  const lastActivityMap = new Map<string, Date>();
  for (const b of bookingsRes.data ?? []) {
    bookingCountMap.set(b.client_id, (bookingCountMap.get(b.client_id) ?? 0) + 1);
    const d = new Date(b.starts_at);
    if (!lastActivityMap.has(b.client_id) || d > lastActivityMap.get(b.client_id)!) {
      lastActivityMap.set(b.client_id, d);
    }
  }

  const totalSpentMap = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    totalSpentMap.set(p.client_id, (totalSpentMap.get(p.client_id) ?? 0) + p.amount_cents);
  }

  const formationCountMap = new Map<string, number>();
  for (const e of enrollmentsRes.data ?? []) {
    formationCountMap.set(e.client_id, (formationCountMap.get(e.client_id) ?? 0) + 1);
    const d = new Date(e.enrolled_at);
    if (!lastActivityMap.has(e.client_id) || d > lastActivityMap.get(e.client_id)!) {
      lastActivityMap.set(e.client_id, d);
    }
  }

  const eventCountMap = new Map<string, number>();
  for (const e of eventsRes.data ?? []) {
    eventCountMap.set(e.client_id, (eventCountMap.get(e.client_id) ?? 0) + 1);
  }

  const now = new Date();

  return (profilesRes.data ?? []).map((p) => {
    const lastActivity = lastActivityMap.get(p.id);
    const inactiveDays = lastActivity
      ? Math.floor((now.getTime() - lastActivity.getTime()) / 86400000)
      : 9999;
    const daysSinceReg = Math.floor(
      (now.getTime() - new Date(p.created_at).getTime()) / 86400000,
    );

    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      booking_count: bookingCountMap.get(p.id) ?? 0,
      total_spent_cents: totalSpentMap.get(p.id) ?? 0,
      formation_count: formationCountMap.get(p.id) ?? 0,
      event_count: eventCountMap.get(p.id) ?? 0,
      inactive_days: inactiveDays,
      days_since_registration: daysSinceReg,
      score: scoreMap.get(p.id) ?? 0,
    };
  });
};

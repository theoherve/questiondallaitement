import { createAdminClient } from "@/lib/supabase/admin";
import type { SegmentCondition } from "@/types/database";

export type SegmentClientStats = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  booking_count: number;
  total_spent_cents: number;
  accompagnement_count: number;
  formation_count: number;
  inactive_days: number;
  days_since_registration: number;
  score: number;
  tag_ids: string[];
  has_accompagnement: boolean;
};

const NUMERIC_FIELDS = new Set([
  "booking_count",
  "total_spent_cents",
  "accompagnement_count",
  "formation_count",
  "inactive_days",
  "days_since_registration",
]);

/**
 * Vrai quand la cliente satisfait **toutes** les conditions. Elles sont
 * combinées par ET : il n'y a pas de OU dans le modèle.
 *
 * Un champ inconnu fait échouer la condition plutôt que d'être sauté : un
 * segment corrompu ne doit pas s'élargir silencieusement à toute la base.
 */
export const matchesConditions = (
  client: SegmentClientStats,
  conditions: SegmentCondition[]
): boolean =>
  conditions.every((cond) => {
    if (cond.field === "has_tag") {
      const present = client.tag_ids.includes(cond.value);
      return cond.op === "=" ? present : !present;
    }

    if (cond.field === "has_accompagnement") {
      return cond.op === "="
        ? client.has_accompagnement === cond.value
        : client.has_accompagnement !== cond.value;
    }

    if (!NUMERIC_FIELDS.has(cond.field)) return false;

    const val = client[cond.field] as number;
    switch (cond.op) {
      case ">=":
        return val >= cond.value;
      case "<=":
        return val <= cond.value;
      case "=":
        return val === cond.value;
      case "!=":
        return val !== cond.value;
      default:
        return false;
    }
  });

type LoadOptions = {
  /**
   * Restreint aux clientes de cette consultante. Omis, la fonction couvre
   * toutes les clientes : c'est le mode du ciblage des notifications, qui n'a
   * ni session ni consultante de référence.
   */
  consultantId?: string;
};

/**
 * Charge les statistiques nécessaires à l'évaluation des segments.
 *
 * Volontairement sans session : cette fonction est appelée aussi bien depuis
 * une server action du CRM que depuis un envoi de notification déclenché par
 * un cron, où il n'y a personne de connecté.
 */
export const loadClientStats = async (
  options: LoadOptions = {}
): Promise<SegmentClientStats[]> => {
  const supabase = createAdminClient();
  const { consultantId } = options;

  let bookingsQuery = supabase
    .from("bookings")
    .select("client_id, starts_at, status")
    .not("status", "eq", "cancelled");
  if (consultantId) {
    bookingsQuery = bookingsQuery.eq("consultant_id", consultantId);
  }

  let accompagnementsQuery = supabase.from("accompagnements").select("id");
  if (consultantId) {
    accompagnementsQuery = accompagnementsQuery.eq(
      "consultant_id",
      consultantId
    );
  }

  const [bookingsRes, accompagnementIdsRes] = await Promise.all([
    bookingsQuery,
    accompagnementsQuery,
  ]);

  const accompagnementIds = (accompagnementIdsRes.data ?? []).map((a) => a.id);

  const enrollmentsRes =
    accompagnementIds.length > 0
      ? await supabase
          .from("accompagnement_enrollments")
          .select("client_id, enrolled_at")
          .in("accompagnement_id", accompagnementIds)
      : { data: [] as { client_id: string; enrolled_at: string }[] };

  const clientIds = [
    ...new Set([
      ...(bookingsRes.data ?? []).map((b) => b.client_id),
      ...(enrollmentsRes.data ?? []).map((e) => e.client_id),
    ]),
  ];

  if (clientIds.length === 0) return [];

  const paymentsQuery = consultantId
    ? supabase
        .from("payments")
        .select("client_id, amount_cents")
        .eq("consultant_id", consultantId)
        .eq("status", "succeeded")
        .in("client_id", clientIds)
    : supabase
        .from("payments")
        .select("client_id, amount_cents")
        .eq("status", "succeeded")
        .in("client_id", clientIds);

  const [profilesRes, paymentsRes, eventsRes, tagsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, created_at")
      .in("id", clientIds)
      .is("deleted_at", null),
    paymentsQuery,
    supabase
      .from("formation_registrations")
      .select("client_id")
      .eq("status", "confirmed")
      .in("client_id", clientIds),
    supabase
      .from("crm_contact_tags")
      .select("client_id, tag_id")
      .in("client_id", clientIds),
  ]);

  const bookingCount = new Map<string, number>();
  const lastActivity = new Map<string, Date>();
  for (const b of bookingsRes.data ?? []) {
    bookingCount.set(b.client_id, (bookingCount.get(b.client_id) ?? 0) + 1);
    const d = new Date(b.starts_at);
    if (!lastActivity.has(b.client_id) || d > lastActivity.get(b.client_id)!) {
      lastActivity.set(b.client_id, d);
    }
  }

  const totalSpent = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    totalSpent.set(
      p.client_id,
      (totalSpent.get(p.client_id) ?? 0) + p.amount_cents
    );
  }

  const accompagnementCount = new Map<string, number>();
  for (const e of enrollmentsRes.data ?? []) {
    accompagnementCount.set(
      e.client_id,
      (accompagnementCount.get(e.client_id) ?? 0) + 1
    );
    const d = new Date(e.enrolled_at);
    if (!lastActivity.has(e.client_id) || d > lastActivity.get(e.client_id)!) {
      lastActivity.set(e.client_id, d);
    }
  }

  const formationCount = new Map<string, number>();
  for (const e of eventsRes.data ?? []) {
    formationCount.set(e.client_id, (formationCount.get(e.client_id) ?? 0) + 1);
  }

  const tagIds = new Map<string, string[]>();
  for (const t of tagsRes.data ?? []) {
    tagIds.set(t.client_id, [...(tagIds.get(t.client_id) ?? []), t.tag_id]);
  }

  const now = Date.now();

  return (profilesRes.data ?? []).map((p) => {
    const last = lastActivity.get(p.id);
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      booking_count: bookingCount.get(p.id) ?? 0,
      total_spent_cents: totalSpent.get(p.id) ?? 0,
      accompagnement_count: accompagnementCount.get(p.id) ?? 0,
      formation_count: formationCount.get(p.id) ?? 0,
      inactive_days: last ? Math.floor((now - last.getTime()) / 86400000) : 9999,
      days_since_registration: Math.floor(
        (now - new Date(p.created_at).getTime()) / 86400000
      ),
      // Le score n'est calculable que pour une consultante donnee : la RPC
      // `calculate_client_score` prend les deux identifiants. Hors contexte
      // consultante il vaut 0, et le CRM le recalcule de son cote.
      score: 0,
      tag_ids: tagIds.get(p.id) ?? [],
      has_accompagnement: (accompagnementCount.get(p.id) ?? 0) > 0,
    };
  });
};

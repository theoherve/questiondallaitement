"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import {
  startOfMonth,
  subMonths,
  format,
  differenceInMonths,
} from "date-fns";
import { fr } from "date-fns/locale";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

// ─── Funnel ──────────────────────────────────────────────────

export type FunnelStep = {
  label: string;
  count: number;
  conversionFromPrev: number | null; // %
};

export const getFunnelData = async (): Promise<FunnelStep[]> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const [clientsRes, allOrdersRes, activeRes] = await Promise.all([
    // Total clients inscrits
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .contains("roles", ["client"]),

    // Tous les paiements réussis (réutilisé pour ≥1 et ≥2)
    supabase
      .from("payments")
      .select("client_id")
      .eq("status", "succeeded"),

    // Clients actifs (au moins 1 paiement dans les 30 derniers jours)
    supabase
      .from("payments")
      .select("client_id")
      .eq("status", "succeeded")
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      ),
  ]);

  const totalClients = clientsRes.count ?? 0;

  const allOrders = (allOrdersRes.data ?? []).filter((p) => p.client_id);

  const oneOrderSet = new Set(allOrders.map((p) => p.client_id));

  const twoOrdersSet = new Set(
    Object.entries(
      allOrders.reduce<Record<string, number>>((acc, p) => {
        acc[p.client_id] = (acc[p.client_id] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .filter(([, count]) => count >= 2)
      .map(([id]) => id),
  );

  const activeSet = new Set(
    (activeRes.data ?? []).map((p) => p.client_id).filter(Boolean),
  );

  const steps: { label: string; count: number }[] = [
    { label: "Clients inscrits", count: totalClients },
    { label: "Au moins 1 achat", count: oneOrderSet.size },
    { label: "Au moins 2 achats", count: twoOrdersSet.size },
    { label: "Actif (30 derniers jours)", count: activeSet.size },
  ];

  return steps.map((step, i) => ({
    ...step,
    conversionFromPrev:
      i === 0 || steps[i - 1].count === 0
        ? null
        : Math.round((step.count / steps[i - 1].count) * 100),
  }));
};

// ─── Rétention ───────────────────────────────────────────────

export type RetentionRow = {
  cohort: string; // "janv. 2025"
  cohortSize: number;
  months: (number | null)[]; // % rétention pour M+0, M+1, ..., M+N
};

export const getRetentionData = async (
  monthsBack: number = 12,
): Promise<RetentionRow[]> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const now = new Date();
  const rows: RetentionRow[] = [];

  // Load all payments to avoid N+1
  const { data: allPayments } = await supabase
    .from("payments")
    .select("client_id, created_at")
    .eq("status", "succeeded")
    .gte(
      "created_at",
      subMonths(startOfMonth(now), monthsBack).toISOString(),
    );

  // Load client registrations
  const { data: allClients } = await supabase
    .from("profiles")
    .select("id, created_at")
    .contains("roles", ["client"])
    .gte(
      "created_at",
      subMonths(startOfMonth(now), monthsBack).toISOString(),
    );

  if (!allClients || allClients.length === 0) return [];

  // Group clients by cohort (month of registration)
  const cohortMap = new Map<
    string,
    { cohortDate: Date; clientIds: string[] }
  >();

  for (const client of allClients) {
    const cohortDate = startOfMonth(new Date(client.created_at));
    const key = cohortDate.toISOString();
    if (!cohortMap.has(key)) {
      cohortMap.set(key, { cohortDate, clientIds: [] });
    }
    cohortMap.get(key)!.clientIds.push(client.id);
  }

  // For each cohort, calculate retention per month
  const sortedCohorts = [...cohortMap.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [, { cohortDate, clientIds }] of sortedCohorts) {
    const clientSet = new Set(clientIds);
    const maxMonths = differenceInMonths(now, cohortDate);
    const monthRetention: (number | null)[] = [];

    for (let m = 0; m <= Math.min(maxMonths, monthsBack - 1); m++) {
      const monthStart = startOfMonth(
        new Date(cohortDate.getFullYear(), cohortDate.getMonth() + m, 1),
      );
      const monthEnd = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        1,
      );

      const activeInMonth = new Set(
        (allPayments ?? [])
          .filter((p) => {
            const d = new Date(p.created_at);
            return (
              d >= monthStart &&
              d < monthEnd &&
              clientSet.has(p.client_id)
            );
          })
          .map((p) => p.client_id),
      );

      monthRetention.push(
        clientIds.length > 0
          ? Math.round((activeInMonth.size / clientIds.length) * 100)
          : null,
      );
    }

    rows.push({
      cohort: format(cohortDate, "MMM yyyy", { locale: fr }),
      cohortSize: clientIds.length,
      months: monthRetention,
    });
  }

  return rows;
};

// ─── LTV ─────────────────────────────────────────────────────

export type LtvSummary = {
  avgLtv: number;
  totalRevenue: number;
  activeClientsCount: number;
};

export type LtvClient = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  total_spent_cents: number;
  booking_count: number;
  formation_count: number;
  last_activity: string | null;
};

export type LtvData = {
  summary: LtvSummary;
  topClients: LtvClient[];
};

export const getLtvData = async (): Promise<LtvData> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("client_id, amount_cents, created_at")
    .eq("status", "succeeded");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("client_id")
    .eq("status", "completed");

  const { data: enrollments } = await supabase
    .from("formation_enrollments")
    .select("client_id");

  const clientRevenue = new Map<string, number>();
  const lastActivity = new Map<string, string>();

  for (const p of payments ?? []) {
    if (!p.client_id) continue;
    clientRevenue.set(
      p.client_id,
      (clientRevenue.get(p.client_id) ?? 0) + p.amount_cents,
    );
    if (
      !lastActivity.has(p.client_id) ||
      p.created_at > lastActivity.get(p.client_id)!
    ) {
      lastActivity.set(p.client_id, p.created_at);
    }
  }

  const bookingCount = new Map<string, number>();
  for (const b of bookings ?? []) {
    bookingCount.set(b.client_id, (bookingCount.get(b.client_id) ?? 0) + 1);
  }

  const formationCount = new Map<string, number>();
  for (const e of enrollments ?? []) {
    formationCount.set(e.client_id, (formationCount.get(e.client_id) ?? 0) + 1);
  }

  const allClientIds = [...clientRevenue.keys()];
  if (allClientIds.length === 0) {
    return {
      summary: { avgLtv: 0, totalRevenue: 0, activeClientsCount: 0 },
      topClients: [],
    };
  }

  // Get top 20 clients by revenue
  const top20Ids = [...clientRevenue.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([id]) => id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", top20Ids);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  const totalRevenue = [...clientRevenue.values()].reduce((a, b) => a + b, 0);
  const avgLtv =
    allClientIds.length > 0
      ? Math.round(totalRevenue / allClientIds.length)
      : 0;

  const topClients: LtvClient[] = top20Ids
    .map((id) => {
      const profile = profileMap.get(id);
      if (!profile) return null;
      return {
        id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        total_spent_cents: clientRevenue.get(id) ?? 0,
        booking_count: bookingCount.get(id) ?? 0,
        formation_count: formationCount.get(id) ?? 0,
        last_activity: lastActivity.get(id) ?? null,
      };
    })
    .filter(Boolean) as LtvClient[];

  return {
    summary: {
      avgLtv,
      totalRevenue,
      activeClientsCount: allClientIds.length,
    },
    topClients,
  };
};

import { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RevenueBreakdownChart } from "@/components/dashboard/revenue-breakdown-chart";
import { RankingChart } from "@/components/dashboard/ranking-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Euro,
  BookOpen,
  CalendarDays,
  TrendingUp,
  Trophy,
  Activity,
  ShieldCheck,
  ArrowRight,
  PieChart,
} from "lucide-react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { UpcomingBookings } from "./_components/upcoming-bookings";
import { RecentActivity, type ActivityItem } from "./_components/recent-activity";
import { ConsultantStatus } from "./_components/consultant-status";
import { PaymentAlerts } from "./_components/payment-alerts";

export const metadata: Metadata = {
  title: "Administration",
};

const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const computeTrend = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
};

const AdminDashboardPage = async () => {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.roles.includes("admin")) {
    return null;
  }
  const supabase = createAdminClient();

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);

  // ── Fetch all data in parallel ──────────────────────────────
  const [
    // Current period (30d)
    currentClientsRes,
    currentPaymentsRes,
    currentBookingsRes,
    currentEnrollmentsRes,
    // Previous period (60d-30d) for trends
    prevClientsRes,
    prevPaymentsRes,
    prevBookingsRes,
    // Totals
    totalClientsRes,
    totalFormationsRes,
    allPaymentsRes,
    // Upcoming bookings
    upcomingBookingsRes,
    // Recent clients
    recentClientsRes,
    // Recent payments
    recentPaymentsRes,
    // Consultant status
    allConsultantsRes,
    consultantsWithAvailRes,
    // Payment alerts
    pendingPaymentsRes,
    failedPaymentsRes,
    // Top accompagnements (30d)
    topFormationsPaymentsRes,
  ] = await Promise.all([
    // Current 30d clients
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .contains("roles", ["client"])
      .is("deleted_at", null)
      .gte("created_at", thirtyDaysAgo.toISOString()),
    // Current 30d payments
    supabase
      .from("payments")
      .select("platform_fee_cents, amount_cents, created_at, type")
      .eq("status", "succeeded")
      .gte("created_at", thirtyDaysAgo.toISOString()),
    // Current 30d bookings
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .not("status", "eq", "cancelled")
      .gte("created_at", thirtyDaysAgo.toISOString()),
    // Current 30d enrollments
    supabase
      .from("accompagnement_enrollments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    // Prev 30d clients
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .contains("roles", ["client"])
      .is("deleted_at", null)
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    // Prev 30d payments
    supabase
      .from("payments")
      .select("platform_fee_cents")
      .eq("status", "succeeded")
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    // Prev 30d bookings
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .not("status", "eq", "cancelled")
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    // Total clients
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .contains("roles", ["client"])
      .is("deleted_at", null),
    // Published formations
    supabase
      .from("accompagnements")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null),
    // All-time payments (revenue + breakdown by type)
    supabase
      .from("payments")
      .select("platform_fee_cents, amount_cents, type")
      .eq("status", "succeeded"),
    // Upcoming bookings (next 7 days)
    supabase
      .from("bookings")
      .select(
        "id, starts_at, status, client_id, consultant_id, consultation_type_id"
      )
      .in("status", ["confirmed", "pending"])
      .gte("starts_at", now.toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
    // Recent clients (last 7 days)
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, created_at")
      .contains("roles", ["client"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    // Recent payments
    supabase
      .from("payments")
      .select("id, amount_cents, type, created_at, client_id")
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(5),
    // All consultants (for status breakdown)
    supabase
      .from("consultants")
      .select("id, is_active, stripe_account_status"),
    // Consultants with availabilities
    supabase
      .from("availabilities")
      .select("consultant_id")
      .eq("is_active", true),
    // Pending payments
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    // Failed payments
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    // Top formations payments (30d)
    supabase
      .from("payments")
      .select("reference_id, amount_cents")
      .eq("type", "accompagnement")
      .eq("status", "succeeded")
      .gte("created_at", thirtyDaysAgo.toISOString()),
  ]);

  // ── Compute stats ─────────────────────────────────────────
  const totalClients = totalClientsRes.count ?? 0;
  const formationsPublished = totalFormationsRes.count ?? 0;
  const totalRevenue = (allPaymentsRes.data ?? []).reduce(
    (sum, p) => sum + p.platform_fee_cents,
    0
  );

  // Current vs previous for trends
  const currentNewClients = currentClientsRes.count ?? 0;
  const prevNewClients = prevClientsRes.count ?? 0;

  const currentRevenue = (currentPaymentsRes.data ?? []).reduce(
    (sum, p) => sum + p.platform_fee_cents,
    0
  );
  const prevRevenue = (prevPaymentsRes.data ?? []).reduce(
    (sum, p) => sum + p.platform_fee_cents,
    0
  );

  const currentBookings = currentBookingsRes.count ?? 0;
  const prevBookings = prevBookingsRes.count ?? 0;

  const currentEnrollments = currentEnrollmentsRes.count ?? 0;

  // ── Revenue chart (30d) ───────────────────────────────────
  const revenueByDay = new Map<string, number>();
  for (const day of eachDayOfInterval({ start: thirtyDaysAgo, end: now })) {
    revenueByDay.set(format(day, "yyyy-MM-dd"), 0);
  }
  for (const p of currentPaymentsRes.data ?? []) {
    const key = format(new Date(p.created_at), "yyyy-MM-dd");
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + p.platform_fee_cents);
  }
  const chartData = Array.from(revenueByDay.entries()).map(([key, revenue]) => ({
    label: format(new Date(key), "d MMM", { locale: fr }),
    revenue,
  }));

  // ── Revenue breakdown by type ─────────────────────────────
  const typeLabels: Record<string, string> = {
    accompagnement: "Accompagnements",
    booking: "Consultations",
    formation: "Formations",
  };
  const revenueByType = new Map<string, number>();
  for (const p of allPaymentsRes.data ?? []) {
    const label = typeLabels[p.type] ?? p.type;
    revenueByType.set(label, (revenueByType.get(label) ?? 0) + p.amount_cents);
  }
  const breakdownData = Array.from(revenueByType.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Upcoming bookings with names ──────────────────────────
  const rawBookings = upcomingBookingsRes.data ?? [];
  let upcomingBookings: {
    id: string;
    starts_at: string;
    status: string;
    client_name: string;
    consultant_name: string;
    consultation_title: string;
  }[] = [];

  if (rawBookings.length > 0) {
    const clientIds = [...new Set(rawBookings.map((b) => b.client_id))];
    const consultantIds = [
      ...new Set(rawBookings.map((b) => b.consultant_id)),
    ];
    const typeIds = [
      ...new Set(rawBookings.map((b) => b.consultation_type_id)),
    ];

    const [clientsRes, consultantsNamesRes, typesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", clientIds),
      supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", consultantIds),
      supabase.from("consultation_types").select("id, title").in("id", typeIds),
    ]);

    const clientMap = new Map(
      (clientsRes.data ?? []).map((p) => [
        p.id,
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Client",
      ])
    );
    const consultantMap = new Map(
      (consultantsNamesRes.data ?? []).map((p) => [
        p.id,
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Consultante",
      ])
    );
    const typeMap = new Map(
      (typesRes.data ?? []).map((t) => [t.id, t.title])
    );

    upcomingBookings = rawBookings.map((b) => ({
      id: b.id,
      starts_at: b.starts_at,
      status: b.status,
      client_name: clientMap.get(b.client_id) ?? "Client",
      consultant_name: consultantMap.get(b.consultant_id) ?? "Consultante",
      consultation_title: typeMap.get(b.consultation_type_id) ?? "Consultation",
    }));
  }

  // ── Recent activity feed ──────────────────────────────────
  const activityItems: ActivityItem[] = [];

  for (const c of recentClientsRes.data ?? []) {
    activityItems.push({
      id: `client-${c.id}`,
      type: "new_client",
      label: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email,
      detail: "Nouveau client inscrit",
      created_at: c.created_at,
    });
  }

  for (const p of recentPaymentsRes.data ?? []) {
    activityItems.push({
      id: `payment-${p.id}`,
      type: "payment",
      label: `${formatCurrency(p.amount_cents)}`,
      detail: typeLabels[p.type] ?? p.type,
      created_at: p.created_at,
    });
  }

  activityItems.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const recentActivity = activityItems.slice(0, 8);

  // ── Consultant status ─────────────────────────────────────
  const allConsultants = allConsultantsRes.data ?? [];
  const uniqueWithAvail = new Set(
    (consultantsWithAvailRes.data ?? []).map((a) => a.consultant_id)
  );
  const consultantStatus = {
    total: allConsultants.length,
    active: allConsultants.filter((c) => c.is_active).length,
    inactive: allConsultants.filter((c) => !c.is_active).length,
    stripeConnected: allConsultants.filter(
      (c) => c.stripe_account_status === "active"
    ).length,
    stripePending: allConsultants.filter(
      (c) => c.stripe_account_status !== "active"
    ).length,
    withAvailabilities: uniqueWithAvail.size,
  };

  // ── Top accompagnements (30d) ──────────────────────────────────
  const formationRevenueMap = new Map<string, number>();
  for (const p of topFormationsPaymentsRes.data ?? []) {
    if (!p.reference_id) continue;
    formationRevenueMap.set(
      p.reference_id,
      (formationRevenueMap.get(p.reference_id) ?? 0) + p.amount_cents
    );
  }
  const topFormationIds = Array.from(formationRevenueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let topFormationsData: { name: string; value: number }[] = [];
  if (topFormationIds.length > 0) {
    const { data: formations } = await supabase
      .from("accompagnements")
      .select("id, title")
      .in(
        "id",
        topFormationIds.map(([id]) => id)
      );
    const titleMap = new Map(
      (formations ?? []).map((f) => [f.id, f.title])
    );
    topFormationsData = topFormationIds.map(([id, revenue]) => ({
      name: titleMap.get(id) ?? "Accompagnement supprimé",
      value: revenue,
    }));
  }

  // ── Payment alerts ────────────────────────────────────────
  const paymentAlerts = {
    pending: pendingPaymentsRes.count ?? 0,
    failed: failedPaymentsRes.count ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Tableau de bord
        </h1>
        <Link
          href="/admin/analytics"
          className="flex items-center gap-1 text-sm text-primary-red hover:underline"
        >
          Analytics détaillées
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Payment alerts */}
      {(paymentAlerts.pending > 0 || paymentAlerts.failed > 0) && (
        <PaymentAlerts data={paymentAlerts} />
      )}

      {/* KPI cards with trends */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenus plateforme"
          value={formatCurrency(totalRevenue)}
          icon={Euro}
          trend={computeTrend(currentRevenue, prevRevenue)}
          trendLabel="vs 30j préc."
        />
        <StatCard
          title="Total clients"
          value={totalClients}
          icon={Users}
          trend={computeTrend(currentNewClients, prevNewClients)}
          trendLabel="nouveaux"
        />
        <StatCard
          title="Consultations (30j)"
          value={currentBookings}
          icon={CalendarDays}
          trend={computeTrend(currentBookings, prevBookings)}
          trendLabel="vs 30j préc."
        />
        <StatCard
          title="Accompagnements publiés"
          value={formationsPublished}
          description={`${currentEnrollments} inscription${currentEnrollments > 1 ? "s" : ""} ce mois`}
          icon={BookOpen}
        />
      </div>

      {/* Revenue chart + breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <TrendingUp className="h-5 w-5" />
              Commissions — 30 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <PieChart className="h-5 w-5" />
              Répartition CA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueBreakdownChart data={breakdownData} />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming bookings + recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <CalendarDays className="h-5 w-5" />
              Prochaines consultations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingBookings bookings={upcomingBookings} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Activity className="h-5 w-5" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity items={recentActivity} />
          </CardContent>
        </Card>
      </div>

      {/* Top formations + consultant status */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Trophy className="h-5 w-5" />
              Top accompagnements (30j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankingChart
              data={topFormationsData}
              format="currency"
              label="CA brut"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <ShieldCheck className="h-5 w-5" />
              Statut consultantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConsultantStatus data={consultantStatus} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

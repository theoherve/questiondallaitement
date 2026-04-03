import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Euro,
  Users,
  BookOpen,
  CalendarDays,
  TrendingUp,
  Trophy,
  Filter,
  BarChart2,
  Repeat,
} from "lucide-react";
import { format, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { getDateRange } from "@/lib/date-range";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RankingChart } from "@/components/dashboard/ranking-chart";
import { getFunnelData, getRetentionData, getLtvData } from "@/actions/analytics-advanced";
import { FunnelChart } from "./_components/funnel-chart";
import { RetentionHeatmap } from "./_components/retention-heatmap";
import { LtvTable } from "./_components/ltv-table";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Analytics — Administration",
};

const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const TABS = [
  { id: "revenus", label: "Revenus", icon: TrendingUp },
  { id: "funnel", label: "Funnel", icon: Filter },
  { id: "retention", label: "Rétention", icon: Repeat },
  { id: "ltv", label: "Clients (LTV)", icon: BarChart2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

const AdminAnalyticsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string }>;
}) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.roles.includes("admin")) redirect("/connexion");

  const params = await searchParams;
  const activeTab: TabId =
    (params.tab as TabId | undefined) ?? "revenus";
  const isValidTab = TABS.some((t) => t.id === activeTab);
  const tab: TabId = isValidTab ? activeTab : "revenus";
  const supabase = createAdminClient();
  const period = params.period || "30d";
  const { start, end, groupBy } = getDateRange(period);

  // Fetch advanced analytics only for the relevant tab
  const [funnelData, retentionData, ltvData] = await Promise.all([
    tab === "funnel" ? getFunnelData() : Promise.resolve(null),
    tab === "retention" ? getRetentionData() : Promise.resolve(null),
    tab === "ltv" ? getLtvData() : Promise.resolve(null),
  ]);

  // ── Fetch all data in parallel ────────────────────────────
  const [
    allPaymentsRes,
    periodPaymentsRes,
    totalClientsRes,
    totalConsultantesRes,
    totalFormationsRes,
    totalBookingsRes,
    periodBookingsRes,
    formationRevenueRes,
    consultantRevenueRes,
  ] = await Promise.all([
    // All-time platform fees
    supabase
      .from("payments")
      .select("platform_fee_cents")
      .eq("status", "succeeded"),
    // Period payments (for chart + period total)
    supabase
      .from("payments")
      .select("platform_fee_cents, amount_cents, created_at")
      .eq("status", "succeeded")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString()),
    // Total clients
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .contains("roles", ["client"])
      .is("deleted_at", null),
    // Total active consultantes
    supabase
      .from("consultants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    // Published formations
    supabase
      .from("formations")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null),
    // All-time bookings
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .not("status", "eq", "cancelled"),
    // Period bookings
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .not("status", "eq", "cancelled")
      .gte("starts_at", start.toISOString())
      .lte("starts_at", end.toISOString()),
    // Top formations by revenue (all time)
    supabase
      .from("payments")
      .select("reference_id, amount_cents, platform_fee_cents")
      .eq("type", "formation")
      .eq("status", "succeeded"),
    // Top consultants by revenue (all time)
    supabase
      .from("payments")
      .select("consultant_id, amount_cents, platform_fee_cents")
      .eq("status", "succeeded"),
  ]);

  // ── Compute stats ─────────────────────────────────────────
  const totalPlatformRevenue = (allPaymentsRes.data ?? []).reduce(
    (sum, p) => sum + p.platform_fee_cents,
    0,
  );
  const periodPayments = periodPaymentsRes.data ?? [];
  const periodPlatformRevenue = periodPayments.reduce(
    (sum, p) => sum + p.platform_fee_cents,
    0,
  );
  const periodGrossRevenue = periodPayments.reduce(
    (sum, p) => sum + p.amount_cents,
    0,
  );

  // ── Build revenue chart (platform fees over time) ─────────
  const revenueByBucket = new Map<string, number>();

  if (groupBy === "day") {
    for (const day of eachDayOfInterval({ start, end })) {
      revenueByBucket.set(format(day, "yyyy-MM-dd"), 0);
    }
    for (const p of periodPayments) {
      const key = format(new Date(p.created_at), "yyyy-MM-dd");
      revenueByBucket.set(
        key,
        (revenueByBucket.get(key) ?? 0) + p.platform_fee_cents,
      );
    }
  } else {
    for (const month of eachMonthOfInterval({ start, end })) {
      revenueByBucket.set(format(month, "yyyy-MM"), 0);
    }
    for (const p of periodPayments) {
      const key = format(new Date(p.created_at), "yyyy-MM");
      revenueByBucket.set(
        key,
        (revenueByBucket.get(key) ?? 0) + p.platform_fee_cents,
      );
    }
  }

  const chartData = Array.from(revenueByBucket.entries()).map(
    ([key, revenue]) => ({
      label:
        groupBy === "day"
          ? format(new Date(key), "d MMM", { locale: fr })
          : format(new Date(key + "-01"), "MMM yyyy", { locale: fr }),
      revenue,
    }),
  );

  // ── Top formations ────────────────────────────────────────
  const formationRevenueMap = new Map<string, number>();
  for (const p of formationRevenueRes.data ?? []) {
    if (!p.reference_id) continue;
    formationRevenueMap.set(
      p.reference_id,
      (formationRevenueMap.get(p.reference_id) ?? 0) + p.amount_cents,
    );
  }

  const topFormationIds = Array.from(formationRevenueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let topFormationsData: { name: string; value: number }[] = [];
  if (topFormationIds.length > 0) {
    const { data: formations } = await supabase
      .from("formations")
      .select("id, title")
      .in(
        "id",
        topFormationIds.map(([id]) => id),
      );

    const titleMap = new Map(
      (formations ?? []).map((f) => [f.id, f.title]),
    );

    topFormationsData = topFormationIds.map(([id, revenue]) => ({
      name: titleMap.get(id) ?? "Formation supprimée",
      value: revenue,
    }));
  }

  // ── Top consultants ───────────────────────────────────────
  const consultantRevenueMap = new Map<string, number>();
  for (const p of consultantRevenueRes.data ?? []) {
    if (!p.consultant_id) continue;
    consultantRevenueMap.set(
      p.consultant_id,
      (consultantRevenueMap.get(p.consultant_id) ?? 0) +
        (p.amount_cents - p.platform_fee_cents),
    );
  }

  const topConsultantIds = Array.from(consultantRevenueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let topConsultantsData: { name: string; value: number }[] = [];
  if (topConsultantIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in(
        "id",
        topConsultantIds.map(([id]) => id),
      );

    const nameMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Sans nom",
      ]),
    );

    topConsultantsData = topConsultantIds.map(([id, revenue]) => ({
      name: nameMap.get(id) ?? "Inconnue",
      value: revenue,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Analytics plateforme
        </h1>
        {tab === "revenus" && <PeriodSelector />}
      </div>

      {/* Tabs nav */}
      <div className="flex gap-1 border-b">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/admin/analytics?tab=${id}${id === "revenus" ? `&period=${period}` : ""}`}
            className={[
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === id
                ? "border-primary-green text-primary-green"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* ── TAB: Revenus ─────────────────────────────────────── */}
      {tab === "revenus" && (
        <>
      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Commissions totales"
          value={formatCurrency(totalPlatformRevenue)}
          icon={Euro}
        />
        <StatCard
          title="Consultantes actives"
          value={totalConsultantesRes.count ?? 0}
          icon={Users}
        />
        <StatCard
          title="Formations publiées"
          value={totalFormationsRes.count ?? 0}
          icon={BookOpen}
        />
        <StatCard
          title="Consultations"
          value={totalBookingsRes.count ?? 0}
          description={`${periodBookingsRes.count ?? 0} sur la période`}
          icon={CalendarDays}
        />
      </div>

      {/* Period summary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="CA brut (période)"
          value={formatCurrency(periodGrossRevenue)}
          icon={TrendingUp}
        />
        <StatCard
          title="Commissions (période)"
          value={formatCurrency(periodPlatformRevenue)}
          icon={Euro}
        />
        <StatCard
          title="Clients inscrits"
          value={totalClientsRes.count ?? 0}
          icon={Users}
        />
      </div>

      {/* Platform revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <TrendingUp className="h-5 w-5" />
            Commissions plateforme sur la période
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Trophy className="h-5 w-5" />
              Top formations (CA brut)
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
              <Trophy className="h-5 w-5" />
              Top consultantes (revenus nets)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankingChart
              data={topConsultantsData}
              format="currency"
              label="Revenus nets"
            />
          </CardContent>
        </Card>
      </div>
        </>
      )}

      {/* ── TAB: Funnel ──────────────────────────────────────── */}
      {tab === "funnel" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Filter className="h-5 w-5" />
              Funnel de conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnelData ?? []} />
          </CardContent>
        </Card>
      )}

      {/* ── TAB: Rétention ───────────────────────────────────── */}
      {tab === "retention" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Repeat className="h-5 w-5" />
              Rétention par cohorte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RetentionHeatmap data={retentionData ?? []} />
          </CardContent>
        </Card>
      )}

      {/* ── TAB: LTV ─────────────────────────────────────────── */}
      {tab === "ltv" && ltvData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <BarChart2 className="h-5 w-5" />
              Valeur vie client (LTV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LtvTable data={ltvData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;

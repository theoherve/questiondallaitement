import { Metadata } from "next";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Euro,
  CalendarDays,
  GraduationCap,
  Users,
  TrendingUp,
} from "lucide-react";
import { format, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { getDateRange } from "@/lib/date-range";
import { RevenueChart } from "@/components/dashboard/revenue-chart";

export const metadata: Metadata = {
  title: "Analytics",
};

const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const ConsultantAnalyticsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) => {
  const params = await searchParams;
  const { supabase, user } = await getSupabaseAndUser();
  const period = params.period || "30d";
  const { start, end, groupBy } = getDateRange(period);

  // ── Fetch all data in parallel ────────────────────────────
  const [
    allPaymentsRes,
    periodPaymentsRes,
    totalBookingsRes,
    periodBookingsRes,
    totalEnrollmentsRes,
    periodEnrollmentsRes,
    uniqueClientsRes,
  ] = await Promise.all([
    // Total revenue (all time)
    supabase
      .from("payments")
      .select("amount_cents, platform_fee_cents")
      .eq("consultant_id", user.id)
      .eq("status", "succeeded"),
    // Revenue in period
    supabase
      .from("payments")
      .select("amount_cents, platform_fee_cents, created_at")
      .eq("consultant_id", user.id)
      .eq("status", "succeeded")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString()),
    // Total bookings
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("consultant_id", user.id)
      .not("status", "eq", "cancelled"),
    // Bookings in period
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("consultant_id", user.id)
      .not("status", "eq", "cancelled")
      .gte("starts_at", start.toISOString())
      .lte("starts_at", end.toISOString()),
    // Total enrollments
    supabase
      .from("accompagnement_enrollments")
      .select("accompagnement_id", { count: "exact", head: true })
      .in(
        "accompagnement_id",
        (
          await supabase
            .from("accompagnements")
            .select("id")
            .eq("consultant_id", user.id)
        ).data?.map((f) => f.id) ?? [],
      ),
    // Enrollments in period
    supabase
      .from("accompagnement_enrollments")
      .select("accompagnement_id, enrolled_at")
      .in(
        "accompagnement_id",
        (
          await supabase
            .from("accompagnements")
            .select("id")
            .eq("consultant_id", user.id)
        ).data?.map((f) => f.id) ?? [],
      )
      .gte("enrolled_at", start.toISOString())
      .lte("enrolled_at", end.toISOString()),
    // Unique clients
    supabase
      .from("bookings")
      .select("client_id")
      .eq("consultant_id", user.id)
      .not("status", "eq", "cancelled"),
  ]);

  // ── Compute stats ─────────────────────────────────────────
  const totalRevenue = (allPaymentsRes.data ?? []).reduce(
    (sum, p) => sum + (p.amount_cents - p.platform_fee_cents),
    0,
  );
  const periodRevenue = (periodPaymentsRes.data ?? []).reduce(
    (sum, p) => sum + (p.amount_cents - p.platform_fee_cents),
    0,
  );
  const totalBookings = totalBookingsRes.count ?? 0;
  const periodBookings = periodBookingsRes.count ?? 0;
  const totalEnrollments = totalEnrollmentsRes.count ?? 0;
  const periodEnrollments = (periodEnrollmentsRes.data ?? []).length;
  const uniqueClients = new Set(
    (uniqueClientsRes.data ?? []).map((b) => b.client_id),
  ).size;

  // ── Build chart data ──────────────────────────────────────
  const periodPayments = periodPaymentsRes.data ?? [];

  const revenueByBucket = new Map<string, number>();

  if (groupBy === "day") {
    for (const day of eachDayOfInterval({ start, end })) {
      revenueByBucket.set(format(day, "yyyy-MM-dd"), 0);
    }
    for (const p of periodPayments) {
      const key = format(new Date(p.created_at), "yyyy-MM-dd");
      revenueByBucket.set(
        key,
        (revenueByBucket.get(key) ?? 0) +
          (p.amount_cents - p.platform_fee_cents),
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
        (revenueByBucket.get(key) ?? 0) +
          (p.amount_cents - p.platform_fee_cents),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Analytics
        </h1>
        <PeriodSelector />
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenus totaux"
          value={formatCurrency(totalRevenue)}
          icon={Euro}
        />
        <StatCard
          title="Consultations"
          value={totalBookings}
          description={`${periodBookings} sur la période`}
          icon={CalendarDays}
        />
        <StatCard
          title="Inscriptions accompagnements"
          value={totalEnrollments}
          description={`${periodEnrollments} sur la période`}
          icon={GraduationCap}
        />
        <StatCard
          title="Clients uniques"
          value={uniqueClients}
          icon={Users}
        />
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <TrendingUp className="h-5 w-5" />
            Revenus nets — {formatCurrency(periodRevenue)} sur la période
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultantAnalyticsPage;

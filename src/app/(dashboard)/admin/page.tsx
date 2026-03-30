import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Euro, BookOpen, CalendarDays } from "lucide-react";

export const metadata: Metadata = {
  title: "Administration",
};

const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const AdminDashboardPage = async () => {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.roles.includes("admin")) {
    return null;
  }
  const supabase = createAdminClient();

  const [
    consultantsResult,
    clientsResult,
    formationsResult,
    paymentsResult,
  ] = await Promise.all([
    supabase
      .from("consultants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .contains("roles", ["client"])
      .is("deleted_at", null),
    supabase
      .from("formations")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null),
    supabase
      .from("payments")
      .select("platform_fee_cents")
      .eq("status", "succeeded"),
  ]);

  const totalConsultantes = consultantsResult.count ?? 0;
  const totalClients = clientsResult.count ?? 0;
  const formationsPubliees = formationsResult.count ?? 0;
  const revenueTotale = (paymentsResult.data ?? []).reduce(
    (sum, p) => sum + p.platform_fee_cents,
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Tableau de bord administration
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total consultantes"
          value={totalConsultantes}
          icon={Users}
        />
        <StatCard
          title="Total clients"
          value={totalClients}
          icon={CalendarDays}
        />
        <StatCard
          title="Revenus totaux"
          value={formatCurrency(revenueTotale)}
          description="Commission plateforme"
          icon={Euro}
        />
        <StatCard
          title="Formations publiées"
          value={formationsPubliees}
          icon={BookOpen}
        />
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="font-serif text-lg">
            Vue d&apos;ensemble
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Utilisez le menu latéral pour gérer les consultantes, formations,
            paiements et paramètres de la plateforme.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;

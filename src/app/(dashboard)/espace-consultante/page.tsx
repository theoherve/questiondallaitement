import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Euro, CalendarDays, BookOpen, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Tableau de bord consultante",
};

const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const ConsultantDashboardPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const [paymentsResult, bookingsResult, formationsResult, clientsResult] =
    await Promise.all([
      supabase
        .from("payments")
        .select("amount_cents, platform_fee_cents")
        .eq("consultant_id", user!.id)
        .eq("status", "succeeded")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd),
      supabase
        .from("bookings")
        .select(
          "id, starts_at, status, consultation_types(title), profiles!bookings_client_id_fkey(first_name, last_name)"
        )
        .eq("consultant_id", user!.id)
        .gte("starts_at", now.toISOString())
        .order("starts_at", { ascending: true })
        .limit(5),
      supabase
        .from("formations")
        .select("id", { count: "exact", head: true })
        .eq("consultant_id", user!.id)
        .is("deleted_at", null),
      supabase
        .from("bookings")
        .select("client_id")
        .eq("consultant_id", user!.id),
    ]);

  const monthlyRevenue = (paymentsResult.data ?? []).reduce(
    (sum, p) => sum + (p.amount_cents - p.platform_fee_cents),
    0
  );

  const upcomingBookings = bookingsResult.data ?? [];
  const uniqueClients = new Set(
    (clientsResult.data ?? []).map((b) => b.client_id)
  ).size;

  const STATUS_LABELS: Record<string, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    cancelled: "Annulée",
    completed: "Terminée",
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Tableau de bord
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenus du mois"
          value={formatCurrency(monthlyRevenue)}
          description={format(now, "MMMM yyyy", { locale: fr })}
          icon={Euro}
        />
        <StatCard
          title="RDV à venir"
          value={upcomingBookings.length}
          icon={CalendarDays}
        />
        <StatCard
          title="Formations"
          value={formationsResult.count ?? 0}
          icon={BookOpen}
        />
        <StatCard
          title="Clients uniques"
          value={uniqueClients}
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Prochaines réservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {upcomingBookings.map((booking) => {
                const ct = booking.consultation_types as unknown as {
                  title: string;
                } | null;
                const client = booking.profiles as unknown as {
                  first_name: string | null;
                  last_name: string | null;
                } | null;

                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium text-primary-green">
                        {ct?.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {client &&
                          `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()}{" "}
                        &middot;{" "}
                        {format(
                          new Date(booking.starts_at),
                          "d MMM yyyy 'à' HH'h'mm",
                          { locale: fr }
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={
                        booking.status === "confirmed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {STATUS_LABELS[booking.status] ?? booking.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune réservation à venir
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultantDashboardPage;

import { Metadata } from "next";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CalendarDays, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

const ClientDashboardPage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const [enrollmentsResult, bookingsResult] = await Promise.all([
    supabase
      .from("formation_enrollments")
      .select("id, enrolled_at, formations(title, slug)")
      .eq("client_id", user.id)
      .order("enrolled_at", { ascending: false })
      .limit(5),
    supabase
      .from("bookings")
      .select(
        "id, starts_at, ends_at, status, consultants(profiles!consultants_id_fkey(first_name, last_name)), consultation_types(title)"
      )
      .eq("client_id", user.id)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
  ]);

  const enrollments = enrollmentsResult.data ?? [];
  const upcomingBookings = bookingsResult.data ?? [];

  const { count: totalEnrollments } = await supabase
    .from("formation_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", user.id);

  const { count: totalBookings } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("client_id", user.id);

  const STATUS_LABELS: Record<string, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    cancelled: "Annulée",
    completed: "Terminée",
    no_show: "Absent",
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Tableau de bord
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Mes formations"
          value={totalEnrollments ?? 0}
          icon={BookOpen}
        />
        <StatCard
          title="Total réservations"
          value={totalBookings ?? 0}
          icon={CalendarDays}
        />
        <StatCard
          title="Prochains RDV"
          value={upcomingBookings.length}
          icon={GraduationCap}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              Mes formations récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrollments.length > 0 ? (
              <div className="space-y-3">
                {enrollments.map((enrollment) => {
                  const formation = enrollment.formations as unknown as {
                    title: string;
                    slug: string;
                  } | null;
                  return (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium text-primary-green">
                          {formation?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Inscrit le{" "}
                          {format(
                            new Date(enrollment.enrolled_at),
                            "d MMM yyyy",
                            { locale: fr }
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune formation pour le moment
              </p>
            )}
          </CardContent>
        </Card>

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
                  const consultant = booking.consultants as unknown as {
                    profiles: {
                      first_name: string | null;
                      last_name: string | null;
                    } | null;
                  } | null;
                  const consultationType = booking.consultation_types as unknown as {
                    title: string;
                  } | null;

                  return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium text-primary-green">
                          {consultationType?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {consultant?.profiles &&
                            `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()}{" "}
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
    </div>
  );
};

export default ClientDashboardPage;

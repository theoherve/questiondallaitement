import { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarDays, GraduationCap, TrendingUp } from "lucide-react";
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
      .select(
        `id, enrolled_at, formations(id, title, slug, formation_sections(formation_blocks(id)))`
      )
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
      .in("status", ["pending", "confirmed"])
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

  const enrollmentIds = enrollments.map((e) => e.id);
  const { data: progressData } =
    enrollmentIds.length > 0
      ? await supabase
          .from("formation_progress")
          .select("enrollment_id, block_id, completed")
          .in("enrollment_id", enrollmentIds)
      : { data: [] };

  const completedByEnrollment = new Map<string, Set<string>>();
  (progressData ?? []).forEach((p) => {
    if (!p.completed) return;
    const set = completedByEnrollment.get(p.enrollment_id) ?? new Set();
    set.add(p.block_id);
    completedByEnrollment.set(p.enrollment_id, set);
  });

  let totalBlocks = 0;
  let totalCompleted = 0;
  enrollments.forEach((e) => {
    const formation = e.formations as unknown as {
      formation_sections: { formation_blocks: { id: string }[] }[];
    } | null;
    const blocks =
      formation?.formation_sections?.reduce(
        (acc, s) => acc + s.formation_blocks.length,
        0
      ) ?? 0;
    totalBlocks += blocks;
    totalCompleted += completedByEnrollment.get(e.id)?.size ?? 0;
  });

  const globalProgress =
    totalBlocks > 0 ? Math.round((totalCompleted / totalBlocks) * 100) : 0;

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Mes accompagnements"
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
        <StatCard
          title="Progression globale"
          value={`${globalProgress}%`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              Mes accompagnements récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrollments.length > 0 ? (
              <div className="space-y-3">
                {enrollments.map((enrollment) => {
                  const formation = enrollment.formations as unknown as {
                    id: string;
                    title: string;
                    slug: string;
                    formation_sections: {
                      formation_blocks: { id: string }[];
                    }[];
                  } | null;

                  if (!formation) return null;

                  const blocks = formation.formation_sections?.reduce(
                    (acc, s) => acc + s.formation_blocks.length,
                    0
                  ) ?? 0;
                  const done =
                    completedByEnrollment.get(enrollment.id)?.size ?? 0;
                  const pct =
                    blocks > 0 ? Math.round((done / blocks) * 100) : 0;

                  return (
                    <Link
                      key={enrollment.id}
                      href={`/espace-client/formations/${formation.id}`}
                      className="block rounded-md border p-3 transition-colors hover:bg-muted/50"
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-primary-green">
                          {formation.title}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {pct}%
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary-red transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Inscrit le{" "}
                        {format(
                          new Date(enrollment.enrolled_at),
                          "d MMM yyyy",
                          { locale: fr }
                        )}
                      </p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun accompagnement pour le moment
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/accompagnements" tabIndex={0}>
                    Découvrir les accompagnements
                  </Link>
                </Button>
              </div>
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
                  const consultationType =
                    booking.consultation_types as unknown as {
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
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucune réservation à venir
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/reserver" tabIndex={0}>
                    Prendre rendez-vous
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboardPage;

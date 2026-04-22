import { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CalendarDays,
  Clock,
  GraduationCap,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ProgressRing } from "@/components/espace-client/progress-ring";
import { ResumeBanner } from "@/components/espace-client/resume-banner";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

type EnrollmentRow = {
  id: string;
  enrolled_at: string;
  formations: {
    id: string;
    title: string;
    slug: string;
    thumbnail_url?: string | null;
    formation_sections: { formation_blocks: { id: string }[] }[];
  } | null;
};

const ClientDashboardPage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const [enrollmentsResult, bookingsResult, profileResult] = await Promise.all([
    supabase
      .from("formation_enrollments")
      .select(
        `id, enrolled_at, formations(id, title, slug, thumbnail_url, formation_sections(formation_blocks(id)))`
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
    supabase
      .from("profiles")
      .select("first_name")
      .eq("id", user.id)
      .single(),
  ]);

  const enrollments = (enrollmentsResult.data ?? []) as unknown as EnrollmentRow[];
  const upcomingBookings = bookingsResult.data ?? [];
  const firstName = profileResult.data?.first_name ?? null;

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
  const enrollmentStats: {
    enrollment: EnrollmentRow;
    totalBlocks: number;
    completedBlocks: number;
    progressPercent: number;
  }[] = [];

  enrollments.forEach((e) => {
    const blocks =
      e.formations?.formation_sections?.reduce(
        (acc, s) => acc + s.formation_blocks.length,
        0
      ) ?? 0;
    const done = completedByEnrollment.get(e.id)?.size ?? 0;
    const pct = blocks > 0 ? Math.round((done / blocks) * 100) : 0;
    totalBlocks += blocks;
    totalCompleted += done;
    enrollmentStats.push({
      enrollment: e,
      totalBlocks: blocks,
      completedBlocks: done,
      progressPercent: pct,
    });
  });

  const globalProgress =
    totalBlocks > 0 ? Math.round((totalCompleted / totalBlocks) * 100) : 0;

  const resumeCandidate = enrollmentStats.find(
    (s) =>
      s.progressPercent > 0 &&
      s.progressPercent < 100 &&
      s.enrollment.formations
  );

  const STATUS_LABELS: Record<string, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    cancelled: "Annulée",
    completed: "Terminée",
    no_show: "Absent",
  };

  const stats = [
    {
      title: "Accompagnements",
      value: totalEnrollments ?? 0,
      icon: BookOpen,
      accent: "bg-accent-peach-soft",
      iconClass: "bg-accent-peach/30 text-primary-red",
    },
    {
      title: "Réservations",
      value: totalBookings ?? 0,
      icon: CalendarDays,
      accent: "bg-accent-sage-soft",
      iconClass: "bg-accent-sage/30 text-primary-green",
    },
    {
      title: "Prochains RDV",
      value: upcomingBookings.length,
      icon: GraduationCap,
      accent: "bg-accent-honey-soft",
      iconClass: "bg-accent-honey/40 text-primary-green",
    },
    {
      title: "Progression",
      value: `${globalProgress}%`,
      icon: TrendingUp,
      accent: "bg-background-beige-dark",
      iconClass: "bg-primary-red/10 text-primary-red",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-4 rounded-3xl bg-linear-to-br from-background-beige-dark/60 via-background-beige to-accent-cream p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary-red">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Votre espace
          </div>
          <h1 className="mt-2 font-serif text-2xl font-bold text-primary-green sm:text-3xl">
            {firstName ? `Bonjour ${firstName},` : "Bonjour,"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {globalProgress >= 100
              ? "Bravo, vous avez terminé tous vos accompagnements."
              : totalBlocks > 0
                ? "Prenez un instant pour avancer à votre rythme."
                : "Découvrez un accompagnement pour commencer votre parcours."}
          </p>
        </div>
        {totalBlocks > 0 && (
          <ProgressRing
            value={globalProgress}
            size={112}
            strokeWidth={10}
            ariaLabel={`Progression globale ${globalProgress}%`}
          >
            <div className="text-center">
              <div className="font-serif text-2xl font-bold text-primary-green">
                {globalProgress}%
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                global
              </div>
            </div>
          </ProgressRing>
        )}
      </section>

      {resumeCandidate?.enrollment.formations && (
        <ResumeBanner
          candidate={{
            formationId: resumeCandidate.enrollment.formations.id,
            title: resumeCandidate.enrollment.formations.title,
            progressPercent: resumeCandidate.progressPercent,
          }}
        />
      )}

      {/* Stats bento */}
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Statistiques"
      >
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className={`rounded-2xl border border-border/50 p-5 transition-shadow hover:shadow-md ${s.accent}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.title}
                </p>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconClass}`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
              </div>
              <p className="mt-2 font-serif text-3xl font-bold text-primary-green">
                {s.value}
              </p>
            </div>
          );
        })}
      </section>

      {/* Bento — accompagnements + réservations */}
      <section className="grid gap-6 lg:grid-cols-5">
        <Card className="rounded-3xl border-border/50 shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-serif text-lg text-primary-green">
              <span className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary-red" aria-hidden />
                Mes accompagnements récents
              </span>
              {enrollmentStats.length > 0 && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-primary-red hover:bg-primary-red/10 hover:text-primary-red"
                >
                  <Link href="/espace-client/accompagnements" tabIndex={0}>
                    Tout voir
                  </Link>
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrollmentStats.length > 0 ? (
              <ul className="space-y-3">
                {enrollmentStats.map(
                  ({
                    enrollment,
                    progressPercent,
                    totalBlocks: blocks,
                    completedBlocks,
                  }) => {
                    const formation = enrollment.formations;
                    if (!formation) return null;
                    const isComplete = progressPercent === 100;
                    return (
                      <li key={enrollment.id}>
                        <Link
                          href={`/espace-client/accompagnements/${formation.id}`}
                          tabIndex={0}
                          className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary-red/40 hover:shadow-md"
                        >
                          <ProgressRing
                            value={progressPercent}
                            size={56}
                            strokeWidth={5}
                            indicatorClassName={
                              isComplete
                                ? "stroke-accent-sage"
                                : "stroke-primary-red"
                            }
                            trackClassName="stroke-background-beige-dark"
                          >
                            <span className="text-xs font-bold text-primary-green">
                              {progressPercent}%
                            </span>
                          </ProgressRing>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-primary-green group-hover:text-primary-red">
                              {formation.title}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {completedBlocks}/{blocks} étapes
                              </span>
                              <span aria-hidden>&middot;</span>
                              <span>
                                Inscrit le{" "}
                                {format(
                                  new Date(enrollment.enrolled_at),
                                  "d MMM",
                                  { locale: fr }
                                )}
                              </span>
                            </div>
                          </div>
                          {isComplete && (
                            <Badge className="bg-accent-sage/30 text-primary-green hover:bg-accent-sage/30">
                              Terminé
                            </Badge>
                          )}
                        </Link>
                      </li>
                    );
                  }
                )}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background-beige py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun accompagnement pour le moment.
                </p>
                <Button asChild className="mt-4 rounded-xl" size="sm">
                  <Link href="/accompagnements" tabIndex={0}>
                    Découvrir les accompagnements
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg text-primary-green">
              <Clock className="h-5 w-5 text-primary-red" aria-hidden />
              Prochains rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length > 0 ? (
              <ul className="space-y-3">
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
                    <li
                      key={booking.id}
                      className="rounded-2xl border border-border/60 bg-card p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-primary-green">
                            {consultationType?.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {consultant?.profiles &&
                              `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()}
                          </p>
                          <p className="mt-1 text-xs font-medium text-primary-red">
                            {format(
                              new Date(booking.starts_at),
                              "d MMM 'à' HH'h'mm",
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
                          className="shrink-0"
                        >
                          {STATUS_LABELS[booking.status] ?? booking.status}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background-beige py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun rendez-vous à venir.
                </p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl"
                >
                  <Link href="/reserver" tabIndex={0}>
                    Prendre rendez-vous
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ClientDashboardPage;

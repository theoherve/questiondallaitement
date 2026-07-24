import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, Play, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ProgressRing } from "@/components/espace-client/progress-ring";
import { PurchaseReconciler } from "./_components/purchase-reconciler";

export const metadata: Metadata = {
  title: "Mes accompagnements",
};

type FormationShape = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  formation_sections: { formation_blocks: { id: string }[] }[];
};

const ClientFormationsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ purchased?: string }>;
}) => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: enrollments } = await supabase
    .from("formation_enrollments")
    .select(
      `
      id,
      enrolled_at,
      formations (
        id,
        title,
        slug,
        short_description,
        thumbnail_url,
        formation_sections (
          formation_blocks (
            id
          )
        )
      )
    `
    )
    .eq("client_id", user.id)
    .order("enrolled_at", { ascending: false });

  const enrollmentIds = (enrollments ?? []).map((e) => e.id);

  const { data: progressData } =
    enrollmentIds.length > 0
      ? await supabase
          .from("formation_progress")
          .select("enrollment_id, block_id, completed")
          .in("enrollment_id", enrollmentIds)
      : { data: [] };

  const progressByEnrollment = new Map<string, Set<string>>();
  (progressData ?? []).forEach((p) => {
    if (!p.completed) return;
    const set = progressByEnrollment.get(p.enrollment_id) ?? new Set();
    set.add(p.block_id);
    progressByEnrollment.set(p.enrollment_id, set);
  });

  // Retour d'un paiement : n'attendre le webhook que si l'inscription
  // n'apparait pas encore, sinon l'ilot clignoterait pour rien.
  const { purchased } = await searchParams;
  const enrolledFormationIds = new Set(
    (enrollments ?? []).map(
      (e) => (e.formations as unknown as FormationShape | null)?.id
    )
  );
  const awaitingPurchase =
    purchased && !enrolledFormationIds.has(purchased) ? purchased : null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 rounded-3xl bg-linear-to-br from-background-beige-dark/50 via-background-beige to-accent-peach-soft/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary-red">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Votre parcours
          </div>
          <h1 className="mt-2 font-serif text-2xl font-bold text-primary-green sm:text-3xl">
            Mes accompagnements
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Avancez à votre rythme, tout est là quand vous en avez besoin.
          </p>
        </div>
        <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-red/10 sm:flex">
          <BookOpen className="h-6 w-6 text-primary-red" aria-hidden />
        </div>
      </header>

      {awaitingPurchase && <PurchaseReconciler formationId={awaitingPurchase} />}

      {enrollments && enrollments.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment) => {
            const formation = enrollment.formations as unknown as FormationShape | null;

            if (!formation) return null;

            const totalBlocks = formation.formation_sections.reduce(
              (acc, s) => acc + s.formation_blocks.length,
              0
            );
            const completedBlocks =
              progressByEnrollment.get(enrollment.id)?.size ?? 0;
            const progressPercent =
              totalBlocks > 0
                ? Math.round((completedBlocks / totalBlocks) * 100)
                : 0;
            const isComplete = progressPercent === 100;
            const isNew = progressPercent === 0;

            return (
              <Card
                key={enrollment.id}
                className="group overflow-hidden rounded-3xl border-border/50 pt-0 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg p-0"
              >
                <div className="relative aspect-video overflow-hidden bg-linear-to-br from-accent-peach-soft to-background-beige-dark">
                  {formation.thumbnail_url ? (
                    <Image
                      src={formation.thumbnail_url}
                      alt={formation.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen
                        className="h-10 w-10 text-primary-red/30"
                        aria-hidden
                      />
                    </div>
                  )}
                  {isComplete && (
                    <Badge className="absolute right-3 top-3 gap-1 bg-accent-sage text-primary-green hover:bg-accent-sage">
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                      Terminé
                    </Badge>
                  )}
                  {isNew && (
                    <Badge className="absolute right-3 top-3 bg-accent-honey text-primary-green hover:bg-accent-honey">
                      Nouveau
                    </Badge>
                  )}
                  <div className="absolute bottom-3 left-3">
                    <ProgressRing
                      value={progressPercent}
                      size={52}
                      strokeWidth={5}
                      indicatorClassName={
                        isComplete ? "stroke-accent-sage" : "stroke-primary-red"
                      }
                      trackClassName="stroke-white/70"
                    >
                      <span className="text-[11px] font-bold text-primary-green">
                        {progressPercent}%
                      </span>
                    </ProgressRing>
                  </div>
                </div>
                <CardContent className="space-y-3 p-5">
                  <div>
                    <h3 className="font-serif text-lg font-semibold leading-snug text-primary-green">
                      {formation.title}
                    </h3>
                    {formation.short_description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {formation.short_description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {completedBlocks}/{totalBlocks} étapes
                    </span>
                    <span>
                      {format(new Date(enrollment.enrolled_at), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </span>
                  </div>

                  <Button
                    asChild
                    className="w-full rounded-xl bg-primary-red hover:bg-primary-red-dark"
                  >
                    <Link
                      href={`/espace-client/accompagnements/${formation.id}`}
                      tabIndex={0}
                    >
                      <Play className="h-4 w-4 fill-current" aria-hidden />
                      {isComplete
                        ? "Revoir"
                        : isNew
                          ? "Commencer"
                          : "Continuer"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-3xl border-dashed bg-background-beige">
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-red/10">
              <BookOpen className="h-6 w-6 text-primary-red" aria-hidden />
            </div>
            <p className="mt-4 text-base text-primary-green">
              Vous n&apos;êtes inscrit à aucun accompagnement.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Explorez la sélection pour démarrer votre parcours.
            </p>
            <Button asChild className="mt-5 rounded-xl">
              <Link href="/accompagnements" tabIndex={0}>
                Découvrir les accompagnements
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientFormationsPage;

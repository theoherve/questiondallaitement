import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarDays,
  Clock,
  Monitor,
  GraduationCap,
  ShieldCheck,
  Award,
  History,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FormationsList } from "./_components/formations-list";

export const metadata: Metadata = {
  title: "Formations professionnelles",
  description:
    "Formations, ateliers et webinaires pour professionnels de santé en lactation et allaitement. Avec Carole Hervé, consultante IBCLC.",
};

export const dynamic = "force-dynamic";

const BENEFITS = [
  { icon: Monitor, label: "En visio Zoom" },
  { icon: GraduationCap, label: "Formatrice IBCLC" },
  { icon: ShieldCheck, label: "Attestation fournie" },
  { icon: Award, label: "Approche fondée sur les preuves" },
];

const FormationsProPage = async () => {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      slug,
      description,
      type,
      starts_at,
      ends_at,
      location,
      max_participants,
      price_cents,
      currency,
      show_price,
      thumbnail_url,
      external_url,
      discounted_price_cents,
      training_providers!provider_id (
        name,
        logo_url
      ),
      consultants (
        slug,
        profiles!consultants_id_fkey (
          first_name,
          last_name
        )
      )
    `
    )
    .eq("is_published", true)
    .order("starts_at", { ascending: true });

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
            Formations professionnelles
          </h1>
          <p className="mt-4 text-destructive">
            Erreur lors du chargement : {error.message}
          </p>
        </div>
      </div>
    );
  }

  const all = (events ?? []).map((e) => ({
    ...e,
    provider: (e as Record<string, unknown>).training_providers as { name: string; logo_url: string | null } | null,
  }));
  const now = new Date().toISOString();
  const upcomingEvents = all.filter((e) => e.starts_at >= now);
  const pastEvents = all.filter((e) => e.starts_at < now).reverse();

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-primary-green px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Formez-vous à l&apos;allaitement avec une approche clinique, pas
            des recettes toutes faites
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-white/80">
            Sages-femmes, orthophonistes, puéricultrices, ostéopathes,
            accompagnantes en périnatalité : des formations certifiantes
            construites sur l&apos;observation clinique et les données
            probantes, pour accompagner l&apos;allaitement avec rigueur et
            humanité.
          </p>

          {/* Quick stats */}
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-6 text-white/70">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <span className="text-sm font-medium">
                {upcomingEvents.length > 0
                  ? `${upcomingEvents.length} session${upcomingEvents.length > 1 ? "s" : ""} à venir`
                  : "Nouvelles sessions bientôt"}
              </span>
            </div>
            {upcomingEvents.length > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Prochaine le{" "}
                  {format(new Date(upcomingEvents[0].starts_at), "d MMMM", { locale: fr })}
                </span>
              </div>
            )}
            {all.length > 0 && (
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {all.length} session{all.length > 1 ? "s" : ""} organisée{all.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {upcomingEvents.some((e) => e.show_price && e.price_cents === 0) && (
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Sessions gratuites disponibles
                </span>
              </div>
            )}
          </div>

          {/* Orientation par type de session — les filtres ne s'expliquent pas
              d'eux-mêmes pour qui découvre la page. */}
          <dl className="mx-auto mt-8 grid max-w-3xl gap-x-8 gap-y-2 text-left text-sm text-white/75 sm:grid-cols-2">
            <div>
              <dt className="inline font-medium text-white">Formations — </dt>
              <dd className="inline">un parcours complet et certifiant.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-white">Masterclass — </dt>
              <dd className="inline">un sujet précis approfondi en une session.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-white">Ateliers — </dt>
              <dd className="inline">pour celles qui animent déjà des groupes de parents.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-white">Lives — </dt>
              <dd className="inline">réservés aux personnes accompagnées en ligne par Carole.</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Benefits Strip */}
      <section className="border-b border-primary-green/10 bg-background-beige-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-0 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className={`flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5 ${
                  i < BENEFITS.length - 1 ? "lg:border-r lg:border-primary-green/10" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary-red/10">
                  <Icon className="h-5 w-5 text-primary-red" />
                </div>
                <span className="text-sm font-medium text-primary-green">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events listing with filters */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <FormationsList
          upcomingEvents={upcomingEvents}
          pastEvents={pastEvents}
        />
      </div>
    </div>
  );
};

export default FormationsProPage;

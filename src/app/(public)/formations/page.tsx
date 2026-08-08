import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CalendarDays, Clock, History, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FormationsList } from "./_components/formations-list";
import {
  FORMATION_CATEGORY_CONFIG,
  type FormationCategory,
} from "@/config/formation-categories";
import { PARIS } from "@/lib/formations/paris-time";

/**
 * Categories expliquees sous le titre, dans cet ordre. Les conferences n'y
 * figurent pas : elles sont ponctuelles et gratuites, la legende sert a
 * orienter vers l'offre courante.
 */
const LEGEND_CATEGORIES: FormationCategory[] = [
  "formation",
  "webinaire",
  "atelier_mensuel",
  "masterclass",
];

export const metadata: Metadata = {
  title: "Formations professionnelles",
  description:
    "Formations, ateliers et webinaires pour professionnels de santé en lactation et allaitement. Avec Carole Hervé, consultante IBCLC.",
};

export const dynamic = "force-dynamic";

const FormationsProPage = async () => {
  const supabase = await createClient();

  const { data: formations, error } = await supabase
    .from("formations")
    .select(
      `
      id,
      title,
      slug,
      description,
      type,
      starts_at,
      ends_at,
      show_time,
      location,
      max_participants,
      price_cents,
      currency,
      show_price,
      thumbnail_url,
      external_url,
      partner_promo_codes,
      discounted_price_cents,
      category,
      badge,
      is_evergreen,
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

  const all = (formations ?? []).map((e) => ({
    ...e,
    provider: (e as Record<string, unknown>).training_providers as { name: string; logo_url: string | null } | null,
  }));
  const now = new Date().toISOString();
  // Les formations permanentes sortent des deux listes chronologiques : leur
  // `starts_at` n'est qu'une date de mise en ligne, les classer dessus les
  // ferait basculer en « sessions passées » dès le lendemain.
  const evergreenFormations = all.filter((e) => e.is_evergreen);
  const dated = all.filter((e) => !e.is_evergreen);
  const upcomingFormations = dated.filter((e) => e.starts_at >= now);
  const pastFormations = dated.filter((e) => e.starts_at < now).reverse();

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-primary-green px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Formez-vous en aiguisant votre regard clinique
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-white/80">
            Professionnels de la périnatalité, thérapeutes manuels, thérapeutes
            psychologiques
            <sup className="ml-0.5">*</sup> : des formations construites sur
            l&apos;observation clinique et les données probantes, pour
            accompagner les familles avec rigueur et humanité.
          </p>
          {/* L'astérisque renvoie au détail de chaque session : la liste des
              métiers concernés varie d'un organisme à l'autre, l'écrire ici
              serait faux pour une partie du catalogue. */}
          <p className="mx-auto mt-2 max-w-3xl text-xs text-white/60">
            * liste des métiers spécifiée dans le détail des sessions
          </p>

          {/* Quick stats */}
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-6 text-white/70">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <span className="text-sm font-medium">
                {upcomingFormations.length > 0
                  ? `${upcomingFormations.length} session${upcomingFormations.length > 1 ? "s" : ""} à venir`
                  : "Nouvelles sessions bientôt"}
              </span>
            </div>
            {upcomingFormations.length > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Prochaine le{" "}
                  {format(new Date(upcomingFormations[0].starts_at), "d MMMM", {
                    locale: fr,
                    in: PARIS,
                  })}
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
            {upcomingFormations.some((e) => e.show_price && e.price_cents === 0) && (
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Sessions gratuites disponibles
                </span>
              </div>
            )}
          </div>

          {/* Orientation par type de session : les filtres ne s'expliquent pas
              d'eux-mêmes pour qui découvre la page. La légende est construite
              depuis le catalogue des catégories, pour qu'un renommage se fasse
              en un seul endroit. */}
          <dl className="mx-auto mt-8 grid max-w-3xl gap-x-8 gap-y-2 text-left text-sm text-white/75 sm:grid-cols-2">
            {LEGEND_CATEGORIES.map((key) => (
              <div key={key}>
                <dt className="inline font-medium text-white">
                  {FORMATION_CATEGORY_CONFIG[key].filterLabel} :{" "}
                </dt>
                <dd className="inline">{FORMATION_CATEGORY_CONFIG[key].description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Formations listing with filters */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <FormationsList
          upcomingFormations={upcomingFormations}
          pastFormations={pastFormations}
          evergreenFormations={evergreenFormations}
        />
      </div>
    </div>
  );
};

export default FormationsProPage;

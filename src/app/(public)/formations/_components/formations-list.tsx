"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarDays,
  MapPin,
  Video,
  Users,
  Clock,
  GraduationCap,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
  ExternalLink,
  Tag,
  Sparkles,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { FORMATION_SCHOOL_PRICE_LABEL } from "@/config/formations";
import {
  FORMATION_CATEGORIES,
  FORMATION_CATEGORY_CONFIG,
  resolveFormationCategory,
  type FormationCategory,
} from "@/config/formation-categories";
import { PARIS } from "@/lib/formations/paris-time";
import { promoCodeLabel } from "@/lib/formations/external-url";
import {
  AUDIENCE_FILTERS,
  type AudienceFilter,
  type FormationAudienceGroup,
} from "@/config/formation-audience";
import { matchesAudienceFilter } from "@/lib/formations/audience";
import { matchesFormationSearch } from "@/lib/formations/search";
import { FormationSearch } from "./formation-search";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type FormationData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: string;
  starts_at: string;
  ends_at: string;
  // false = aucune heure saisie : ni horaire ni duree ne sont affiches.
  show_time: boolean;
  location: string | null;
  max_participants: number | null;
  price_cents: number;
  currency: string;
  show_price: boolean;
  thumbnail_url: string | null;
  consultants: unknown;
  external_url: string | null;
  /** Codes de reduction de l'organisme, annonces sur la carte. */
  partner_promo_codes: string[] | null;
  discounted_price_cents: number | null;
  provider: { name: string; logo_url: string | null } | null;
  category: string;
  audience_group: FormationAudienceGroup;
  badge: string | null;
  // true = accessible en permanence : la formation ne suit pas le calendrier.
  is_evergreen: boolean;
};

type CategoryFilter = "all" | FormationCategory;

/** Filtre « Quand » : distingue les sessions datees des formations permanentes. */
type WhenFilter = "upcoming" | "evergreen" | "all";

const WHEN_FILTERS: { value: WhenFilter; label: string }[] = [
  { value: "upcoming", label: "À venir" },
  { value: "evergreen", label: "Disponible à tout moment" },
  { value: "all", label: "Tout" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const FORMATION_TYPE_LABELS: Record<string, { label: string; icon: typeof Video }> = {
  online: { label: "En ligne", icon: Video },
  in_person: { label: "Présentiel", icon: MapPin },
  hybrid: { label: "Hybride", icon: Users },
};

const formatPrice = (cents: number, currency: string): string => {
  if (cents === 0) return FORMATION_SCHOOL_PRICE_LABEL;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100);
};

/**
 * Jour civil parisien d'une date, sous la forme `2027-01-04`.
 *
 * Sert a comparer une session au jour choisi dans le calendrier : ce dernier
 * manipule des dates civiles, sans heure ni fuseau.
 */
const parisDayKey = (isoDate: string): string =>
  format(new Date(isoDate), "yyyy-MM-dd", { in: PARIS });

const formatDuration = (startsAt: string, endsAt: string): string => {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours <= 2) return `${Math.round(diffHours * 60)} min`;
  if (diffHours <= 8) return `${Math.round(diffHours)}h`;
  if (diffDays === 1) return "1 jour";
  return `${diffDays} jours`;
};

const INITIAL_VISIBLE = 6;
const PAST_INITIAL_VISIBLE = 3;

/* ------------------------------------------------------------------ */
/*  Category filter config                                             */
/* ------------------------------------------------------------------ */

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "Tout" },
  ...FORMATION_CATEGORIES.map((value) => ({
    value,
    label: FORMATION_CATEGORY_CONFIG[value].filterLabel,
  })),
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export const FormationsList = ({
  upcomingFormations,
  pastFormations,
  evergreenFormations,
}: {
  upcomingFormations: FormationData[];
  pastFormations: FormationData[];
  /** Formations sans date, presentees a part du calendrier. */
  evergreenFormations: FormationData[];
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  // Par defaut, sessions a venir et formations permanentes s'affichent
  // ensemble : le toggle ne sert qu'a restreindre a l'une ou l'autre.
  const [whenFilter, setWhenFilter] = useState<WhenFilter>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const audienceParam = searchParams.get("audience");
  const audienceFilter: AudienceFilter =
    audienceParam === "maman" || audienceParam === "pro" ? audienceParam : "all";

  // Piloter le toggle par l'URL permet un lien profond depuis le tableau de
  // bord espace-client (/formations?audience=maman).
  const handleAudienceChange = useCallback(
    (value: AudienceFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") params.delete("audience");
      else params.set("audience", value);
      const query = params.toString();
      router.replace(query ? `/formations?${query}` : "/formations", { scroll: false });
    },
    [router, searchParams],
  );

  // Jours pastilles dans le calendrier. La date est reconstruite a partir du
  // jour civil parisien : `startOfDay` sur le fuseau du navigateur decalerait
  // d'un jour toute session commencant tot pour une visiteuse hors de France.
  const formationDates = useMemo(() => {
    return upcomingFormations.map((e) => {
      const [year, month, day] = parisDayKey(e.starts_at).split("-").map(Number);
      return new Date(year, month - 1, day);
    });
  }, [upcomingFormations]);

  // Determine which categories actually have formations
  const allFormations = useMemo(
    () => [...upcomingFormations, ...pastFormations, ...evergreenFormations],
    [upcomingFormations, pastFormations, evergreenFormations],
  );

  const availableCategories = useMemo(() => {
    const cats = new Set(allFormations.map((e) => e.category));
    return CATEGORY_FILTERS.filter((f) => f.value === "all" || cats.has(f.value));
  }, [allFormations]);

  // Sessions concernees par le toggle « Quand » + le toggle audience, pour que
  // le compteur affiche sur chaque pastille de type corresponde a ce qui sera
  // reellement visible en cliquant dessus (les sessions passees ne suivent pas
  // le toggle « Quand », elles restent dans leur propre section repliable).
  const categoryCountPool = useMemo(() => {
    const pool =
      whenFilter === "upcoming"
        ? upcomingFormations
        : whenFilter === "evergreen"
          ? evergreenFormations
          : [...upcomingFormations, ...evergreenFormations];
    return pool.filter((e) => matchesAudienceFilter(e.audience_group, audienceFilter));
  }, [upcomingFormations, evergreenFormations, whenFilter, audienceFilter]);

  // Filter formations by category + selected date + recherche
  const filteredUpcoming = useMemo(() => {
    let result = upcomingFormations;
    if (activeCategory !== "all") {
      result = result.filter((e) => e.category === activeCategory);
    }
    result = result.filter((e) => matchesAudienceFilter(e.audience_group, audienceFilter));
    if (selectedDate) {
      const day = format(selectedDate, "yyyy-MM-dd");
      result = result.filter((e) => parisDayKey(e.starts_at) === day);
    }
    return result.filter((e) => matchesFormationSearch(e.title, searchQuery));
  }, [upcomingFormations, activeCategory, audienceFilter, selectedDate, searchQuery]);

  const filteredPast = useMemo(() => {
    let result = pastFormations;
    if (activeCategory !== "all") {
      result = result.filter((e) => e.category === activeCategory);
    }
    result = result.filter((e) => matchesAudienceFilter(e.audience_group, audienceFilter));
    if (selectedDate) {
      const day = format(selectedDate, "yyyy-MM-dd");
      result = result.filter((e) => parisDayKey(e.starts_at) === day);
    }
    return result.filter((e) => matchesFormationSearch(e.title, searchQuery));
  }, [pastFormations, activeCategory, audienceFilter, selectedDate, searchQuery]);

  // Les formations sans date ignorent le filtre calendaire : elles ne tombent
  // aucun jour en particulier, les retirer parce qu'une date est selectionnee
  // laisserait croire qu'elles n'existent plus.
  const filteredEvergreen = useMemo(() => {
    let result = evergreenFormations;
    if (activeCategory !== "all") {
      result = result.filter((e) => e.category === activeCategory);
    }
    result = result.filter((e) => matchesAudienceFilter(e.audience_group, audienceFilter));
    return result.filter((e) => matchesFormationSearch(e.title, searchQuery));
  }, [evergreenFormations, activeCategory, audienceFilter, searchQuery]);

  // Progressive disclosure
  const visibleUpcoming = showAllUpcoming ? filteredUpcoming : filteredUpcoming.slice(0, INITIAL_VISIBLE);
  const hiddenUpcomingCount = filteredUpcoming.length - visibleUpcoming.length;

  const visiblePast = showAllPast ? filteredPast : filteredPast.slice(0, PAST_INITIAL_VISIBLE);
  const hiddenPastCount = filteredPast.length - visiblePast.length;

  const handleDateSelect = useCallback((date: Date | undefined) => {
    // Toggle: clicking the same date again deselects it
    setSelectedDate((prev) =>
      prev && date && isSameDay(prev, date) ? undefined : date
    );
    setShowAllUpcoming(false);
    setShowAllPast(false);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setActiveCategory("all");
    setWhenFilter("all");
    setSelectedDate(undefined);
    setShowAllUpcoming(false);
    setShowAllPast(false);
    handleAudienceChange("all");
  }, [handleAudienceChange]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    activeCategory !== "all" ||
    whenFilter !== "all" ||
    audienceFilter !== "all" ||
    selectedDate !== undefined;

  // Le filtre « Quand » decide QUELLE section s'affiche, pas seulement son
  // contenu : « a venir » masque entierement le bloc permanent, et
  // inversement.
  const showUpcomingSection = whenFilter !== "evergreen";
  const showEvergreenSection = whenFilter !== "upcoming";

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
      {/* ============================================================ */}
      {/* Left sidebar: Calendar + Filters (sticky on desktop)         */}
      {/* ============================================================ */}
      <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-70 lg:self-start">
        <FormationSearch
          formations={allFormations}
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Toggle « Quand » : decide quelle section (a venir / permanente)
            s'affiche. Par defaut, seule « A venir » est active. */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {WHEN_FILTERS.map((filter) => {
              const isActive = whenFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => {
                    setWhenFilter(filter.value);
                    setShowAllUpcoming(false);
                    setShowAllPast(false);
                  }}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary-green text-white shadow-sm"
                      : "bg-background-beige-dark text-primary-green/70 hover:bg-primary-green/10 hover:text-primary-green"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggle audience : dimension separee de la categorie (public vise
            vs format). Pilote par l'URL pour permettre un lien profond
            depuis le tableau de bord espace-client. */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_FILTERS.map((filter) => {
              const isActive = audienceFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => handleAudienceChange(filter.value)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary-red text-white shadow-sm"
                      : "bg-background-beige-dark text-primary-green/70 hover:bg-primary-green/10 hover:text-primary-green"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category filter pills */}
        {availableCategories.length > 2 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="h-4 w-4 text-primary-green/50" />
              <span className="text-sm font-medium text-primary-green/50">Filtrer par type</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => {
                const isActive = activeCategory === cat.value;
                const count =
                  cat.value === "all"
                    ? categoryCountPool.length
                    : categoryCountPool.filter((e) => e.category === cat.value).length;

                return (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setActiveCategory(cat.value);
                      setShowAllUpcoming(false);
                      setShowAllPast(false);
                    }}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary-green text-white shadow-sm"
                        : "bg-background-beige-dark text-primary-green/70 hover:bg-primary-green/10 hover:text-primary-green"
                    }`}
                  >
                    {cat.label}
                    <span
                      className={`text-xs ${
                        isActive ? "text-white/70" : "text-primary-green/40"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="rounded-xl border border-primary-green/10 bg-white p-1 shadow-sm">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={fr}
            modifiers={{
              hasFormation: formationDates,
            }}
            modifiersClassNames={{
              hasFormation: "bg-primary-red/15! text-primary-red! font-semibold",
            }}
            className="w-full! [--cell-size:--spacing(9)]"
            classNames={{
              month: "w-full",
              table: "w-full",
              head_row: "flex w-full",
              row: "flex w-full mt-1",
            }}
          />
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 px-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary-red/20" />
            <span className="text-xs text-primary-green/50">Session prévue</span>
          </div>
          {selectedDate && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary-green" />
              <span className="text-xs text-primary-green/50">Sélectionné</span>
            </div>
          )}
        </div>
      </aside>

      {/* ============================================================ */}
      {/* Main content: Formation list                                      */}
      {/* ============================================================ */}
      <div className="min-w-0 flex-1">
        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-primary-green/50">Filtres actifs :</span>
            {searchQuery.trim() !== "" && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-primary-green/10 text-primary-green cursor-pointer hover:bg-primary-green/20"
                onClick={() => setSearchQuery("")}
              >
                « {searchQuery.trim()} »
                <X className="h-3 w-3" />
              </Badge>
            )}
            {whenFilter !== "all" && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-primary-green/10 text-primary-green cursor-pointer hover:bg-primary-green/20"
                onClick={() => setWhenFilter("all")}
              >
                {WHEN_FILTERS.find((f) => f.value === whenFilter)?.label}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {audienceFilter !== "all" && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-primary-green/10 text-primary-green cursor-pointer hover:bg-primary-green/20"
                onClick={() => handleAudienceChange("all")}
              >
                {AUDIENCE_FILTERS.find((f) => f.value === audienceFilter)?.label}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {selectedDate && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-primary-green/10 text-primary-green cursor-pointer hover:bg-primary-green/20"
                onClick={() => setSelectedDate(undefined)}
              >
                {format(selectedDate, "d MMMM yyyy", { locale: fr })}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {activeCategory !== "all" && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-primary-green/10 text-primary-green cursor-pointer hover:bg-primary-green/20"
                onClick={() => setActiveCategory("all")}
              >
                {CATEGORY_FILTERS.find((c) => c.value === activeCategory)?.label}
                <X className="h-3 w-3" />
              </Badge>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-primary-red hover:text-primary-red-dark transition-colors"
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* Sessions a venir affichees en premier : contrairement aux
            formations permanentes, elles sont datees et perimables — les
            releguer sous le bloc "a tout moment" les ferait manquer si on ne
            scrolle pas. */}
        {showUpcomingSection && (filteredUpcoming.length > 0 ? (
          <section className={showEvergreenSection ? "mb-14" : undefined}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary-green" />
                <h2 className="font-serif text-xl font-semibold text-primary-green">
                  Sessions à venir
                </h2>
                <span className="text-sm text-primary-green/40">
                  ({filteredUpcoming.length})
                </span>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {visibleUpcoming.map((formation) => (
                <FormationCard key={formation.id} formation={formation} />
              ))}
            </div>

            {hiddenUpcomingCount > 0 && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowAllUpcoming(true)}
                  className="border-primary-green/20 text-primary-green hover:bg-primary-green/5"
                >
                  Voir {hiddenUpcomingCount} autre{hiddenUpcomingCount > 1 ? "s" : ""} session{hiddenUpcomingCount > 1 ? "s" : ""}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {showAllUpcoming && filteredUpcoming.length > INITIAL_VISIBLE && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllUpcoming(false)}
                  className="text-sm text-primary-green/50 hover:text-primary-green transition-colors"
                >
                  Réduire
                  <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </section>
        ) : !showEvergreenSection || filteredEvergreen.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background-beige-dark">
              <CalendarDays className="h-8 w-8 text-primary-green/30" />
            </div>
            <h2 className="mt-4 font-serif text-lg font-semibold text-primary-green">
              {hasActiveFilters
                ? "Aucune session ne correspond à vos filtres"
                : "Aucune formation à venir pour le moment"}
            </h2>
            <p className="mt-1 text-sm text-primary-green/50">
              {hasActiveFilters
                ? "Essayez d'ajuster vos filtres ou consultez toutes les sessions."
                : "Les prochaines sessions seront annoncées bientôt."}
            </p>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="mt-3 text-primary-green/60"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        ) : null)}

        {/* Formations sans date — masquees seulement si le toggle "Quand"
            restreint explicitement aux sessions a venir. */}
        {showEvergreenSection && (
          filteredEvergreen.length > 0 ? (
            <section className="mb-14">
              <div className="mb-6 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary-green" />
                <h2 className="font-serif text-xl font-semibold text-primary-green">
                  Disponibles à tout moment
                </h2>
                <span className="text-sm text-primary-green/40">
                  ({filteredEvergreen.length})
                </span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                {filteredEvergreen.map((formation) => (
                  <FormationCard key={formation.id} formation={formation} />
                ))}
              </div>
            </section>
          ) : !showUpcomingSection ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background-beige-dark">
                <Sparkles className="h-8 w-8 text-primary-green/30" />
              </div>
              <h2 className="mt-4 font-serif text-lg font-semibold text-primary-green">
                Aucune formation disponible à tout moment
              </h2>
              <p className="mt-1 text-sm text-primary-green/50">
                Essayez d&apos;ajuster vos filtres ou consultez les sessions à
                venir.
              </p>
            </div>
          ) : null
        )}

        {/* Past formations — collapsible */}
        {filteredPast.length > 0 && (
          <section className="mt-16">
            <button
              onClick={() => setShowPast(!showPast)}
              className="group flex w-full items-center justify-between rounded-lg border border-primary-green/10 bg-background-beige-dark/50 px-5 py-4 text-left transition-colors hover:bg-background-beige-dark"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-green/10">
                  <CalendarDays className="h-4 w-4 text-primary-green/50" />
                </div>
                <div>
                  <h2 className="font-serif text-base font-semibold text-primary-green/70">
                    Sessions passées
                  </h2>
                  <p className="text-xs text-primary-green/40">
                    {filteredPast.length} session{filteredPast.length > 1 ? "s" : ""} organisée{filteredPast.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-primary-green/40 transition-transform duration-200 ${
                  showPast ? "rotate-180" : ""
                }`}
              />
            </button>

            {showPast && (
              <div className="mt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {visiblePast.map((formation) => (
                    <PastFormationCard key={formation.id} formation={formation} />
                  ))}
                </div>

                {hiddenPastCount > 0 && (
                  <div className="mt-6 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllPast(true)}
                      className="text-primary-green/50 hover:text-primary-green"
                    >
                      Voir {hiddenPastCount} autre{hiddenPastCount > 1 ? "s" : ""} session{hiddenPastCount > 1 ? "s" : ""}
                      <ChevronDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {showAllPast && filteredPast.length > PAST_INITIAL_VISIBLE && (
                  <div className="mt-3 text-center">
                    <button
                      onClick={() => setShowAllPast(false)}
                      className="text-xs text-primary-green/40 hover:text-primary-green/60 transition-colors"
                    >
                      Réduire
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Formation Card                                                         */
/* ------------------------------------------------------------------ */

const FormationCard = ({ formation }: { formation: FormationData }) => {
  const typeInfo = FORMATION_TYPE_LABELS[formation.type] ?? FORMATION_TYPE_LABELS.online;
  const TypeIcon = typeInfo.icon;
  const { label: categoryLabel, color: categoryColor } = resolveFormationCategory(
    formation.category,
  );
  // Sans heure saisie, les bornes couvrent la journee entiere : en tirer une
  // duree afficherait un chiffre que personne n'a renseigne.
  const duration = formation.show_time
    ? formatDuration(formation.starts_at, formation.ends_at)
    : null;
  // Une formation permanente n'a pas de date a mettre en avant : `starts_at`
  // n'y porte que la date de mise en ligne.
  const dateLabel = formation.is_evergreen
    ? "À votre rythme"
    : format(new Date(formation.starts_at), "d MMM", { locale: fr, in: PARIS });
  const consultant = formation.consultants as {
    slug: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  const consultantName = consultant?.profiles
    ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
    : null;
  const isFree = formation.price_cents === 0;
  const promoLabel = promoCodeLabel(formation.partner_promo_codes);
  const hasDiscount = formation.discounted_price_cents != null;

  const cardContent = (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <div className="relative text-white">
        {formation.thumbnail_url ? (
          <>
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={formation.thumbnail_url}
                alt={formation.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-linear-to-t from-primary-green/80 via-primary-green/20 to-transparent" />
            </div>
            <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
              <Badge className={`${categoryColor} text-xs`}>{categoryLabel}</Badge>
              <Badge className="bg-black/45 text-white border border-white/30 text-xs backdrop-blur-sm">
                <TypeIcon className="mr-1 h-3 w-3" />
                {typeInfo.label}
              </Badge>
              {promoLabel && (
                <Badge className="bg-amber-500 text-white border-0 text-xs backdrop-blur-sm">
                  <Tag className="mr-1 h-3 w-3" />
                  {promoLabel}
                </Badge>
              )}
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <p className="text-2xl font-bold font-serif">{dateLabel}</p>
              {duration && (
                <div className="flex items-center gap-1.5 text-sm text-white/80">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{duration}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-primary-green p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${categoryColor} text-xs`}>{categoryLabel}</Badge>
              <Badge className="bg-white/90 text-primary-green border-0 text-xs">
                <TypeIcon className="mr-1 h-3 w-3" />
                {typeInfo.label}
              </Badge>
              {promoLabel && (
                <Badge className="bg-amber-500 text-white border-0 text-xs">
                  <Tag className="mr-1 h-3 w-3" />
                  {promoLabel}
                </Badge>
              )}
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold font-serif">{dateLabel}</p>
                {!formation.is_evergreen && (
                  <p className="mt-0.5 text-sm text-white/70">
                    {format(new Date(formation.starts_at), "yyyy", { locale: fr, in: PARIS })}
                  </p>
                )}
              </div>
              {duration && (
                <div className="flex items-center gap-1.5 text-sm text-white/70">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{duration}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col pt-5">
        <div className="flex-1">
          <h3 className="line-clamp-2 font-serif text-base font-semibold text-primary-green">
            {formation.title}
          </h3>
          {formation.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-primary-green/60">
              {formation.description}
            </p>
          )}
          <div className="mt-3 space-y-1.5 text-xs text-primary-green/50">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                {formation.is_evergreen
                  ? "Accessible dès votre inscription"
                  : format(
                      new Date(formation.starts_at),
                      formation.show_time ? "EEEE d MMMM 'à' HH'h'mm" : "EEEE d MMMM",
                      { locale: fr, in: PARIS },
                    )}
              </span>
            </div>
            {formation.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{formation.location}</span>
              </div>
            )}
            {consultantName && (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>{consultantName}</span>
              </div>
            )}
            {formation.provider && (
              <div className="flex items-center gap-1.5">
                {formation.provider.logo_url ? (
                  <Image
                    src={formation.provider.logo_url}
                    alt={formation.provider.name}
                    width={14}
                    height={14}
                    className="rounded-sm"
                  />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                <span>via {formation.provider.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-primary-green/10 pt-4">
          <div>
            {!formation.show_price ? (
              <p className="text-sm text-primary-green/50">
                Tarif : consulter l’organisme
              </p>
            ) : isFree ? (
              <Badge variant="secondary" className="bg-accent-honey-soft text-primary-green">
                {FORMATION_SCHOOL_PRICE_LABEL}
              </Badge>
            ) : hasDiscount ? (
              <div className="flex items-center gap-2">
                <p className="text-sm line-through text-primary-green/40">
                  {formatPrice(formation.price_cents, formation.currency)}
                </p>
                <p className="font-serif text-xl font-bold text-primary-red">
                  {formatPrice(formation.discounted_price_cents!, formation.currency)}
                </p>
              </div>
            ) : (
              <p className="font-serif text-xl font-bold text-primary-green">
                {formatPrice(formation.price_cents, formation.currency)}
              </p>
            )}
          </div>
          {/* Meme intitule pour toutes les cartes : la fiche de detail existe
              desormais aussi pour les formations vendues par un organisme.
              C'est le bouton de la fiche qui sort du site, pas la carte. */}
          <Button
            variant="outline"
            size="sm"
            className="pointer-events-none border-primary-red text-primary-red transition-colors group-hover:bg-primary-red group-hover:text-white"
          >
            En savoir plus
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Link
      href={`/formations/${formation.slug}`}
      className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red"
    >
      {cardContent}
    </Link>
  );
};

/* ------------------------------------------------------------------ */
/*  Past Formation Card (compact)                                          */
/* ------------------------------------------------------------------ */

const PastFormationCard = ({ formation }: { formation: FormationData }) => {
  const { label: categoryLabel } = resolveFormationCategory(formation.category);
  const duration = formation.show_time
    ? formatDuration(formation.starts_at, formation.ends_at)
    : null;

  return (
    <Card className="group flex flex-row overflow-hidden opacity-75 transition-opacity duration-200 hover:opacity-100">
      {/* Compact left image or date block */}
      <div className="relative w-28 shrink-0 text-white">
        {formation.thumbnail_url ? (
          <>
            <Image
              src={formation.thumbnail_url}
              alt={formation.title}
              fill
              className="object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
              sizes="112px"
            />
            <div className="absolute inset-0 bg-primary-green/40" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-primary-green/80">
            <CalendarDays className="h-6 w-6 text-white/60" />
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="flex flex-1 flex-col justify-center py-3 px-4">
        <div className="flex items-center gap-2 text-xs text-primary-green/40">
          <span>
            {format(new Date(formation.starts_at), "d MMM yyyy", { locale: fr, in: PARIS })}
          </span>
          {duration && (
            <>
              <span>·</span>
              <span>{duration}</span>
            </>
          )}
          <span>·</span>
          <span>{categoryLabel}</span>
        </div>
        <h3 className="mt-1 line-clamp-1 font-serif text-sm font-semibold text-primary-green/70">
          {formation.title}
        </h3>
        {formation.location && (
          <div className="mt-1 flex items-center gap-1 text-xs text-primary-green/30">
            <MapPin className="h-3 w-3" />
            <span>{formation.location}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

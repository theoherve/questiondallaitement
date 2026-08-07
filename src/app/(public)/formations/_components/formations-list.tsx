"use client";

import { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { FORMATION_SCHOOL_PRICE_LABEL } from "@/config/formations";

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
  location: string | null;
  max_participants: number | null;
  price_cents: number;
  currency: string;
  show_price: boolean;
  thumbnail_url: string | null;
  consultants: unknown;
  external_url: string | null;
  discounted_price_cents: number | null;
  provider: { name: string; logo_url: string | null } | null;
};

type FormationCategory = "all" | "accompagnement" | "masterclass" | "atelier" | "conference" | "live" | "autre";

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

const categorizeFormation = (title: string): { category: Exclude<FormationCategory, "all">; label: string; color: string } => {
  const t = title.toLowerCase();
  if (t.startsWith("accompagnement")) return { category: "accompagnement", label: "Formation", color: "bg-primary-red text-white" };
  if (t.startsWith("masterclass")) return { category: "masterclass", label: "Masterclass", color: "bg-amber-600 text-white" };
  if (t.startsWith("atelier")) return { category: "atelier", label: "Atelier", color: "bg-primary-green text-white" };
  if (t.includes("conférence") || t.includes("conference")) return { category: "conference", label: "Conférence", color: "bg-blue-700 text-white" };
  if (t.startsWith("live")) return { category: "live", label: "Live", color: "bg-pink-600 text-white" };
  return { category: "autre", label: "Formation", color: "bg-primary-green/80 text-white" };
};

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

const CATEGORY_FILTERS: { value: FormationCategory; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "accompagnement", label: "Formations" },
  { value: "masterclass", label: "Masterclass" },
  { value: "atelier", label: "Ateliers" },
  { value: "conference", label: "Conférences" },
  { value: "live", label: "Lives" },
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export const FormationsList = ({
  upcomingFormations,
  pastFormations,
}: {
  upcomingFormations: FormationData[];
  pastFormations: FormationData[];
}) => {
  const [activeCategory, setActiveCategory] = useState<FormationCategory>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);

  // Build a set of dates that have formations (for calendar highlighting)
  const formationDates = useMemo(() => {
    return upcomingFormations.map((e) => startOfDay(new Date(e.starts_at)));
  }, [upcomingFormations]);

  // Determine which categories actually have formations
  const availableCategories = useMemo(() => {
    const allFormations = [...upcomingFormations, ...pastFormations];
    const cats = new Set(allFormations.map((e) => categorizeFormation(e.title).category));
    return CATEGORY_FILTERS.filter((f) => f.value === "all" || cats.has(f.value));
  }, [upcomingFormations, pastFormations]);

  // Filter formations by category + selected date
  const filteredUpcoming = useMemo(() => {
    let result = upcomingFormations;
    if (activeCategory !== "all") {
      result = result.filter((e) => categorizeFormation(e.title).category === activeCategory);
    }
    if (selectedDate) {
      result = result.filter((e) => isSameDay(new Date(e.starts_at), selectedDate));
    }
    return result;
  }, [upcomingFormations, activeCategory, selectedDate]);

  const filteredPast = useMemo(() => {
    let result = pastFormations;
    if (activeCategory !== "all") {
      result = result.filter((e) => categorizeFormation(e.title).category === activeCategory);
    }
    if (selectedDate) {
      result = result.filter((e) => isSameDay(new Date(e.starts_at), selectedDate));
    }
    return result;
  }, [pastFormations, activeCategory, selectedDate]);

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
    setActiveCategory("all");
    setSelectedDate(undefined);
    setShowAllUpcoming(false);
    setShowAllPast(false);
  }, []);

  const hasActiveFilters = activeCategory !== "all" || selectedDate !== undefined;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
      {/* ============================================================ */}
      {/* Left sidebar: Calendar + Filters (sticky on desktop)         */}
      {/* ============================================================ */}
      <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-70 lg:self-start">
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
                    ? upcomingFormations.length + pastFormations.length
                    : [...upcomingFormations, ...pastFormations].filter(
                        (e) => categorizeFormation(e.title).category === cat.value
                      ).length;

                return (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setActiveCategory(cat.value);
                      setShowAllUpcoming(false);
                      setShowAllPast(false);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
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

        {/* Upcoming formations */}
        {filteredUpcoming.length > 0 ? (
          <section>
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
        ) : (
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
  const { label: categoryLabel, color: categoryColor } = categorizeFormation(formation.title);
  const duration = formatDuration(formation.starts_at, formation.ends_at);
  const consultant = formation.consultants as {
    slug: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  const consultantName = consultant?.profiles
    ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
    : null;
  const isFree = formation.price_cents === 0;
  const isExternal = !!formation.external_url;
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
              <Badge className="bg-white/15 text-white border-0 text-xs backdrop-blur-sm">
                <TypeIcon className="mr-1 h-3 w-3" />
                {typeInfo.label}
              </Badge>
              {isExternal && (
                <Badge className="bg-amber-500 text-white border-0 text-xs backdrop-blur-sm">
                  <Tag className="mr-1 h-3 w-3" />
                  Code MILKPOWER
                </Badge>
              )}
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <p className="text-2xl font-bold font-serif">
                {format(new Date(formation.starts_at), "d MMM", { locale: fr })}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-white/80">
                <Clock className="h-3.5 w-3.5" />
                <span>{duration}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-primary-green p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${categoryColor} text-xs`}>{categoryLabel}</Badge>
              <Badge className="bg-white/15 text-white border-0 text-xs">
                <TypeIcon className="mr-1 h-3 w-3" />
                {typeInfo.label}
              </Badge>
              {isExternal && (
                <Badge className="bg-amber-500 text-white border-0 text-xs">
                  <Tag className="mr-1 h-3 w-3" />
                  Code MILKPOWER
                </Badge>
              )}
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold font-serif">
                  {format(new Date(formation.starts_at), "d MMM", { locale: fr })}
                </p>
                <p className="mt-0.5 text-sm text-white/70">
                  {format(new Date(formation.starts_at), "yyyy", { locale: fr })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-white/70">
                <Clock className="h-3.5 w-3.5" />
                <span>{duration}</span>
              </div>
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
                {format(new Date(formation.starts_at), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
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
              <p className="text-sm text-primary-green/50">Tarif à venir</p>
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
            className="pointer-formations-none border-primary-red text-primary-red transition-colors group-hover:bg-primary-red group-hover:text-white"
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
  const { label: categoryLabel } = categorizeFormation(formation.title);
  const duration = formatDuration(formation.starts_at, formation.ends_at);

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
          <span>{format(new Date(formation.starts_at), "d MMM yyyy", { locale: fr })}</span>
          <span>·</span>
          <span>{duration}</span>
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

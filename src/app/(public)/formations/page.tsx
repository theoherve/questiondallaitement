import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  MapPin,
  Video,
  Users,
  Clock,
  GraduationCap,
  Monitor,
  ShieldCheck,
  Award,
  ArrowRight,
  Timer,
  Sparkles,
  History,
} from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Formations professionnelles",
  description:
    "Formations, ateliers et webinaires pour professionnels de santé en lactation et allaitement. Avec Carole Hervé, consultante IBCLC.",
};

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: typeof Video }> = {
  online: { label: "En ligne", icon: Video },
  in_person: { label: "Présentiel", icon: MapPin },
  hybrid: { label: "Hybride", icon: Users },
};

const formatPrice = (cents: number, currency: string): string => {
  if (cents === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
};

type EventCategory = "formation" | "masterclass" | "atelier" | "conference" | "live" | "autre";

const categorizeEvent = (title: string): { category: EventCategory; label: string; color: string } => {
  const t = title.toLowerCase();
  if (t.startsWith("formation")) return { category: "formation", label: "Formation", color: "bg-primary-red text-white" };
  if (t.startsWith("masterclass")) return { category: "masterclass", label: "Masterclass", color: "bg-amber-600 text-white" };
  if (t.startsWith("atelier")) return { category: "atelier", label: "Atelier", color: "bg-primary-green text-white" };
  if (t.includes("conférence") || t.includes("conference")) return { category: "conference", label: "Conférence", color: "bg-blue-700 text-white" };
  if (t.startsWith("live")) return { category: "live", label: "Live", color: "bg-pink-600 text-white" };
  return { category: "autre", label: "Événement", color: "bg-primary-green/80 text-white" };
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

const getCountdown = (startsAt: string): string | null => {
  const start = new Date(startsAt);
  const now = new Date();
  const days = differenceInDays(start, now);
  if (days > 30) return null;
  if (days > 1) return `Dans ${days} jours`;
  if (days === 1) return "Demain";
  const hours = differenceInHours(start, now);
  if (hours > 0) return `Dans ${hours}h`;
  return null;
};

const BENEFITS = [
  { icon: Monitor, label: "En visio Zoom" },
  { icon: GraduationCap, label: "Formatrice IBCLC" },
  { icon: ShieldCheck, label: "Attestation fournie" },
  { icon: Award, label: "Approche fondée sur les preuves" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

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
      thumbnail_url,
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

  const all = events ?? [];
  const now = new Date().toISOString();
  const upcomingEvents = all.filter((e) => e.starts_at >= now);
  const pastEvents = all.filter((e) => e.starts_at < now).reverse(); // most recent first
  const [featured, ...upcoming] = upcomingEvents;

  return (
    <div>
      {/* ============================================================ */}
      {/* Hero Section                                                 */}
      {/* ============================================================ */}
      <section className="bg-primary-green px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Formations professionnelles
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-white/80">
            Formations certifiantes en allaitement maternel et parentalité.
            Approche scientifique et bienveillante.
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
            {upcomingEvents.some((e) => e.price_cents === 0) && (
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Sessions gratuites disponibles
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Benefits Strip                                               */}
      {/* ============================================================ */}
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

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {upcomingEvents.length === 0 ? (
          /* ============================================================ */
          /* Empty State (no upcoming)                                    */
          /* ============================================================ */
          <div className="py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center bg-background-beige-dark">
              <CalendarDays className="h-10 w-10 text-primary-green/30" />
            </div>
            <h2 className="mt-6 font-serif text-xl font-semibold text-primary-green">
              Aucune formation à venir pour le moment
            </h2>
            <p className="mt-2 text-primary-green/60">
              Les prochaines sessions seront annoncées bientôt. Consultez nos sessions passées ci-dessous.
            </p>
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* Featured — Next Formation                                    */}
            {/* ============================================================ */}
            {featured && (
              <section>
                <div className="mb-6 flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary-red" />
                  <h2 className="font-serif text-xl font-semibold text-primary-green">
                    Prochaine session
                  </h2>
                </div>
                <FeaturedEventCard event={featured} />
              </section>
            )}

            {/* ============================================================ */}
            {/* Upcoming Sessions Grid                                       */}
            {/* ============================================================ */}
            {upcoming.length > 0 && (
              <section className="mt-16">
                <div className="mb-6 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary-green" />
                  <h2 className="font-serif text-xl font-semibold text-primary-green">
                    Toutes les sessions à venir
                  </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* Past Sessions — horizontal scroll, max 6 visible            */}
        {/* ============================================================ */}
        {pastEvents.length > 0 && (
          <section className={upcomingEvents.length > 0 ? "mt-20" : "mt-4"}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary-green/50" />
                <h2 className="font-serif text-xl font-semibold text-primary-green/70">
                  Sessions passées
                </h2>
              </div>
              <span className="text-sm text-primary-green/40">
                {pastEvents.length} session{pastEvents.length > 1 ? "s" : ""} organisée{pastEvents.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mb-6 text-sm text-primary-green/50">
              Un aperçu de notre expertise et des thématiques abordées.
            </p>
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-none sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              {pastEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="w-72 shrink-0 sm:w-80">
                  <PastEventCard event={event} />
                </div>
              ))}
              {pastEvents.length > 6 && (
                <div className="flex w-52 shrink-0 items-center justify-center">
                  <p className="text-center text-sm text-primary-green/40">
                    + {pastEvents.length - 6} autre{pastEvents.length - 6 > 1 ? "s" : ""} session{pastEvents.length - 6 > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default FormationsProPage;

/* ------------------------------------------------------------------ */
/*  Featured Event Card (hero-style)                                  */
/* ------------------------------------------------------------------ */

type EventData = {
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
  thumbnail_url: string | null;
  consultants: unknown;
};

const FeaturedEventCard = ({ event }: { event: EventData }) => {
  const typeInfo = EVENT_TYPE_LABELS[event.type] ?? EVENT_TYPE_LABELS.online;
  const TypeIcon = typeInfo.icon;
  const { label: categoryLabel, color: categoryColor } = categorizeEvent(event.title);
  const duration = formatDuration(event.starts_at, event.ends_at);
  const countdown = getCountdown(event.starts_at);
  const consultant = event.consultants as {
    slug: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  const consultantName = consultant?.profiles
    ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
    : null;

  return (
    <Card className="group overflow-hidden border-primary-red/20 shadow-md transition-shadow duration-200 hover:shadow-lg">
      {/* Mobile: image at top */}
      {event.thumbnail_url && (
        <div className="relative aspect-video w-full overflow-hidden lg:hidden">
          <Image
            src={event.thumbnail_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="100vw"
          />
          {/* Overlay with date + price on mobile */}
          <div className="absolute inset-0 bg-linear-to-t from-primary-green/90 via-primary-green/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
            <div>
              <p className="text-3xl font-bold font-serif">
                {format(new Date(event.starts_at), "d MMM", { locale: fr })}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                <Clock className="h-3.5 w-3.5" />
                <span>{duration}</span>
              </div>
            </div>
            <p className="text-2xl font-bold font-serif">
              {formatPrice(event.price_cents, event.currency)}
            </p>
          </div>
          {countdown && (
            <div className="absolute left-4 top-4">
              <Badge className="bg-white/20 text-white border-0 text-xs backdrop-blur-sm">
                {countdown}
              </Badge>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-5">
        {/* Left — image area (desktop) */}
        <div className="relative hidden overflow-hidden lg:col-span-2 lg:block">
          {event.thumbnail_url ? (
            <>
              <Image
                src={event.thumbnail_url}
                alt={event.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
              <div className="absolute inset-0 bg-linear-to-t from-primary-green/80 via-primary-green/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="text-5xl font-bold font-serif">
                  {format(new Date(event.starts_at), "d", { locale: fr })}
                </p>
                <p className="mt-1 text-lg font-medium capitalize">
                  {format(new Date(event.starts_at), "MMMM yyyy", { locale: fr })}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">{duration}</span>
                  </div>
                  <p className="text-2xl font-bold font-serif">
                    {formatPrice(event.price_cents, event.currency)}
                  </p>
                </div>
              </div>
              {countdown && (
                <div className="absolute left-6 top-6">
                  <Badge className="bg-white/20 text-white border-0 text-xs backdrop-blur-sm">
                    {countdown}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 bg-primary-green p-8 text-white lg:p-10">
              {countdown && (
                <div className="absolute left-4 top-4">
                  <Badge className="bg-white/20 text-white border-0 text-xs">
                    {countdown}
                  </Badge>
                </div>
              )}
              <div className="text-center">
                <p className="text-5xl font-bold font-serif lg:text-6xl">
                  {format(new Date(event.starts_at), "d", { locale: fr })}
                </p>
                <p className="mt-1 text-lg font-medium capitalize">
                  {format(new Date(event.starts_at), "MMMM yyyy", { locale: fr })}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white/15 px-4 py-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">{duration}</span>
              </div>
              <p className="text-3xl font-bold font-serif lg:text-4xl">
                {formatPrice(event.price_cents, event.currency)}
              </p>
            </div>
          )}
        </div>

        {/* Right — content */}
        <div className="flex flex-col justify-between p-6 lg:col-span-3 lg:p-8">
          <div>
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={categoryColor}>{categoryLabel}</Badge>
              <Badge variant="secondary" className="bg-primary-green/10 text-primary-green">
                <TypeIcon className="mr-1 h-3 w-3" />
                {typeInfo.label}
              </Badge>
            </div>

            {/* Title */}
            <h3 className="mt-4 font-serif text-xl font-bold text-primary-green lg:text-2xl">
              {event.title}
            </h3>

            {/* Description */}
            {event.description && (
              <p className="mt-3 line-clamp-3 text-base leading-relaxed text-primary-green/70">
                {event.description}
              </p>
            )}

            {/* Meta details */}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-green/60">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {format(new Date(event.starts_at), "EEEE d MMMM", { locale: fr })}
                  {" — "}
                  {format(new Date(event.ends_at), "EEEE d MMMM yyyy", { locale: fr })}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.max_participants && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{event.max_participants} places max</span>
                </div>
              )}
            </div>

            {/* Consultant */}
            {consultantName && (
              <p className="mt-4 text-sm text-primary-green/50">
                Avec <span className="font-medium text-primary-green/70">{consultantName}</span>
              </p>
            )}
          </div>

          <div className="mt-6">
            <Button
              asChild
              size="lg"
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              <Link href={`/formations/${event.slug}`}>
                Réserver ma place
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  Regular Event Card                                                */
/* ------------------------------------------------------------------ */

const EventCard = ({ event }: { event: EventData }) => {
  const typeInfo = EVENT_TYPE_LABELS[event.type] ?? EVENT_TYPE_LABELS.online;
  const TypeIcon = typeInfo.icon;
  const { label: categoryLabel, color: categoryColor } = categorizeEvent(event.title);
  const duration = formatDuration(event.starts_at, event.ends_at);
  const countdown = getCountdown(event.starts_at);
  const consultant = event.consultants as {
    slug: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  const consultantName = consultant?.profiles
    ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
    : null;

  const isFree = event.price_cents === 0;

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* Top section — image or date visual */}
      <div className="relative text-white">
        {event.thumbnail_url ? (
          <>
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={event.thumbnail_url}
                alt={event.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-linear-to-t from-primary-green/80 via-primary-green/20 to-transparent" />
            </div>
            {/* Overlaid badges */}
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <Badge className={`${categoryColor} text-xs`}>{categoryLabel}</Badge>
              <Badge className="bg-white/15 text-white border-0 text-xs backdrop-blur-sm">
                <TypeIcon className="mr-1 h-3 w-3" />
                {typeInfo.label}
              </Badge>
            </div>
            {countdown && (
              <span className="absolute right-4 top-4 text-xs font-medium text-white/80 bg-black/30 px-2 py-1 backdrop-blur-sm">
                {countdown}
              </span>
            )}
            {/* Overlaid date + duration */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold font-serif">
                  {format(new Date(event.starts_at), "d MMM", { locale: fr })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-white/80">
                <Clock className="h-3.5 w-3.5" />
                <span>{duration}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-primary-green p-5">
            {/* Category + type badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`${categoryColor} text-xs`}>{categoryLabel}</Badge>
                <Badge className="bg-white/15 text-white border-0 text-xs">
                  <TypeIcon className="mr-1 h-3 w-3" />
                  {typeInfo.label}
                </Badge>
              </div>
              {countdown && (
                <span className="text-xs font-medium text-white/60">{countdown}</span>
              )}
            </div>
            {/* Date + duration row */}
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold font-serif">
                  {format(new Date(event.starts_at), "d MMM", { locale: fr })}
                </p>
                <p className="mt-0.5 text-sm text-white/70">
                  {format(new Date(event.starts_at), "yyyy", { locale: fr })}
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

      {/* Content */}
      <CardContent className="flex flex-1 flex-col pt-5">
        <div className="flex-1">
          {/* Title */}
          <h3 className="line-clamp-2 font-serif text-base font-semibold text-primary-green">
            {event.title}
          </h3>

          {/* Description */}
          {event.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-primary-green/60">
              {event.description}
            </p>
          )}

          {/* Meta */}
          <div className="mt-3 space-y-1.5 text-xs text-primary-green/50">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                {format(new Date(event.starts_at), "EEEE d MMMM 'à' HH'h'mm", {
                  locale: fr,
                })}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{event.location}</span>
              </div>
            )}
            {consultantName && (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>{consultantName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Price + CTA */}
        <div className="mt-5 flex items-center justify-between border-t border-primary-green/10 pt-4">
          <div>
            {isFree ? (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                Gratuit
              </Badge>
            ) : (
              <p className="font-serif text-xl font-bold text-primary-green">
                {formatPrice(event.price_cents, event.currency)}
              </p>
            )}
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-primary-red text-primary-red hover:bg-primary-red hover:text-white"
          >
            <Link href={`/formations/${event.slug}`}>
              En savoir plus
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  Past Event Card (compact, muted)                                  */
/* ------------------------------------------------------------------ */

const PastEventCard = ({ event }: { event: EventData }) => {
  const { label: categoryLabel } = categorizeEvent(event.title);
  const duration = formatDuration(event.starts_at, event.ends_at);

  return (
    <Card className="group flex h-full flex-col overflow-hidden opacity-75 transition-opacity duration-200 hover:opacity-100">
      {/* Image or compact header */}
      <div className="relative text-white">
        {event.thumbnail_url ? (
          <>
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={event.thumbnail_url}
                alt={event.title}
                fill
                className="object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-linear-to-t from-primary-green/70 to-transparent" />
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <p className="text-lg font-bold font-serif">
                {format(new Date(event.starts_at), "d MMM yyyy", { locale: fr })}
              </p>
              <span className="text-xs text-white/70">{duration}</span>
            </div>
            <Badge className="absolute left-3 top-3 bg-black/40 text-white border-0 text-xs backdrop-blur-sm">
              {categoryLabel}
            </Badge>
          </>
        ) : (
          <div className="bg-primary-green/80 p-4">
            <Badge className="bg-white/15 text-white border-0 text-xs">
              {categoryLabel}
            </Badge>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-xl font-bold font-serif">
                {format(new Date(event.starts_at), "d MMM yyyy", { locale: fr })}
              </p>
              <span className="text-xs text-white/60">{duration}</span>
            </div>
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col pt-4">
        <h3 className="line-clamp-2 font-serif text-sm font-semibold text-primary-green">
          {event.title}
        </h3>
        {event.location && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-primary-green/40">
            <MapPin className="h-3 w-3" />
            <span>{event.location}</span>
          </div>
        )}
        <div className="mt-auto pt-3">
          <Badge variant="outline" className="border-primary-green/20 text-primary-green/40 text-xs">
            Terminée
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

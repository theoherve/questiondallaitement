import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Clock,
  MapPin,
  Video,
  Users,
  GraduationCap,
  Monitor,
  ArrowLeft,
  ShieldCheck,
  Award,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FORMATION_SCHOOL_PRICE_HINT,
  FORMATION_SCHOOL_PRICE_LABEL,
} from "@/config/formations";
import { RegisterButton } from "../register-button";
import { RegistrationReconciler } from "../registration-reconciler";

const formatPrice = (cents: number, currency: string): string => {
  if (cents === 0) return FORMATION_SCHOOL_PRICE_LABEL;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
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

const HIGHLIGHTS = [
  { icon: Monitor, text: "Formation en visio Zoom" },
  { icon: ShieldCheck, text: "Attestation de formation" },
  { icon: Award, text: "Approche fondée sur les preuves" },
  { icon: GraduationCap, text: "Formatrice certifiée IBCLC" },
];

export type EventDetailConsultant = {
  slug: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
} | null;

export type EventDetailProps = {
  event: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    summary_html: string | null;
    long_description: string | null;
    type: "online" | "in_person" | "hybrid";
    starts_at: string;
    ends_at: string;
    location: string | null;
    max_participants: number | null;
    price_cents: number;
    currency: string;
    show_price: boolean;
    thumbnail_url: string | null;
  };
  consultant: EventDetailConsultant;
  isAlreadyRegistered: boolean;
  isFullyBooked: boolean;
  registrationsCount: number;
  isAuthenticated: boolean;
  awaitingRegistration: boolean;
  isPreview?: boolean;
};

/**
 * Rendu de la page de detail d'une formation. Sorti de la route pour que
 * l'apercu du back-office affiche exactement la meme chose sur un brouillon :
 * la recuperation des donnees reste a l'appelant, ce composant ne fait que
 * presenter.
 */
export const EventDetail = ({
  event,
  consultant,
  isAlreadyRegistered,
  isFullyBooked,
  registrationsCount,
  isAuthenticated,
  awaitingRegistration,
  isPreview = false,
}: EventDetailProps) => {
  const consultantName = consultant?.profiles
    ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
    : "Consultante";

  const typeLabel =
    event.type === "online"
      ? "En ligne"
      : event.type === "in_person"
        ? "Présentiel"
        : "Hybride";

  const TypeIcon =
    event.type === "online"
      ? Video
      : event.type === "in_person"
        ? MapPin
        : Users;

  const { label: categoryLabel } = categorizeEvent(event.title);
  const duration = formatDuration(event.starts_at, event.ends_at);
  const isFree = event.price_cents === 0;
  const isPast = new Date(event.ends_at) < new Date();
  const isMultiDay = new Date(event.ends_at).getDate() !== new Date(event.starts_at).getDate();
  const spotsLeft = event.max_participants
    ? event.max_participants - registrationsCount
    : null;

  return (
    <div>
      {/* ============================================================ */}
      {/* Hero : aplat rose a gauche, visuel net a droite               */}
      {/* ============================================================ */}
      <section className="relative bg-primary-rose">
        <div
          className={`relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 ${
            event.thumbnail_url ? "lg:pr-[calc(38%+2rem)]" : ""
          }`}
        >
          {/* Back link */}
          <Link
            href="/formations"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Toutes les formations
          </Link>

          <div>
            <div>
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Sur l'aplat rose, la pastille de categorie se pose en blanc :
                    ses couleurs pleines (primary-red, pink-600) s'y noieraient. */}
                <Badge className="bg-white text-primary-rose border-0">
                  {categoryLabel}
                </Badge>
                <Badge className="bg-white/15 text-white border-0">
                  <TypeIcon className="mr-1 h-3 w-3" />
                  {typeLabel}
                </Badge>
                {isPast && (
                  <Badge className="bg-white/15 text-white/80 border-0">
                    Terminée
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="mt-4 font-serif text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                {event.title}
              </h1>

              {/* Short description */}
              {event.description && (
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/90">
                  {event.description}
                </p>
              )}

              {/* Quick meta */}
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    {format(new Date(event.starts_at), "d MMMM yyyy", { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{duration}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  <span>{consultantName}</span>
                </div>
              </div>
            </div>

            {/* Price highlight (desktop) */}
            {event.show_price && (
              <div className="mt-8 hidden border-t border-white/25 pt-6 lg:block">
                <p className="font-serif text-4xl font-bold text-white">
                  {formatPrice(event.price_cents, event.currency)}
                </p>
                {isFree && (
                  <p className="mt-1 text-sm text-white/80">
                    {FORMATION_SCHOOL_PRICE_HINT}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Visuel : sous le texte en mobile, cale a droite en desktop.
            Aucun voile, et `contain` plutot que `cover` — les vignettes sont
            des supports de formation composes, un recadrage les mutile. */}
        {event.thumbnail_url && (
          <div className="relative h-56 w-full sm:h-72 lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[38%]">
            <Image
              src={event.thumbnail_url}
              alt={event.title}
              fill
              className="object-contain p-6 lg:p-10"
              sizes="(min-width: 1024px) 38vw, 100vw"
              priority
            />
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* Main content + sidebar                                       */}
      {/* ============================================================ */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* -------------------------------------------------------- */}
          {/* Left — Content                                           */}
          {/* -------------------------------------------------------- */}
          <div className="lg:col-span-2 space-y-10">
            {/* Highlights strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex flex-col items-center gap-2 bg-background-beige-dark p-4 text-center"
                >
                  <Icon className="h-5 w-5 text-primary-red" />
                  <span className="text-xs font-medium text-primary-green">
                    {text}
                  </span>
                </div>
              ))}
            </div>

            {/* Detailed description */}
            {event.long_description && (
              <div>
                <h2 className="font-serif text-xl font-semibold text-primary-green">
                  À propos de cette formation
                </h2>
                <div
                  className="prose-formation mt-4 max-w-none text-primary-green/80 [&_p]:mb-3 [&_p]:leading-relaxed [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:text-primary-green/80 [&_strong]:text-primary-green [&_strong]:font-semibold [&_em]:text-primary-red"
                  dangerouslySetInnerHTML={{ __html: event.long_description }}
                />
              </div>
            )}

            {/* Fallback if no long description */}
            {!event.long_description && event.description && (
              <div>
                <h2 className="font-serif text-xl font-semibold text-primary-green">
                  À propos de cette formation
                </h2>
                <p className="mt-4 leading-relaxed text-primary-green/70">
                  {event.description}
                </p>
              </div>
            )}

            {/* Consultant section */}
            <div className="border-t border-primary-green/10 pt-8">
              <h2 className="font-serif text-xl font-semibold text-primary-green">
                Votre formatrice
              </h2>
              <div className="mt-4 flex items-center gap-4">
                {consultant?.profiles?.avatar_url ? (
                  <Image
                    src={consultant.profiles.avatar_url}
                    alt={consultantName}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-green/10">
                    <GraduationCap className="h-7 w-7 text-primary-green/40" />
                  </div>
                )}
                <div>
                  <p className="font-serif text-lg font-semibold text-primary-green">
                    {consultantName}
                  </p>
                  <p className="text-sm text-primary-green/60">
                    Consultante en lactation certifiée IBCLC
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/* Right — Sticky sidebar                                   */}
          {/* -------------------------------------------------------- */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <Card className="border-primary-green/10 shadow-md">
                <CardContent className="space-y-5 pt-6">
                  {/* Price */}
                  <div className="text-center">
                    {!event.show_price ? (
                      <p className="text-sm text-muted-foreground">
                        Tarif à venir
                      </p>
                    ) : isFree ? (
                      <>
                        <Badge className="bg-accent-honey-soft px-4 py-1 text-lg text-primary-green">
                          {FORMATION_SCHOOL_PRICE_LABEL}
                        </Badge>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {FORMATION_SCHOOL_PRICE_HINT}
                        </p>
                      </>
                    ) : (
                      <p className="font-serif text-3xl font-bold text-primary-green">
                        {formatPrice(event.price_cents, event.currency)}
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-primary-green/10" />

                  {/* Details list */}
                  <div className="space-y-3 text-sm text-primary-green/70">
                    {/* Date */}
                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                      <div>
                        <p className="font-medium text-primary-green">
                          {isMultiDay
                            ? `${format(new Date(event.starts_at), "d", { locale: fr })} — ${format(new Date(event.ends_at), "d MMMM yyyy", { locale: fr })}`
                            : format(new Date(event.starts_at), "EEEE d MMMM yyyy", { locale: fr })}
                        </p>
                        <p className="text-xs text-primary-green/50 capitalize">
                          {isMultiDay
                            ? `${format(new Date(event.starts_at), "EEEE", { locale: fr })} et ${format(new Date(event.ends_at), "EEEE", { locale: fr })}`
                            : format(new Date(event.starts_at), "EEEE", { locale: fr })}
                        </p>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-start gap-3">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                      <div>
                        <p className="font-medium text-primary-green">
                          {format(new Date(event.starts_at), "HH'h'mm", { locale: fr })}
                          {" — "}
                          {format(new Date(event.ends_at), "HH'h'mm", { locale: fr })}
                        </p>
                        <p className="text-xs text-primary-green/50">
                          Durée : {duration}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                        <div>
                          <p className="font-medium text-primary-green">
                            {event.location}
                          </p>
                          <p className="text-xs text-primary-green/50">
                            {typeLabel}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Spots */}
                    {event.max_participants && (
                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                        <div>
                          <p className="font-medium text-primary-green">
                            {spotsLeft !== null && spotsLeft > 0
                              ? `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} restante${spotsLeft > 1 ? "s" : ""}`
                              : spotsLeft === 0
                                ? "Complet"
                                : `${event.max_participants} places`}
                          </p>
                          {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5 && (
                            <p className="text-xs font-medium text-primary-red">
                              Places limitées
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-primary-green/10" />

                  {/* CTA */}
                  {awaitingRegistration && (
                    <div className="mb-3">
                      <RegistrationReconciler eventId={event.id} />
                    </div>
                  )}
                  <RegisterButton
                    eventId={event.id}
                    isFree={isFree}
                    isFullyBooked={isFullyBooked}
                    isAlreadyRegistered={isAlreadyRegistered}
                    isPast={isPast}
                    isAuthenticated={isAuthenticated}
                    priceCents={event.price_cents}
                    currency={event.currency}
                    isPreview={isPreview}
                  />

                  {/* Trust indicators */}
                  <div className="space-y-2 pt-2">
                    {[
                      "Paiement sécurisé",
                      "Attestation de participation",
                      "Support disponible",
                    ].map((text) => (
                      <div
                        key={text}
                        className="flex items-center gap-2 text-xs text-primary-green/40"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

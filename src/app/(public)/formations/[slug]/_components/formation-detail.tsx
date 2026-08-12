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
  Target,
  BookOpen,
  ArrowLeft,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import { resolveFormationHighlights } from "@/config/formation-highlights";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FORMATION_SCHOOL_PRICE_HINT,
  FORMATION_SCHOOL_PRICE_LABEL,
} from "@/config/formations";
import { resolveFormationCategory } from "@/config/formation-categories";
import { PARIS } from "@/lib/formations/paris-time";
import { promoCodeLabel } from "@/lib/formations/external-url";
import { RegisterButton } from "../register-button";
import { RegistrationReconciler } from "../registration-reconciler";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";

const formatPrice = (cents: number, currency: string): string => {
  if (cents === 0) return FORMATION_SCHOOL_PRICE_LABEL;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
};

/** Formate une date de formation dans le fuseau des sessions. */
const parisFormat = (isoDate: string, pattern: string): string =>
  format(new Date(isoDate), pattern, { locale: fr, in: PARIS });

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

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

/**
 * Base commune aux trois sections editoriales : le contenu vient de
 * l'editeur du back-office, donc on ne peut styler que par selecteur.
 */
const PROSE_BASE =
  "text-primary-green/80 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-primary-green [&_em]:not-italic [&_em]:text-primary-red [&_a]:underline [&_a]:underline-offset-2";

/**
 * Objectifs : chaque puce devient une pastille cochee, sur deux colonnes des
 * qu'il y a la place. La coche est un pseudo-element, donc elle s'applique
 * quelle que soit la profondeur du balisage saisi.
 */
const PROSE_OBJECTIVES = `${PROSE_BASE} [&_ul]:grid [&_ul]:gap-x-6 [&_ul]:gap-y-3 sm:[&_ul]:grid-cols-2 [&_li]:relative [&_li]:list-none [&_li]:pl-8 [&_li]:leading-relaxed [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-0.5 [&_li]:before:flex [&_li]:before:h-5 [&_li]:before:w-5 [&_li]:before:items-center [&_li]:before:justify-center [&_li]:before:rounded-full [&_li]:before:bg-primary-green/10 [&_li]:before:text-[0.7rem] [&_li]:before:font-bold [&_li]:before:text-primary-green [&_li]:before:content-['✓']`;

/**
 * Programme : liste numerotee transformee en fil vertical. Le compteur CSS
 * evite de dependre du numero saisi, et le trait de liaison est masque sur le
 * dernier element pour ne pas pendre dans le vide.
 */
const PROSE_PROGRAM =
  "[&_ol]:list-none [&_ol]:space-y-6 [&_ol]:[counter-reset:step] [&_ol]:pl-0 [&_ol>li]:relative [&_ol>li]:pl-14 [&_ol>li]:leading-relaxed [&_ol>li]:text-primary-green/80 [&_ol>li]:before:absolute [&_ol>li]:before:left-0 [&_ol>li]:before:top-0 [&_ol>li]:before:flex [&_ol>li]:before:h-9 [&_ol>li]:before:w-9 [&_ol>li]:before:items-center [&_ol>li]:before:justify-center [&_ol>li]:before:rounded-full [&_ol>li]:before:bg-primary-rose [&_ol>li]:before:text-sm [&_ol>li]:before:font-semibold [&_ol>li]:before:text-white [&_ol>li]:before:[counter-increment:step] [&_ol>li]:before:content-[counter(step)] [&_ol>li]:after:absolute [&_ol>li]:after:left-[1.0625rem] [&_ol>li]:after:top-10 [&_ol>li]:after:bottom-[-1.5rem] [&_ol>li]:after:w-px [&_ol>li]:after:bg-primary-green/15 [&_ol>li:last-child]:after:hidden [&_ol_strong]:font-semibold [&_ol_strong]:text-primary-green [&_ol_p]:mb-1 [&_ol_p:last-child]:mb-0";

/** Un titre de section : pastille iconographiee + intitule serif. */
const SectionHeading = ({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-rose/10 text-primary-rose">
      <Icon className="h-4.5 w-4.5" />
    </span>
    <h2 className="font-serif text-xl font-semibold text-primary-green">
      {children}
    </h2>
  </div>
);

export type FormationDetailConsultant = {
  slug: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
} | null;

export type FormationDetailProps = {
  formation: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    summary_html: string | null;
    objectives_html: string | null;
    program_html: string | null;
    audience_html: string | null;
    highlights: string[] | null;
    external_url: string | null;
    /** Codes de reduction de l'organisme, annonces sous le bouton. */
    partner_promo_codes: string[] | null;
    type: "online" | "in_person" | "hybrid";
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
    category: string;
    /** Mention libre (certification, éligibilité). Rien si vide. */
    badge: string | null;
    /** true = accessible en permanence, aucune date à annoncer. */
    is_evergreen: boolean;
  };
  consultant: FormationDetailConsultant;
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
export const FormationDetail = ({
  formation,
  consultant,
  isAlreadyRegistered,
  isFullyBooked,
  registrationsCount,
  isAuthenticated,
  awaitingRegistration,
  isPreview = false,
}: FormationDetailProps) => {
  const consultantName = consultant?.profiles
    ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
    : "Consultante";

  const typeLabel =
    formation.type === "online"
      ? "En ligne"
      : formation.type === "in_person"
        ? "Présentiel"
        : "Hybride";

  const TypeIcon =
    formation.type === "online"
      ? Video
      : formation.type === "in_person"
        ? MapPin
        : Users;

  const { label: categoryLabel, color: categoryColor } = resolveFormationCategory(
    formation.category,
  );
  const highlights = resolveFormationHighlights(formation.highlights);
  // Sans heure saisie, les bornes couvrent la journee entiere : en tirer une
  // duree afficherait un chiffre que personne n'a renseigne.
  const duration = formation.show_time
    ? formatDuration(formation.starts_at, formation.ends_at)
    : null;
  const isFree = formation.price_cents === 0;
  const promoLabel = promoCodeLabel(formation.partner_promo_codes);
  // Une formation permanente n'expire pas : ses bornes ne portent que sa date
  // de mise en ligne, la dire « terminée » serait faux.
  const isPast = !formation.is_evergreen && new Date(formation.ends_at) < new Date();
  // Comparaison sur le jour civil parisien, sinon une session du soir bascule
  // sur deux jours pour un lecteur situe a l'est.
  const isMultiDay =
    format(new Date(formation.ends_at), "yyyy-MM-dd", { in: PARIS }) !==
    format(new Date(formation.starts_at), "yyyy-MM-dd", { in: PARIS });
  const spotsLeft = formation.max_participants
    ? formation.max_participants - registrationsCount
    : null;

  return (
    <div>
      {/* ============================================================ */}
      {/* Hero : aplat beige, visuel a droite, bande de reperes incluse */}
      {/* Le beige etant clair, tout l'interieur passe en vert : les    */}
      {/* pastilles reprennent leurs couleurs pleines, qui ressortent   */}
      {/* ici alors qu'elles se noyaient sur l'ancien aplat rose.       */}
      {/* ============================================================ */}
      <section className="bg-background-beige-dark">
        {/* Le visuel se cale sur ce bloc et non sur la section entiere,
            sinon il passerait par-dessus la bande de reperes du bas. */}
        <div className="relative">
          <div
            className={`mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 ${
              formation.thumbnail_url ? "lg:pr-[calc(38%+2rem)]" : ""
            }`}
          >
            {/* Back link */}
            <Link
              href="/formations"
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-primary-green/70 transition-colors hover:text-primary-green"
            >
              <ArrowLeft className="h-4 w-4" />
              Toutes les formations
            </Link>

            <div>
              <div>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${categoryColor} border-0`}>
                    {categoryLabel}
                  </Badge>
                  <Badge className="border-0 bg-primary-green/10 text-primary-green">
                    <TypeIcon className="mr-1 h-3 w-3" />
                    {typeLabel}
                  </Badge>
                  {isPast && (
                    <Badge className="border-0 bg-primary-green/10 text-primary-green/60">
                      Terminée
                    </Badge>
                  )}
                  {/* Mention libre : certification, éligibilité à une prise en
                      charge. Facultative, et le plus souvent absente. */}
                  {formation.badge && (
                    <Badge className="border-0 bg-accent-honey-soft text-primary-green">
                      {formation.badge}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h1 className="mt-4 font-serif text-2xl font-bold text-primary-green sm:text-3xl lg:text-4xl">
                  {formation.title}
                </h1>

                {/* Short description */}
                {formation.description && (
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-primary-green/75">
                    {formation.description}
                  </p>
                )}

                {/* Résumé — troisieme niveau de lecture, mis en forme.
                    Filet vertical plutot qu'encadre : le bandeau est deja une
                    surface pleine, une boite dedans ferait boite dans boite.
                    Titres masques : l'editeur les autorise, mais ils
                    entreraient en concurrence avec le h1 juste au-dessus. */}
                {formation.summary_html && (
                  <div
                    className="mt-5 max-w-2xl border-l-2 border-primary-red/40 pl-4
                               text-[0.95rem] leading-relaxed text-primary-green/75
                               [&_p]:mb-2 [&_p:last-child]:mb-0
                               [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                               [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
                               [&_strong]:font-semibold [&_strong]:text-primary-green
                               [&_em]:not-italic [&_em]:text-primary-red
                               [&_a]:underline [&_a]:underline-offset-2
                               [&_h1]:hidden [&_h2]:hidden [&_h3]:hidden"
                    dangerouslySetInnerHTML={{ __html: formation.summary_html }}
                  />
                )}

                {/* Quick meta */}
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-green/60">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {formation.is_evergreen
                        ? "Accessible à tout moment"
                        : format(new Date(formation.starts_at), "d MMMM yyyy", {
                            locale: fr,
                            in: PARIS,
                          })}
                    </span>
                  </div>
                  {duration && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{duration}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    <span>{consultantName}</span>
                  </div>
                </div>

                {!formation.is_evergreen && !isPast && (
                  <div className="mt-4">
                    <AddToCalendarButton
                      variant="outline"
                      className="rounded-full border-primary-red/30 bg-white text-primary-green shadow-sm hover:border-primary-red hover:bg-primary-red hover:text-white"
                      event={{
                        uid: formation.id,
                        title: formation.title,
                        description: formation.description ?? undefined,
                        location:
                          formation.type === "online"
                            ? "En ligne"
                            : (formation.location ?? undefined),
                        startsAt: formation.starts_at,
                        endsAt: formation.ends_at,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Price highlight (desktop) */}
              {formation.show_price && (
                <div className="mt-8 hidden border-t border-primary-green/15 pt-6 lg:block">
                  <p className="font-serif text-2xl font-bold text-primary-green">
                    {formatPrice(formation.price_cents, formation.currency)}
                  </p>
                  {isFree && (
                    <p className="mt-1 text-sm text-primary-green/60">
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
          {formation.thumbnail_url && (
            <div className="relative h-56 w-full sm:h-72 lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[38%]">
              <Image
                src={formation.thumbnail_url}
                alt={formation.title}
                fill
                className="object-contain p-6 lg:p-10"
                sizes="(min-width: 1024px) 38vw, 100vw"
                priority
              />
            </div>
          )}
        </div>

        {/* Bande de reperes — pleine largeur, une seule ligne.
            Tuiles blanches : le rapport s'inverse par rapport a avant, mais
            deux beiges qui se touchent ne se distingueraient pas. En dessous
            de `sm`, la bande defile plutot que de se replier. */}
        {highlights.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 sm:pb-12 lg:px-8">
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {highlights.map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className="flex min-w-32 flex-1 flex-col items-center justify-center gap-2 bg-white p-4 text-center"
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary-red" />
                  <span className="text-xs font-medium text-primary-green">
                    {label}
                  </span>
                </div>
              ))}
            </div>
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
            {/* Objectifs pédagogiques — puces cochées */}
            {formation.objectives_html && (
              <div>
                <SectionHeading icon={Target}>
                  Ce que vous saurez faire
                </SectionHeading>
                <div
                  className={`mt-5 max-w-none ${PROSE_OBJECTIVES}`}
                  dangerouslySetInnerHTML={{ __html: formation.objectives_html }}
                />
              </div>
            )}

            {/* Programme — fil vertical numéroté */}
            {formation.program_html && (
              <div>
                <SectionHeading icon={BookOpen}>Le programme</SectionHeading>
                <div
                  className={`mt-5 max-w-none ${PROSE_BASE} ${PROSE_PROGRAM}`}
                  dangerouslySetInnerHTML={{ __html: formation.program_html }}
                />
              </div>
            )}

            {/* Public visé — encadré, pour trancher avec les deux au-dessus */}
            {formation.audience_html && (
              <div className="bg-background-beige-dark p-6 sm:p-8">
                <SectionHeading icon={Users}>
                  À qui s’adresse cette formation
                </SectionHeading>
                <div
                  className={`mt-4 max-w-none ${PROSE_BASE} [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5`}
                  dangerouslySetInnerHTML={{ __html: formation.audience_html }}
                />
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
                    {!formation.show_price ? (
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
                        {formatPrice(formation.price_cents, formation.currency)}
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-primary-green/10" />

                  {/* Details list */}
                  <div className="space-y-3 text-sm text-primary-green/70">
                    {/* Date. Une formation permanente n'en annonce aucune :
                        elle démarre quand la personne s'inscrit. */}
                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                      {formation.is_evergreen ? (
                        <div>
                          <p className="font-medium text-primary-green">
                            Accessible à tout moment
                          </p>
                          <p className="text-xs text-primary-green/50">
                            À suivre à votre rythme
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-primary-green">
                            {isMultiDay
                              ? `${parisFormat(formation.starts_at, "d")} au ${parisFormat(formation.ends_at, "d MMMM yyyy")}`
                              : parisFormat(formation.starts_at, "EEEE d MMMM yyyy")}
                          </p>
                          <p className="text-xs text-primary-green/50">
                            {isMultiDay
                              ? `${capitalize(parisFormat(formation.starts_at, "EEEE"))} et ${parisFormat(formation.ends_at, "EEEE")}`
                              : capitalize(parisFormat(formation.starts_at, "EEEE"))}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Horaire — absent des formats sans heure (webinaire,
                        e-learning), ou seule la date fait sens. */}
                    {formation.show_time && !formation.is_evergreen && (
                      <div className="flex items-start gap-3">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                        <div>
                          <p className="font-medium text-primary-green">
                            {parisFormat(formation.starts_at, "HH'h'mm")}
                            {" à "}
                            {parisFormat(formation.ends_at, "HH'h'mm")}
                          </p>
                          <p className="text-xs text-primary-green/50">
                            Durée : {duration}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    {formation.location && formation.type !== "online" && (
                      <div className="flex items-start gap-3">
                        <TypeIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                        <div>
                          <p className="font-medium text-primary-green">
                            {formation.location}
                          </p>
                          <p className="text-xs text-primary-green/50">
                            {typeLabel}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Lien de connexion : reserve aux inscrits, pas expose a
                        un visiteur non paye qui pourrait rejoindre la visio. */}
                    {formation.location &&
                      formation.type === "online" &&
                      (isAlreadyRegistered ? (
                        <div className="flex items-start gap-3">
                          <TypeIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                          <div>
                            <a
                              href={formation.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary-green underline"
                            >
                              Lien de connexion
                            </a>
                            <p className="text-xs text-primary-green/50">
                              {typeLabel}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <TypeIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                          <div>
                            <p className="font-medium text-primary-green">
                              {typeLabel}
                            </p>
                            <p className="text-xs text-primary-green/50">
                              Le lien de connexion apparaît ici après inscription
                            </p>
                          </div>
                        </div>
                      ))}

                    {/* Spots */}
                    {formation.max_participants && (
                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                        <div>
                          <p className="font-medium text-primary-green">
                            {spotsLeft !== null && spotsLeft > 0
                              ? `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} restante${spotsLeft > 1 ? "s" : ""}`
                              : spotsLeft === 0
                                ? "Complet"
                                : `${formation.max_participants} places`}
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
                      <RegistrationReconciler formationId={formation.id} />
                    </div>
                  )}
                  <RegisterButton
                    formationId={formation.id}
                    isFree={isFree}
                    isFullyBooked={isFullyBooked}
                    isAlreadyRegistered={isAlreadyRegistered}
                    isPast={isPast}
                    isAuthenticated={isAuthenticated}
                    priceCents={formation.price_cents}
                    currency={formation.currency}
                    externalUrl={formation.external_url}
                    promoCodes={formation.partner_promo_codes}
                    isPreview={isPreview}
                  />

                  {/* Le code se lit avant de partir chez l'organisme : une
                      fois sur son site, la visiteuse ne revient pas le
                      chercher. */}
                  {promoLabel && (
                    <p className="rounded-md bg-accent-honey-soft px-3 py-2 text-center text-sm font-medium text-primary-green">
                      {promoLabel}
                    </p>
                  )}

                  {/* Trust indicators */}
                  <div className="space-y-2 pt-2">
                    {/* Aucun paiement ne transite par le site quand
                        l'inscription part chez l'organisme : l'annoncer ici
                        serait faux. */}
                    {[
                      ...(formation.external_url ? [] : ["Paiement sécurisé"]),
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

import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AccompagnementCard } from "@/components/accompagnements/accompagnement-card";
import { AccompagnementsCarousel } from "./_components/accompagnements-carousel";
import { ArrowRight, Video, MapPin, BookOpen, GraduationCap } from "lucide-react";
import { TestimonialCarousel } from "@/components/public/testimonials/testimonial-carousel";
import { GoogleRatingBadge } from "@/components/public/testimonials/google-rating-badge";
import { getFeaturedTestimonials } from "@/lib/testimonials";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { NEWSLETTER_NAME } from "@/config/newsletter";
import { NewsletterSignupForm } from "./newsletter/_components/newsletter-signup-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isBookingEnabled } from "@/lib/settings/feature-flags/store";
import { PACK_SALES_PATH } from "@/config/navigation";
import { PACK_SLUG, sortByModuleOrder } from "@/config/accompagnements";

/* ─── Static data ─── */

const BIO_STATS = [
  { value: "20+", label: "ans d'expérience" },
  { value: "70 K+", label: "consultations" },
  { value: "3", label: "livres publiés" },
  { value: "IBCLC", label: "Certification internationale" },
];

type HomePageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const HomePage = async ({ searchParams }: HomePageProps) => {
  await searchParams; // consume the promise
  const supabase = await createClient();
  const bookingEnabled = await isBookingEnabled();

  const [formationsRes, blogRes, consultantsRes, consultationTypesRes] = await Promise.all([
    supabase
      .from("accompagnements")
      .select(
        `id, title, slug, short_description, thumbnail_url, price_cents, currency, consultant_id,
        consultants!accompagnements_consultant_id_fkey (slug, profiles!consultants_id_fkey (first_name, last_name))`
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("price_cents", { ascending: true }),
    supabase
      .from("blog_posts")
      .select(
        `id, title, slug, excerpt, thumbnail_url, published_at,
        blog_categories (name, slug)`
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("consultants")
      .select(
        `id, slug, bio, specialties,
        profiles!consultants_id_fkey (first_name, last_name, avatar_url)`
      )
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(3),
    supabase
      .from("consultation_types")
      .select("title, description, price_cents, duration_minutes, available_locations")
      .eq("is_active", true)
      .order("price_cents", { ascending: true }),
  ]);

  const allFormations = formationsRes.data ?? [];
  const consultationTypes = consultationTypesRes.data ?? [];

  // Build price display helper
  const formatPrice = (cents: number) => `${Math.round(cents / 100)} €`;

  // Group consultation types by location type
  const cabinetTypes = consultationTypes.filter(
    (ct) => (ct.available_locations as string[])?.includes("cabinet")
  );
  const teleTypes = consultationTypes.filter(
    (ct) => (ct.available_locations as string[])?.includes("teleconsultation")
  );

  // Get price range for a list of consultation types
  const getPriceLabel = (types: typeof consultationTypes) => {
    if (types.length === 0) return null;
    const prices = types.map((t) => t.price_cents);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatPrice(min) : `À partir de ${formatPrice(min)}`;
  };

  // Formation price range
  const formationPrices = allFormations
    .map((f) => f.price_cents)
    .filter((p): p is number => p != null && p > 0);
  const formationPriceLabel =
    formationPrices.length > 0
      ? `À partir de ${formatPrice(Math.min(...formationPrices))}`
      : null;

  const SERVICES = [
    {
      icon: MapPin,
      label: "Cabinet",
      title: cabinetTypes.length === 1 ? cabinetTypes[0].title : "Consultation en cabinet",
      description:
        cabinetTypes.length === 1 && cabinetTypes[0].description
          ? cabinetTypes[0].description
          : "Un diagnostic précis, en face à face, pour une situation qui vous appartient à vous seule.",
      price: getPriceLabel(cabinetTypes),
      href: "/reserver",
      cta: "Réserver un créneau",
    },
    {
      icon: Video,
      label: "En ligne",
      title: teleTypes.length === 1 ? teleTypes[0].title : "Téléconsultation",
      description:
        teleTypes.length === 1 && teleTypes[0].description
          ? teleTypes[0].description
          : "La même expertise clinique, où que vous soyez, sans déplacement, sans attente.",
      price: getPriceLabel(teleTypes),
      href: "/reserver",
      cta: "Réserver un créneau",
    },
    {
      icon: BookOpen,
      label: "Accompagnement en ligne",
      title: "Modules autonomes",
      description:
        "Les réponses aux situations les plus fréquentes, disponibles immédiatement, à consulter à votre rythme.",
      price: formationPriceLabel,
      href: "/accompagnements",
      cta: "Découvrir",
    },
    {
      icon: GraduationCap,
      label: "Pro",
      title: "Formations Pro",
      description:
        "Pour les professionnels de santé qui veulent accompagner l'allaitement avec la même rigueur clinique.",
      price: "À partir de 200 €",
      href: "/formations",
      cta: "En savoir plus",
    },
  ];
  const visibleServices = bookingEnabled
    ? SERVICES
    : SERVICES.filter((s) => s.href !== "/reserver");
  // Grille adaptée au nombre de services : 4 colonnes pleines, sinon centrée
  // sur une largeur réduite pour que 2–3 cartes restent équilibrées.
  const servicesGridClass =
    visibleServices.length >= 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : visibleServices.length === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 mx-auto max-w-4xl";
  const featuredFormation = allFormations.find((f) => f.slug === PACK_SLUG);
  const otherFormations = sortByModuleOrder(
    allFormations.filter((f) => f.slug !== PACK_SLUG)
  );
  const blogPosts = blogRes.data ?? [];
  const consultants = consultantsRes.data ?? [];
  const featuredTestimonials = getFeaturedTestimonials();

  return (
    <>

      {/* ─── HERO ─── */}
      <section
        className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden"
        aria-label="Hero, Accueil"
      >
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/fond_hero_homepage.jpg"
            alt=""
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
        </div>
        {/* Gradient overlay — left heavy, fades right */}
        <div
          className="absolute inset-0 bg-linear-to-r from-primary-green/95 via-primary-green/65 to-primary-green/15"
          aria-hidden
        />

        {/* Hero content */}
        <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col justify-center px-5 py-24 sm:px-8 lg:px-16">
          <div className="mx-auto w-full max-w-7xl">
            {/* Pill badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-red" aria-hidden />
              <p className="font-sans text-xs font-medium uppercase tracking-widest text-white/90">
                Consultante IBCLC depuis 2011 &middot; 70 k+ familles accompagnées
              </p>
            </div>

            <h1 className="font-serif text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
              Chaque allaitement mérite
              <br />
              <em className="font-serif italic text-background-beige">
                d&apos;être accompagné
              </em>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">
              Vous voulez allaiter sereinement, sans sacrifier votre santé,
              votre couple ou votre carrière. Je vous donne les repères
              cliniques et le soutien humain pour y arriver <span className="font-bold">à votre rythme,
              selon votre réalité.</span>
            </p>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="bg-primary-red px-8 hover:bg-primary-red-dark"
              >
                <Link href="/accompagnements">
                  Découvrir les accompagnements
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                {bookingEnabled ? (
                  <Link href="/reserver">Prendre rendez-vous</Link>
                ) : (
                  <Link href={PACK_SALES_PATH}>Découvrir le Pack</Link>
                )}
              </Button>
            </div>

            {/* Floating trust card — desktop only */}
            <div
              className="absolute bottom-12 right-8 hidden items-center gap-5 rounded-2xl border border-white/15 bg-primary-green/80 px-6 py-4 backdrop-blur-sm lg:flex"
              aria-hidden
            >
              {[
                { value: "20+", label: "ans d'exp." },
                { value: "70k+", label: "consultations" },
                { value: "IBCLC", label: "Certification internationale" },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center gap-5">
                  {i > 0 && <div className="h-8 w-px bg-background-beige/20" />}
                  <div className="text-center">
                    <p className="font-serif text-xl font-bold text-background-beige">
                      {item.value}
                    </p>
                    <p className="font-sans text-[10px] uppercase tracking-wider text-background-beige/55">
                      {item.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:bottom-8"
            aria-hidden
          >
            <span className="flex h-9 w-5 items-start justify-center rounded-full border-2 border-white/40">
              <span className="mt-1 h-2 w-2 animate-bounce rounded-full bg-white/60" />
            </span>
          </div>
        </div>
      </section>

      {/* ─── CE QUE VOUS VIVEZ — nomme le problème avant de proposer l'offre ─── */}
      <section className="section-padding bg-background-beige">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
              Vous êtes au bon endroit si…
            </p>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl font-bold text-primary-green lg:text-4xl">
              Ce que vous vivez peut-être{" "}
              <em className="font-serif italic">en ce moment</em>
            </h2>
          </ScrollReveal>

          <ul className="mt-10 divide-y divide-primary-green/10 border-y border-primary-green/10">
            {[
              "Vous êtes enceinte, ou votre bébé vient de naître, et vous voulez que ça se passe bien, sans savoir par où commencer.",
              "Vous avez déjà reçu des conseils contradictoires : à la maternité, dans votre entourage, sur internet.",
              "Une difficulté est apparue, douleur, doute sur la lactation, sommeil, reprise du travail, et vous cherchez une réponse fiable, pas un forum de plus.",
              "Vous voulez concilier votre allaitement avec votre vie de femme, pas y renoncer.",
            ].map((line, i) => (
              <ScrollReveal key={line} delay={i * 70}>
                <li className="flex gap-4 py-5">
                  <span
                    className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-red"
                    aria-hidden
                  />
                  <p className="text-primary-green/80 lg:text-lg">{line}</p>
                </li>
              </ScrollReveal>
            ))}
          </ul>

          <ScrollReveal>
            <p className="mt-8 max-w-2xl text-primary-green/70">
              Dans chacune de ces situations, il existe une réponse clinique
              précise. C&apos;est tout ce que je fais depuis 2011.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── SERVICES — Comment puis-je vous aider ? ─── */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="text-center">
              <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                Services
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                Un accompagnement{" "}
                <em className="font-serif italic">sur mesure</em>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-primary-green/70 lg:text-lg">
                Chaque parcours d&apos;allaitement est unique. Choisissez la
                formule qui correspond le mieux à vos besoins.
              </p>
            </div>
          </ScrollReveal>

          <div className={`mt-14 grid gap-5 ${servicesGridClass}`}>
            {visibleServices.map((service, i) => {
              const Icon = service.icon;
              return (
                <ScrollReveal key={service.title} delay={i * 80}>
                  <div className="group flex h-full flex-col border border-border bg-background-beige p-7 transition-shadow hover:shadow-md">
                    {/* Icon */}
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-red/10">
                      <Icon className="h-5 w-5 text-primary-red" aria-hidden />
                    </div>

                    {/* Label */}
                    <p className="mt-5 font-sans text-xs font-medium uppercase tracking-widest text-primary-green/40">
                      {service.label}
                    </p>

                    {/* Title */}
                    <h3 className="mt-1 font-serif text-lg font-semibold text-primary-green">
                      {service.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-primary-green/70">
                      {service.description}
                    </p>

                    {/* Price */}
                    {service.price && (
                      <p className="mt-5 font-serif text-2xl font-bold text-primary-green">
                        {service.price}
                      </p>
                    )}

                    {/* CTA link */}
                    <Link
                      href={service.href}
                      className="mt-4 flex items-center gap-1 text-sm font-medium text-primary-red transition-colors hover:text-primary-red-dark"
                    >
                      {service.cta}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── ACCOMPAGNEMENTS EN LIGNE ─── */}
      {allFormations.length > 0 && (
        <section className="bg-background-beige-dark section-padding">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                    Accompagnements
                  </p>
                  <h2 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                    Accompagnements
                    <br className="hidden sm:block" /> en ligne
                  </h2>
                  <p className="mt-4 max-w-lg text-primary-green/70 lg:text-lg">
                    Des parcours complets pour vous accompagner à chaque étape
                    de votre allaitement.
                  </p>
                </div>
                <Button asChild variant="ghost" className="hidden sm:flex">
                  <Link href="/accompagnements">
                    Voir tous les accompagnements
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>

            {/* Featured accompagnement */}
            {featuredFormation && (
              <ScrollReveal>
                <div className="mt-12">
                  <AccompagnementCard
                    accompagnement={
                      featuredFormation as unknown as Parameters<
                        typeof AccompagnementCard
                      >[0]["accompagnement"]
                    }
                    featured
                  />
                </div>
              </ScrollReveal>
            )}

            {/* Carousel */}
            {otherFormations.length > 0 && (
              <div className="mt-10">
                <AccompagnementsCarousel
                  label="Tous les accompagnements"
                  accompagnements={
                    otherFormations as unknown as Parameters<
                      typeof AccompagnementsCarousel
                    >[0]["accompagnements"]
                  }
                />
              </div>
            )}

            <div className="mt-10 text-center sm:hidden">
              <Button asChild variant="outline">
                <Link href="/accompagnements">
                  Voir tous les accompagnements
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── PORTRAIT / BIO ─── */}
      <section className="section-padding overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Photo — left on desktop */}
            <ScrollReveal>
              <div className="relative">
                <div className="relative aspect-3/4 overflow-hidden">
                  <Image
                    src="/en_consultation.jpg"
                    alt="Carole Hervé, consultante IBCLC"
                    fill
                    className="object-cover"
                  />
                </div>
                {/* Floating IBCLC badge */}
                <div className="absolute bottom-6 right-6 flex items-center gap-2 rounded-full bg-primary-green px-5 py-2.5 shadow-lg">
                  <span className="font-serif text-sm font-bold text-background-beige">
                    IBCLC
                  </span>
                </div>
              </div>
            </ScrollReveal>

            {/* Text — right on desktop */}
            <ScrollReveal delay={150}>
              <div>
                <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                  À propos
                </p>
                <h2 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                  Plus de 20 ans
                  <br />à vos côtés
                </h2>
                <blockquote className="mt-6 border-l-2 border-primary-red/30 pl-5 font-serif text-lg italic leading-relaxed text-primary-green/80">
                  &ldquo;Chaque parcours d&apos;allaitement est unique, je suis là pour vous accompagner avec bienveillance et rigueur scientifique.&rdquo;
                </blockquote>
                <p className="mt-5 leading-relaxed text-primary-green/70 lg:text-lg">
                  Spécialiste de l’allaitement et du sommeil du tout-petit, j’accompagne les parents depuis plus de 20 ans. Auteure de 3 ouvrages de référence, conférencière internationale et formatrice de professionnels, je mets à votre disposition une expertise reconnue, nourrie par l’expérience de terrain et les données scientifiques les plus récentes.
                </p>

                {/* Stats */}
                <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {BIO_STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="border-t-2 border-primary-red/20 pt-3"
                    >
                      <p className="font-serif text-2xl font-bold text-primary-green">
                        {stat.value}
                      </p>
                      <p className="mt-0.5 font-sans text-xs text-primary-green/50">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                <Button asChild variant="ghost" className="-ml-3 mt-8">
                  <Link href="/a-propos">
                    En savoir plus
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── TÉMOIGNAGES ─── */}
      {featuredTestimonials.length > 0 && (
        <section className="bg-background-beige-dark section-padding">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <div className="text-center">
                <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                  Témoignages
                </p>
                <h2 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                  Et la parentalité devient plus douce...
                </h2>
                <p className="mt-4 text-primary-green/60">
                  Des mamans partagent leur expérience
                </p>
                <div className="mt-6 flex justify-center">
                  <GoogleRatingBadge />
                </div>
              </div>
            </ScrollReveal>
            <TestimonialCarousel testimonials={featuredTestimonials} />
          </div>
        </section>
      )}

      {/* ─── CONSULTANTES — Teaser ─── */}
      {consultants.length > 0 && (
        <section className="section-padding">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                    Mon équipe
                  </p>
                  <h2 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                    Un soutien accessible 7j/7
                  </h2>
                  <p className="mt-4 max-w-lg text-primary-green/70 lg:text-lg">
                    Des professionnelles certifiées pour un accompagnement humain et bienveillant.
                  </p>
                </div>
                <Button asChild variant="ghost" className="hidden sm:flex">
                  <Link href="/consultantes">
                    Voir toutes les consultantes
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {consultants.map((consultant, i) => {
                const profile = consultant.profiles as unknown as {
                  first_name: string | null;
                  last_name: string | null;
                  avatar_url: string | null;
                } | null;
                const fullName = profile
                  ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
                  : "Consultante";
                const initials = profile
                  ? `${(profile.first_name ?? "")[0] ?? ""}${(profile.last_name ?? "")[0] ?? ""}`
                  : "C";

                return (
                  <ScrollReveal key={consultant.id} delay={i * 100}>
                    <Link
                      href={`/consultantes/${consultant.slug}`}
                      className="group block border border-border bg-background-beige p-6 transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 shrink-0">
                          <AvatarImage
                            src={profile?.avatar_url ?? undefined}
                            alt={fullName}
                          />
                          <AvatarFallback className="bg-primary-red/10 font-serif text-lg font-semibold text-primary-red">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-serif text-lg font-semibold text-primary-green transition-colors group-hover:text-primary-red">
                            {fullName}
                          </h3>
                          {(consultant.specialties as string[]).length > 0 && (
                            <p className="mt-1 text-xs text-primary-green/50">
                              {(consultant.specialties as string[])
                                .slice(0, 2)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                      {consultant.bio && (
                        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-primary-green/70">
                          {consultant.bio}
                        </p>
                      )}
                      <p className="mt-4 flex items-center gap-1 text-sm font-medium text-primary-red">
                        Voir le profil
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                      </p>
                    </Link>
                  </ScrollReveal>
                );
              })}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Button asChild variant="outline">
                <Link href="/consultantes">
                  Voir toutes les consultantes
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── BLOG / LE JOURNAL ─── */}
      {blogPosts.length > 0 && (
        <section className="bg-background-beige-dark/50 section-padding">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                    Articles & Ressources
                  </p>
                  <h2 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                    Le blog
                  </h2>
                  <p className="mt-4 text-primary-green/70 lg:text-lg">
                    Articles, réflexions et ressources autour de
                    l&apos;allaitement.
                  </p>
                </div>
                <Button asChild variant="ghost" className="hidden sm:flex">
                  <Link href="/blog">
                    Lire le blog
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>

            {/* Magazine layout: 1 featured + 2 secondary */}
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {/* Featured article */}
              <ScrollReveal>
                <Link
                  href={`/blog/${blogPosts[0].slug}`}
                  className="group block"
                >
                  <div className="relative aspect-16/10 overflow-hidden">
                    {blogPosts[0].thumbnail_url ? (
                      <Image
                        src={blogPosts[0].thumbnail_url}
                        alt={blogPosts[0].title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary-green/5">
                        <p className="text-sm text-primary-green/40">Image</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    {blogPosts[0].blog_categories && (
                      <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                        {
                          (
                            blogPosts[0].blog_categories as unknown as {
                              name: string;
                            }
                          ).name
                        }
                      </p>
                    )}
                    <h3 className="mt-2 font-serif text-xl font-semibold text-primary-green transition-colors group-hover:text-primary-red lg:text-2xl">
                      {blogPosts[0].title}
                    </h3>
                    {blogPosts[0].excerpt && (
                      <p className="mt-2 line-clamp-3 text-primary-green/70">
                        {blogPosts[0].excerpt}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-primary-green/40">
                      {new Date(blogPosts[0].published_at!).toLocaleDateString(
                        "fr-FR",
                        { day: "numeric", month: "long", year: "numeric" }
                      )}
                    </p>
                  </div>
                </Link>
              </ScrollReveal>

              {/* Secondary articles */}
              <div className="flex flex-col gap-6">
                {blogPosts.slice(1, 3).map((post, i) => (
                  <ScrollReveal key={post.id} delay={(i + 1) * 100}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex gap-4"
                    >
                      <div className="relative aspect-square w-28 shrink-0 overflow-hidden sm:w-36">
                        {post.thumbnail_url ? (
                          <Image
                            src={post.thumbnail_url}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-primary-green/5">
                            <p className="text-xs text-primary-green/40">
                              Image
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        {post.blog_categories && (
                          <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                            {
                              (
                                post.blog_categories as unknown as {
                                  name: string;
                                }
                              ).name
                            }
                          </p>
                        )}
                        <h3 className="mt-1 font-serif text-lg font-semibold text-primary-green transition-colors group-hover:text-primary-red">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-xs text-primary-green/40">
                          {new Date(post.published_at!).toLocaleDateString(
                            "fr-FR",
                            { day: "numeric", month: "long", year: "numeric" }
                          )}
                        </p>
                      </div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            <div className="mt-10 text-center sm:hidden">
              <Button asChild variant="outline">
                <Link href="/blog">Lire le blog</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── FORMATIONS PRO ─── */}
      <section className="bg-primary-green section-padding">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-background-beige/40">
              Professionnels de santé
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-background-beige lg:text-5xl">
              Vous êtes
              <br />
              professionnel.le de santé ?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-background-beige/70">
              Formations, ateliers et webinaires pour développer votre expertise
              en accompagnement de l&apos;allaitement.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-10 bg-primary-red px-8 hover:bg-primary-red-dark"
            >
              <Link href="/formations">
                Découvrir les formations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── NEWSLETTER — Inscription ─── */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-xl text-center">
          <ScrollReveal>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
              Newsletter
            </p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-primary-green lg:text-4xl">
              {NEWSLETTER_NAME}
            </h2>
            <p className="mt-3 text-primary-green/70">
              Des conseils concrets, sans discours culpabilisant. 🎁 Le mémo «
              Conservation du lait maternel » offert à l&apos;inscription.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <div className="mx-auto mt-6">
              <NewsletterSignupForm source="homepage_teaser" theme="light" compact />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── CTA FINAL — Dark banner ─── */}
      <section className="bg-primary-green section-padding">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-background-beige lg:text-5xl">
              Un accompagnement de <em className="italic">qualité</em> peut
              faire toute la différence.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-background-beige/70">
              {bookingEnabled
                ? "Prenez rendez-vous pour une consultation personnalisée, ou explorez nos accompagnements à votre rythme."
                : "Découvrez mes accompagnements et formations en ligne pour avancer à votre rythme, avec des repères fiables et un soutien bienveillant."}
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="bg-primary-red px-8 hover:bg-primary-red-dark"
              >
                {bookingEnabled ? (
                  <Link href="/reserver">Prendre rendez-vous</Link>
                ) : (
                  <Link href={PACK_SALES_PATH}>Découvrir le Pack</Link>
                )}
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-background-beige/30 bg-transparent text-background-beige hover:bg-background-beige/10 hover:text-background-beige"
              >
                <Link href="/accompagnements">
                  Découvrir les accompagnements
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default HomePage;

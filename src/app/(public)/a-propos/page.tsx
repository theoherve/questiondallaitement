import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Button } from "@/components/ui/button";
import { TestimonialCarousel } from "@/components/public/testimonials/testimonial-carousel";
import { GoogleRatingBadge } from "@/components/public/testimonials/google-rating-badge";
import { getFeaturedTestimonials } from "@/lib/testimonials";
import { features } from "@/config/features";
import {
  ArrowRight,
  Heart,
  BookOpen,
  Users,
  GraduationCap,
  Award,
  Mic,
} from "lucide-react";

export const metadata: Metadata = {
  title: "À propos : Carole Hervé",
  description:
    "Consultante en lactation IBCLC depuis plus de 20 ans, auteure de 3 ouvrages de référence, formatrice et conférencière internationale. Découvrez mon parcours et ma vision de l'accompagnement en allaitement.",
};

const KEY_FIGURES = [
  { value: "20+", label: "années d'expérience" },
  { value: "5 000+", label: "familles accompagnées" },
  { value: "3", label: "ouvrages publiés" },
  { value: "7", label: "IBCLC dans l'équipe" },
];

const MILESTONES = [
  {
    year: "2001",
    text: "Début de carrière dans la communication d'entreprise. Communication interne, externe, événementielle, relations publiques… mais très vite, le sentiment de passer à côté de ma famille.",
  },
  {
    year: "2011",
    text: "Certification IBCLC, le diplôme dont je suis le plus fière. Diplôme en poche, j'enrichis ma formation de dizaines de spécialisations : freins de langue, sommeil, développement de l'enfant, physiologie…",
  },
  {
    year: "2012",
    text: "Première conférence internationale en anglais sur le soutien de mère à mère. Je me forme aussi auprès de Catherine Senez sur les troubles de la déglutition et de la succion.",
  },
  {
    year: "2015",
    text: "Création de formations pour les professionnels de santé : orthophonistes, sages-femmes, ostéopathes, accompagnantes en périnatalité. Ma pédagogie s'affine, mes formations sont reconnues pour leur richesse clinique.",
  },
  {
    year: "2019",
    text: "\"Mon allaitement sur mesure\" sort en librairie. Conférence à GOLD Lactation. J'achète mon cabinet : je peux enfin soutenir les mères au quotidien.",
  },
  {
    year: "2021",
    text: "Lancement des accompagnements en ligne. \"Choisir d'allaiter\" est publié. Je deviens experte pour Parents, Doctissimo… Le cabinet prend de l'ampleur.",
  },
  {
    year: "2024",
    text: "L'équipe compte 7 IBCLC. Un troisième livre, collaboratif et encore plus complet. Plus de 5 000 familles accompagnées et des conférences internationales.",
  },
  {
    year: "2025",
    text: "J'enregistre ma formation sur les troubles alimentaires pédiatriques en anglais pour LER.",
  },
];

const AProposPage = () => {
  const featuredTestimonials = getFeaturedTestimonials();

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <ScrollReveal>
              <div>
                <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                  Consultante en lactation IBCLC
                </p>
                <h1 className="mt-4 font-serif text-4xl font-bold text-primary-green sm:text-5xl lg:text-6xl">
                  Vous méritez un allaitement serein.
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-primary-green/80 lg:text-xl">
                  Je suis Carole Hervé. Depuis plus de 20 ans,
                  j&apos;accompagne les familles avec une approche fondée sur la
                  science, la bienveillance et le respect de votre rythme.
                  Parce que chaque allaitement est unique, le vôtre aussi.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="bg-primary-red px-8 hover:bg-primary-red-dark"
                  >
                    <Link href="/accompagnements">
                      Découvrir les accompagnements
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  {features.bookingEnabled && (
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-primary-green/20 text-primary-green hover:bg-primary-green/5"
                    >
                      <Link href="/reserver">Prendre rendez-vous</Link>
                    </Button>
                  )}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className="relative aspect-4/5 overflow-hidden">
                <Image
                  src="/en_consultation.jpg"
                  alt="Carole Hervé en consultation, accompagnement allaitement"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── Chiffres clés ─── */}
      <section className="bg-primary-green px-5 py-16 sm:px-8 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
            {KEY_FIGURES.map((fig) => (
              <ScrollReveal key={fig.label}>
                <div className="text-center">
                  <p className="font-serif text-4xl font-bold text-background-beige lg:text-5xl">
                    {fig.value}
                  </p>
                  <p className="mt-2 font-sans text-xs font-medium uppercase tracking-widest text-background-beige/60">
                    {fig.label}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Mon histoire ─── */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <ScrollReveal>
              <div className="relative aspect-4/5 overflow-hidden">
                <Image
                  src="/carole_herve_portrait.jpg"
                  alt="Carole Hervé, portrait"
                  fill
                  className="object-cover"
                />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div>
                <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                  Mon histoire
                </p>
                <h2 className="mt-4 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                  Et si je vous racontais&hellip;
                </h2>
                <div className="mt-8 space-y-5 text-lg leading-relaxed text-primary-green/80">
                  <p>
                    Je me suis brûlé les ailes avant de comprendre combien la
                    maternité pouvait tout bousculer. Un premier allaitement
                    écourté, puis deux autres tentatives, avec toute la
                    détermination du monde et autant de doutes.
                  </p>
                  <p>
                    Un jour, mon corps m&apos;a rattrapée. Il a fallu que je
                    m&apos;arrête et que je me pose la vraie question :
                    qu&apos;est-ce que tout cela signifie pour moi ?
                  </p>
                  <p>
                    La réponse s&apos;est imposée comme une évidence.
                    Accompagner l&apos;allaitement, c&apos;était MA voie.
                    J&apos;étais cette jeune maman bousculée, pour ne pas dire
                    perdue, qui naviguait d&apos;associations en lectures, de
                    groupes de soutien en conférences, à la recherche de
                    réponses que personne ne semblait avoir.
                  </p>
                  <p>
                    Alors je me suis replongée dans les études. Vidéos, livres,
                    formations, séminaires… tout y est passé, mes économies
                    avec. Une grosse année à jongler entre un travail à
                    mi-temps et des études dignes de la première année de
                    médecine, et me voilà certifiée IBCLC.
                  </p>
                  <p>
                    Mon approche est devenue ce qu&apos;elle est
                    aujourd&apos;hui : un accompagnement sur mesure, qui tient
                    compte de qui vous êtes vraiment. Quand on m&apos;a
                    proposé d&apos;écrire un premier livre, le titre était tout
                    trouvé : <em>Mon allaitement sur mesure</em>.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── Ma philosophie — 3 piliers ─── */}
      <section className="bg-background-beige-dark section-padding">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="text-center">
              <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                Ma vision
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                Mon approche de l&apos;accompagnement
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-green/70">
                L&apos;allaitement n&apos;est pas une performance. C&apos;est
                une relation, un apprentissage à deux ou à trois. Mon rôle
                est de vous donner les clés pour que cette expérience soit la
                plus sereine possible.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <ScrollReveal className="h-full">
              <div className="flex h-full flex-col bg-background-beige p-8 lg:p-10">
                <Heart
                  className="h-8 w-8 text-primary-red"
                  strokeWidth={1.5}
                />
                <h3 className="mt-5 font-serif text-xl font-semibold text-primary-green lg:text-2xl">
                  Bienveillance
                </h3>
                <p className="mt-3 flex-1 leading-relaxed text-primary-green/70">
                  Chaque famille est unique. Mon accompagnement est sans
                  jugement ni injonction : je suis là pour vous écouter, pas
                  pour vous dicter quoi faire.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100} className="h-full">
              <div className="flex h-full flex-col bg-background-beige p-8 lg:p-10">
                <BookOpen
                  className="h-8 w-8 text-primary-red"
                  strokeWidth={1.5}
                />
                <h3 className="mt-5 font-serif text-xl font-semibold text-primary-green lg:text-2xl">
                  Rigueur scientifique
                </h3>
                <p className="mt-3 flex-1 leading-relaxed text-primary-green/70">
                  Mes conseils s&apos;appuient sur les dernières données de la
                  science. Pas de croyances, pas de on-dit : des repères
                  fiables et actualisés.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200} className="h-full">
              <div className="flex h-full flex-col bg-background-beige p-8 lg:p-10">
                <Users
                  className="h-8 w-8 text-primary-red"
                  strokeWidth={1.5}
                />
                <h3 className="mt-5 font-serif text-xl font-semibold text-primary-green lg:text-2xl">
                  Sur mesure
                </h3>
                <p className="mt-3 flex-1 leading-relaxed text-primary-green/70">
                  Un accompagnement qui tient compte de vos antécédents, de
                  votre santé physique et émotionnelle, de votre réalité et de
                  votre situation familiale.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── CTA intermédiaire ─── */}
      <section className="bg-primary-red/5 px-5 py-14 sm:px-8 lg:px-16 lg:py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <p className="font-serif text-2xl font-bold text-primary-green lg:text-3xl">
              Vous vous posez des questions sur votre allaitement ?
            </p>
            <p className="mt-2 text-primary-green/70">
              Découvrez mes accompagnements en ligne, conçus pour vous guider à
              votre rythme.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="shrink-0 bg-primary-red px-8 hover:bg-primary-red-dark"
          >
            <Link href="/accompagnements">
              Voir les accompagnements
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ─── Parcours / Timeline ─── */}
      <section className="section-padding">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
              Mon parcours
            </p>
            <h2 className="mt-4 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
              20 ans au service des familles
            </h2>
          </ScrollReveal>

          <div className="mt-12 space-y-0">
            {MILESTONES.map((milestone, i) => (
              <ScrollReveal key={milestone.year + i} delay={i * 50}>
                <div className="flex gap-6 border-l-2 border-primary-green/10 py-6 pl-8">
                  <span className="shrink-0 font-serif text-2xl font-bold text-primary-red">
                    {milestone.year}
                  </span>
                  <p className="text-primary-green/80 lg:text-lg">
                    {milestone.text}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Témoignages ─── */}
      {featuredTestimonials.length > 0 && (
      <section className="bg-background-beige-dark section-padding">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="text-center">
              <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                Témoignages
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                Ce que les mamans en disent
              </h2>
              <div className="mt-6 flex justify-center">
                <GoogleRatingBadge />
              </div>
            </div>
          </ScrollReveal>
          <TestimonialCarousel testimonials={featuredTestimonials} />
        </div>
      </section>
      )}

      {/* ─── Certifications & expertise ─── */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="text-center">
              <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                Expertise
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
                Certifications & reconnaissance
              </h2>
            </div>
          </ScrollReveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <ScrollReveal>
              <div className="flex h-full flex-col border border-border p-8">
                <Award
                  className="h-8 w-8 text-primary-red"
                  strokeWidth={1.5}
                />
                <h3 className="mt-5 font-serif text-xl font-semibold text-primary-green">
                  IBCLC
                </h3>
                <p className="mt-1 text-sm font-medium text-primary-green/50">
                  International Board Certified Lactation Consultant
                </p>
                <p className="mt-3 flex-1 text-primary-green/70">
                  Le plus haut niveau de certification reconnu dans le domaine
                  de la lactation humaine. Renouvelée tous les 5 ans par
                  examen.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="flex h-full flex-col border border-border p-8">
                <GraduationCap
                  className="h-8 w-8 text-primary-red"
                  strokeWidth={1.5}
                />
                <h3 className="mt-5 font-serif text-xl font-semibold text-primary-green">
                  Formatrice agréée
                </h3>
                <p className="mt-1 text-sm font-medium text-primary-green/50">
                  Enseignement aux professionnels de santé
                </p>
                <p className="mt-3 flex-1 text-primary-green/70">
                  Sages-femmes, orthophonistes, ostéopathes, puéricultrices,
                  médecins : des formations reconnues pour leur richesse clinique
                  et leurs apports pratiques.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="flex h-full flex-col border border-border p-8">
                <Mic
                  className="h-8 w-8 text-primary-red"
                  strokeWidth={1.5}
                />
                <h3 className="mt-5 font-serif text-xl font-semibold text-primary-green">
                  Conférencière internationale
                </h3>
                <p className="mt-1 text-sm font-medium text-primary-green/50">
                  France, Europe et en ligne
                </p>
                <p className="mt-3 flex-1 text-primary-green/70">
                  Interventions dans des congrès internationaux comme GOLD
                  Lactation, et conférences en anglais sur l&apos;allaitement
                  maternel et la santé périnatale.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── CTA final ─── */}
      <section className="bg-primary-green section-padding">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-background-beige lg:text-5xl">
              Prête à vivre votre allaitement sereinement ?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-background-beige/70">
              Que vous soyez en train de lire ces lignes le regard rivé sur
              votre bébé qui dort enfin, ou en pleine préparation d&apos;un
              allaitement à venir : il existe un accompagnement pour vous.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="bg-primary-red px-8 hover:bg-primary-red-dark"
              >
                <Link href="/accompagnements">
                  Découvrir les accompagnements
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {features.bookingEnabled && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-background-beige bg-transparent text-background-beige hover:bg-background-beige/10 hover:text-background-beige"
                >
                  <Link href="/reserver">Prendre rendez-vous</Link>
                </Button>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default AProposPage;

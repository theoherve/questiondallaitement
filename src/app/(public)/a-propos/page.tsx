import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "À propos — Carole Hervé",
  description:
    "Consultante en lactation IBCLC depuis plus de 20 ans, auteure de 3 ouvrages de référence, formatrice et conférencière internationale.",
};

const MILESTONES = [
  { year: "2003", text: "Certification IBCLC — consultante en lactation" },
  {
    year: "2010",
    text: "Création de Question d'Allaitement — cabinet de consultation",
  },
  { year: "2015", text: "Début des formations pour professionnels de santé" },
  { year: "2019", text: "Publication du premier livre sur l'allaitement" },
  { year: "2021", text: "Lancement des accompagnements en ligne" },
  {
    year: "2023",
    text: "Publication de « Mon allaitement au fil des mois » (Éditions First)",
  },
  {
    year: "2024",
    text: "Plus de 5 000 familles accompagnées — conférences internationales",
  },
];

const KEY_FIGURES = [
  { value: "20+", label: "années d'expérience" },
  { value: "5 000+", label: "familles accompagnées" },
  { value: "3", label: "ouvrages publiés" },
  { value: "IBCLC", label: "certification internationale" },
];

const AProposPage = () => {
  return (
    <>
      {/* Hero section */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <ScrollReveal>
              <div>
                <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                  À propos
                </p>
                <h1 className="mt-4 font-serif text-4xl font-bold text-primary-green sm:text-5xl lg:text-6xl">
                  Carole Hervé
                </h1>
                <p className="mt-2 text-lg text-primary-green/60 lg:text-xl">
                  Consultante en lactation IBCLC
                </p>
                <p className="mt-8 text-lg leading-relaxed text-primary-green/80 lg:text-xl">
                  Depuis plus de 20 ans, j&apos;accompagne les familles dans
                  leur allaitement avec une approche fondée sur la science, la
                  bienveillance et le respect du rythme de chacun.
                </p>
                <p className="mt-4 text-lg leading-relaxed text-primary-green/80 lg:text-xl">
                  Mon parcours m&apos;a menée de la consultation individuelle à
                  l&apos;écriture de livres, la formation de professionnels de
                  santé et les conférences internationales. Mais ce qui me
                  passionne avant tout, c&apos;est l&apos;accompagnement
                  personnalisé — chaque famille est unique.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className="relative aspect-4/5 overflow-hidden">
                <Image
                  src="/en_consultation.jpg"
                  alt="Carole Hervé — Consultante en lactation IBCLC"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Key figures */}
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

      {/* Philosophy */}
      <section className="section-padding">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-5xl">
              Ma vision
            </h2>
            <div className="mt-8 space-y-6 text-lg leading-relaxed text-primary-green/80 lg:text-xl">
              <p>
                L&apos;allaitement n&apos;est pas une performance. C&apos;est
                une relation, un apprentissage à deux — ou à trois. Mon rôle est
                de vous donner les clés pour que cette expérience soit la plus
                sereine possible, dans le respect de vos choix.
              </p>
              <p>
                Je crois profondément que chaque parent mérite un accompagnement
                de qualité, sans jugement ni injonction. La science nous donne
                des repères fiables ; l&apos;écoute et l&apos;empathie font le
                reste.
              </p>
              <p>
                À travers mes consultations, mes livres et mes formations, je
                souhaite transmettre cette approche : rigoureuse sur les données,
                chaleureuse dans la relation.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-background-beige-dark section-padding">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-5xl">
              Parcours
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

      {/* Certifications */}
      <section className="section-padding">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-5xl">
              Certifications & expertise
            </h2>
            <div className="mt-8 space-y-4">
              <div className="border border-border p-6">
                <h3 className="font-serif text-xl font-semibold text-primary-green">
                  IBCLC — International Board Certified Lactation Consultant
                </h3>
                <p className="mt-2 text-primary-green/70">
                  Certification internationale en lactation, renouvelée tous les
                  5 ans par examen. C&apos;est le plus haut niveau de
                  certification reconnu dans le domaine de la lactation humaine.
                </p>
              </div>
              <div className="border border-border p-6">
                <h3 className="font-serif text-xl font-semibold text-primary-green">
                  Formatrice agréée
                </h3>
                <p className="mt-2 text-primary-green/70">
                  Formation de professionnels de santé — sages-femmes,
                  puéricultrices, médecins — sur les dernières avancées en
                  matière de lactation et d&apos;accompagnement.
                </p>
              </div>
              <div className="border border-border p-6">
                <h3 className="font-serif text-xl font-semibold text-primary-green">
                  Conférencière internationale
                </h3>
                <p className="mt-2 text-primary-green/70">
                  Interventions dans des congrès en France et en Europe sur les
                  thématiques de l&apos;allaitement maternel et de la santé
                  périnatale.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-green section-padding">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-background-beige lg:text-5xl">
              Envie d&apos;en savoir plus ?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-background-beige/70">
              Découvrez mes accompagnements en ligne ou prenez rendez-vous pour
              une consultation personnalisée.
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
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-background-beige bg-transparent text-background-beige hover:bg-background-beige/10 hover:text-background-beige"
              >
                <Link href="/reserver">Prendre rendez-vous</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default AProposPage;

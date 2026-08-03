import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { NEWSLETTER_COPY, NEWSLETTER_NAME } from "@/config/newsletter";
import { NewsletterSignupForm } from "./_components/newsletter-signup-form";
import { NewsletterViewTracker } from "./_components/newsletter-view-tracker";

export const metadata: Metadata = {
  title: "Newsletter",
  description: NEWSLETTER_COPY.subtitle,
  alternates: { canonical: "/newsletter" },
  openGraph: {
    title: `${NEWSLETTER_NAME} — la newsletter de Carole Hervé`,
    description: NEWSLETTER_COPY.subtitle,
  },
};

/** Chiffres deja affiches ailleurs sur le site — repris tels quels. */
const PROOF_STATS = [
  { value: "5 000+", label: "consultations" },
  { value: "20+", label: "ans d'expérience" },
  { value: "1 000+", label: "mères par an" },
  { value: "IBCLC", label: "certification internationale" },
];

const TESTIMONIALS = [
  {
    name: "Margaux",
    context: "Maman de Morgan, 3 mois",
    text: "Je me sens enfin en confiance dans mon allaitement.",
  },
  {
    name: "Amina",
    context: "Maman de Lina, 21 mois",
    text: "Sans cet accompagnement, je n'aurais jamais allaité aussi longtemps.",
  },
];

const NewsletterPage = () => {
  return (
    <>
      <NewsletterViewTracker source="page_newsletter" />

      {/* ─── HERO ─── */}
      <section className="bg-primary-green section-padding">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-accent-peach">
              {NEWSLETTER_COPY.badge}
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-background-beige lg:text-7xl">
              {NEWSLETTER_COPY.title}
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg text-background-beige/75">
              {NEWSLETTER_COPY.subtitle}
            </p>
            <Button
              asChild
              size="lg"
              className="mt-10 h-14 bg-primary-red px-10 text-base hover:bg-primary-red-dark"
            >
              <a href="#inscription">{NEWSLETTER_COPY.cta}</a>
            </Button>
          </ScrollReveal>
        </div>
      </section>

      {/*
        ─── LE MUR DE QUESTIONS ───
        Le cahier des charges demandait ici trois a quatre benefices ecrits a la
        deuxieme personne. Ce sont les memes benefices, formules comme la
        maison s'appelle : en questions. Un parent reconnait sa propre question
        avant de lire une promesse, et la reponse courte en dessous montre le
        ton de la newsletter plutot que de le decrire.
      */}
      <section className="section-padding">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
              Ce qu&apos;on y traite
            </p>
            <h2 className="mt-4 max-w-2xl font-serif text-3xl font-bold text-primary-green lg:text-5xl">
              Les questions qu&apos;on se pose à 3 h du matin.
            </h2>
          </ScrollReveal>

          <dl className="mt-16 divide-y divide-accent-peach">
            {NEWSLETTER_COPY.questions.map((item, index) => (
              <ScrollReveal key={item.question} delay={index * 80}>
                <div className="grid gap-4 py-10 md:grid-cols-[1.1fr_1fr] md:gap-12">
                  <dt className="font-serif text-2xl italic leading-snug text-primary-green lg:text-3xl">
                    {item.question}
                  </dt>
                  <dd className="text-primary-green/70">{item.answer}</dd>
                </div>
              </ScrollReveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── CADEAU DE BIENVENUE ─── */}
      <section className="bg-background-beige-dark section-padding">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <ScrollReveal>
            {/*
              Couverture composee en typographie plutot qu'une image du PDF :
              le fichier final n'est pas encore fourni, et un visuel invente
              afficherait des durees de conservation que personne n'a validees.
              A remplacer par le mockup des que le mémo est livre.
            */}
            <div
              aria-hidden="true"
              className="aspect-4/5 w-full max-w-sm border border-accent-peach bg-card p-10"
            >
              <p className="font-sans text-[0.65rem] font-medium uppercase tracking-[0.2em] text-primary-red">
                Mémo
              </p>
              <p className="mt-6 font-serif text-3xl font-bold leading-tight text-primary-green">
                Conservation du lait maternel
              </p>
              <ul className="mt-10 space-y-4 border-t border-accent-peach pt-8 text-sm text-primary-green/70">
                <li>Température ambiante</li>
                <li>Réfrigérateur</li>
                <li>Congélateur</li>
                <li>Lait décongelé</li>
              </ul>
              <p className="mt-10 text-xs text-primary-green/50">
                1 page · PDF à imprimer
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div>
              <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
                {NEWSLETTER_COPY.gift.eyebrow}
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold text-primary-green lg:text-4xl">
                {NEWSLETTER_COPY.gift.title}
              </h2>
              <p className="mt-6 text-primary-green/70">
                {NEWSLETTER_COPY.gift.body}
              </p>
              <Button
                asChild
                size="lg"
                className="mt-8 bg-primary-red px-8 hover:bg-primary-red-dark"
              >
                <a href="#inscription">
                  Recevoir le mémo
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── PREUVE SOCIALE ─── */}
      <section className="section-padding">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <dl className="grid grid-cols-2 gap-8 border-y border-accent-peach py-12 md:grid-cols-4">
              {PROOF_STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-serif text-3xl font-bold text-primary-red lg:text-4xl">
                      {stat.value}
                    </span>
                    <span className="mt-2 block text-sm text-primary-green/60">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </ScrollReveal>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {TESTIMONIALS.map((testimonial, index) => (
              <ScrollReveal key={testimonial.name} delay={index * 100}>
                <figure className="h-full border border-accent-peach bg-card p-8">
                  <blockquote className="font-serif text-xl italic leading-snug text-primary-green">
                    « {testimonial.text} »
                  </blockquote>
                  <figcaption className="mt-6 text-sm text-primary-green/60">
                    <span className="font-medium text-primary-green">
                      {testimonial.name}
                    </span>{" "}
                    — {testimonial.context}
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── À QUOI S'ATTENDRE ─── */}
      <section className="bg-background-beige-dark section-padding">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-primary-green lg:text-4xl">
              {NEWSLETTER_COPY.rhythm.title}
            </h2>
            <p className="mt-6 text-primary-green/70">
              {NEWSLETTER_COPY.rhythm.body}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── FORMULAIRE ─── */}
      <section id="inscription" className="bg-primary-green section-padding scroll-mt-24">
        <div className="mx-auto max-w-xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="font-serif text-3xl font-bold text-background-beige lg:text-4xl">
                {NEWSLETTER_COPY.form.title}
              </h2>
              <p className="mt-4 text-background-beige/70">
                {NEWSLETTER_COPY.form.body}
              </p>
            </div>
            <div className="mt-10">
              <NewsletterSignupForm source="page_newsletter" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── QUI EST CAROLE ─── */}
      <section className="section-padding">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
              Qui écrit
            </p>
            <h2 className="mt-4 font-serif text-3xl font-bold text-primary-green lg:text-4xl">
              Carole Hervé, consultante en lactation IBCLC
            </h2>
            <p className="mt-6 text-primary-green/70">
              Certifiée IBCLC depuis 2011, elle accompagne plus de 1 000 mères
              par an avec une équipe de sept consultantes, et publie
              régulièrement sur l&apos;allaitement — trois livres, un blog, des
              interventions dans les médias.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Consultante en lactation certifiée IBCLC",
                "Plus de 5 000 consultations menées",
                "Autrice de trois ouvrages sur l'allaitement",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-primary-green/80">
                  <Check
                    className="mt-1 h-4 w-4 shrink-0 text-primary-red"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" size="lg" className="mt-10">
              <Link href="/a-propos">
                En savoir plus
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default NewsletterPage;

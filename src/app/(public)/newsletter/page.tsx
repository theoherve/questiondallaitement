import type { Metadata } from "next";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { NEWSLETTER_COPY, NEWSLETTER_NAME } from "@/config/newsletter";
import { NewsletterSignupForm } from "./_components/newsletter-signup-form";
import { NewsletterViewTracker } from "./_components/newsletter-view-tracker";

export const metadata: Metadata = {
  title: "Newsletter",
  description: NEWSLETTER_COPY.subtitle,
  alternates: { canonical: "/newsletter" },
  openGraph: {
    title: `${NEWSLETTER_NAME} : la newsletter de Carole Hervé`,
    description: NEWSLETTER_COPY.subtitle,
  },
};

/**
 * Page allegee au strict formulaire : hero + inscription. Sert de landing
 * page a partager depuis le blog ou les reseaux, pas de wall de questions ni
 * de preuve sociale — le teaser d'accueil porte deja l'argumentaire complet,
 * inutile de le dupliquer ici pour deux champs.
 */
const NewsletterPage = () => {
  return (
    <>
      <NewsletterViewTracker source="page_newsletter" />

      <section className="bg-primary-green section-padding">
        <div className="mx-auto max-w-xl text-center">
          <ScrollReveal>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-accent-peach">
              {NEWSLETTER_COPY.badge}
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-background-beige lg:text-6xl">
              {NEWSLETTER_COPY.title}
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg text-background-beige/75">
              {NEWSLETTER_COPY.subtitle}
            </p>
            <p className="mt-4 text-background-beige/75">
              🎁 {NEWSLETTER_COPY.gift.title} offert à l&apos;inscription.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <div className="mx-auto mt-10 max-w-sm">
              <NewsletterSignupForm source="page_newsletter" />
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default NewsletterPage;

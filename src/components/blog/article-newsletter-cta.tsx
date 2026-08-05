import { NewsletterSignupForm } from "@/app/(public)/newsletter/_components/newsletter-signup-form";
import { NEWSLETTER_COPY } from "@/config/newsletter";

/**
 * Inscription newsletter en fin d'article, affichée sur tous les articles —
 * avec ou sans encadré de rappel au-dessus.
 *
 * Fond vert profond : c'est le seul bloc de la page à inverser le contraste, ce
 * qui le détache de la lecture sans avoir besoin d'un accent supplémentaire.
 * C'est aussi le contexte pour lequel `NewsletterSignupForm` est stylé.
 */
export const ArticleNewsletterCta = () => (
  <section
    aria-labelledby="article-newsletter-titre"
    className="relative mt-12 bg-primary-green px-6 py-10 sm:px-10"
  >
    <p className="font-sans text-xs font-medium uppercase tracking-widest text-accent-peach">
      {NEWSLETTER_COPY.articleCta.eyebrow}
    </p>
    <h2
      id="article-newsletter-titre"
      className="mt-3 font-serif text-2xl font-bold text-background-beige sm:text-3xl"
    >
      {NEWSLETTER_COPY.articleCta.title}
    </h2>
    <p className="mt-4 max-w-2xl text-background-beige/70">
      {NEWSLETTER_COPY.articleCta.body}
    </p>
    <div className="mt-8 max-w-xl">
      <NewsletterSignupForm source="article_blog" />
    </div>
  </section>
);

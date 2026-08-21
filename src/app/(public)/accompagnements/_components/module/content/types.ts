import type { FaqItem } from "../../sales/sales-faq";

/**
 * Copie d'une page de vente de module. 100 % serialisable : aucun composant,
 * aucune fonction. Les chiffres (prix, chapitres, videos) viennent de la base,
 * jamais d'ici.
 *
 * Les sections optionnelles absentes ne sont pas rendues, ce qui permet à un
 * module d'avoir un parcours plus court sans branche `if` dans
 * l'orchestrateur (aucun module ne s'en sert actuellement).
 */
export type ModuleContent = {
  hero: {
    /** Ligne de credibilite au-dessus du titre. */
    eyebrow: string;
    /** Promesse portee par le H1 ; le nom produit reste affiche en dessous. */
    titleOverride: string;
    subtitle: string;
    ctaLabel: string;
  };
  problem?: {
    title: string;
    intro: string;
    points: string[];
  };
  promise?: {
    title: string;
    paragraphs: string[];
    bullets: string[];
  };
  program: {
    title: string;
    intro: string;
  };
  outcomes: {
    title: string;
    /** Ligne de bénéfice sous le titre de section, un cran au-dessus des items. */
    subtitle?: string;
    items: string[];
  };
  fit: {
    title: string;
    /** Ligne de bénéfice sous le titre de section. */
    subtitle?: string;
    forYouTitle: string;
    forYou: string[];
    notForYouTitle: string;
    notForYou: string[];
  };
  moment: {
    title: string;
    intro: string;
  };
  pricing: {
    title: string;
    subtitle: string;
  };
  /** Questions propres au module ; les communes viennent de SHARED_CONTENT. */
  faq: FaqItem[];
  finalCta: {
    title: string;
    subtitle: string;
    ctaLabel: string;
  };
};

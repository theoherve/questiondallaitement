/**
 * Source unique des avis affichés côté visiteur. Les avis Google sont recopiés
 * à la main : l'API Places interdit la mise en cache du texte des avis et n'en
 * renvoie que cinq, choisis par Google. Seuls la note globale et le nombre
 * d'avis sont récupérés en direct (voir src/lib/google-reviews.ts).
 */

import { MODULE_ORDER, PACK_SLUG } from "@/config/accompagnements";

/**
 * Cibles possibles d'un avis : un slug de module, ou le pack. Dérivé de
 * MODULE_ORDER (déclaré `as const`) et non des clés de MODULE_CONTENT, qui sont
 * typées `string` et ne contraindraient rien. Un slug mal orthographié devient
 * ainsi une erreur de compilation.
 */
export type TestimonialTopic =
  | (typeof MODULE_ORDER)[number]
  | typeof PACK_SLUG;

type TestimonialBase = {
  /** Slug stable : clé de rendu et cible de déduplication. */
  id: string;
  author: string;
  /** Contexte affiché sous le nom, par exemple « Maman de Morgan, 3 mois ». */
  detail: string;
  quote: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Vide = avis générique, éligible au repli des pages de vente. */
  topics: readonly TestimonialTopic[];
  /** Éligible à la page d'accueil et au repli des pages de vente. */
  featured?: boolean;
  /** Date ISO (AAAA-MM-JJ). Sert uniquement à l'ordre d'affichage. */
  date?: string;
};

export type Testimonial =
  | (TestimonialBase & { source: "direct" })
  | (TestimonialBase & { source: "google"; reviewUrl: string });

/**
 * Vide tant que Carole n'a pas fourni les avis réels et les autorisations de
 * publication. Les sections concernées ne s'affichent pas : c'est voulu, aucun
 * témoignage d'exemple ne doit être ajouté ici.
 */
export const TESTIMONIALS: readonly Testimonial[] = [];

/**
 * Fiche Google. Les valeurs de repli servent quand l'API est indisponible ou
 * non configurée ; les tenir à jour à la main reste sans conséquence, elles ne
 * sont affichées que dans ce cas.
 */
export const GOOGLE_PROFILE = {
  url: "https://www.google.com/maps",
  ratingFallback: 5,
  reviewCountFallback: 0,
} as const;

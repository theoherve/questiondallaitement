/**
 * Constantes partagées des accompagnements (formations publiées).
 * Centralise ce qui était dupliqué dans la page /accompagnements et la home.
 * 100 % sérialisable (aucun composant React) — safe Server → Client.
 */

/** Slug du pack phare, affiché en vedette. */
export const PACK_SLUG = "pack-essentiel-allaitement";

/** Ordre d'affichage souhaité des modules individuels (par slug). */
export const MODULE_ORDER = [
  "je-me-prepare-a-allaiter",
  "mon-allaitement-des-premiers-jours",
  "mon-allaitement-au-fil-des-mois",
  "je-reprends-une-activite-professionnelle",
  "la-diversification-de-mon-bebe-allaite",
  "je-souhaite-sevrer-mon-bebe",
  "mon-bebe-ne-fait-pas-ses-nuits",
  "les-urgences-allaitement",
] as const;

/** Trie une liste (par slug) selon MODULE_ORDER ; inconnus à la fin. */
export const sortByModuleOrder = <T extends { slug: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => {
    const ia = MODULE_ORDER.indexOf(a.slug as (typeof MODULE_ORDER)[number]);
    const ib = MODULE_ORDER.indexOf(b.slug as (typeof MODULE_ORDER)[number]);
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  });

/** Formatage prix FR (centimes → « 29,00 € »). */
export const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100
  );

/**
 * Présentation de repli quand un module n'a pas de `thumbnail_url` :
 * dégradé de marque + icône lucide (résolue côté composant via `iconKey`).
 * Clé = slug du module.
 */
export type ModuleAccent = {
  /** Deux tokens CSS de couleur pour le dégradé de la vignette. */
  from: string;
  to: string;
  /** Nom d'icône lucide résolu dans le composant. */
  iconKey:
    | "Sprout"
    | "Sunrise"
    | "CalendarHeart"
    | "Briefcase"
    | "UtensilsCrossed"
    | "Leaf"
    | "Moon"
    | "ShieldPlus";
};

export const MODULE_ACCENTS: Record<string, ModuleAccent> = {
  "je-me-prepare-a-allaiter": {
    from: "var(--color-accent-sage)",
    to: "var(--color-accent-sage-soft)",
    iconKey: "Sprout",
  },
  "mon-allaitement-des-premiers-jours": {
    from: "var(--color-accent-peach)",
    to: "var(--color-accent-peach-soft)",
    iconKey: "Sunrise",
  },
  "mon-allaitement-au-fil-des-mois": {
    from: "var(--color-accent-honey)",
    to: "var(--color-accent-honey-soft)",
    iconKey: "CalendarHeart",
  },
  "je-reprends-une-activite-professionnelle": {
    from: "var(--color-accent-sage)",
    to: "var(--color-accent-sage-soft)",
    iconKey: "Briefcase",
  },
  "la-diversification-de-mon-bebe-allaite": {
    from: "var(--color-accent-honey)",
    to: "var(--color-accent-honey-soft)",
    iconKey: "UtensilsCrossed",
  },
  "je-souhaite-sevrer-mon-bebe": {
    from: "var(--color-accent-peach)",
    to: "var(--color-accent-peach-soft)",
    iconKey: "Leaf",
  },
  "mon-bebe-ne-fait-pas-ses-nuits": {
    from: "var(--color-accent-sage)",
    to: "var(--color-accent-sage-soft)",
    iconKey: "Moon",
  },
  "les-urgences-allaitement": {
    from: "var(--color-primary-red-light)",
    to: "var(--color-accent-peach-soft)",
    iconKey: "ShieldPlus",
  },
};

/** Accent de repli neutre pour un slug non répertorié. */
export const DEFAULT_MODULE_ACCENT: ModuleAccent = {
  from: "var(--color-accent-sage)",
  to: "var(--color-accent-sage-soft)",
  iconKey: "Sprout",
};

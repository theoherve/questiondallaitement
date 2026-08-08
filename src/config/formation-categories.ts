/**
 * Familles de format d'une formation.
 *
 * La categorie etait auparavant devinee a partir du titre
 * (`title.startsWith("atelier")`). Elle est desormais une colonne de
 * `formations` (migration 00075) : l'intitule peut changer sans que la
 * pastille et les filtres suivent.
 *
 * Les cles doivent rester alignees sur l'enum `formation_category`.
 */
export const FORMATION_CATEGORIES = [
  "formation",
  "webinaire",
  "atelier_mensuel",
  "masterclass",
  "conference",
  "e_learning",
] as const;

export type FormationCategory = (typeof FORMATION_CATEGORIES)[number];

type CategoryConfig = {
  /** Intitule de la pastille sur une carte ou une fiche. */
  label: string;
  /** Intitule du filtre, au pluriel. */
  filterLabel: string;
  /** Phrase de la legende affichee sous le titre de la page. */
  description: string;
  color: string;
};

/**
 * Typee sur l'union et non sur `string` : une valeur ajoutee a l'enum sans
 * libelle devient une erreur de compilation plutot qu'une pastille vide.
 */
export const FORMATION_CATEGORY_CONFIG: Record<FormationCategory, CategoryConfig> = {
  formation: {
    label: "Formation",
    filterLabel: "Formations",
    description: "un parcours riche et complet",
    color: "bg-primary-green text-white",
  },
  webinaire: {
    label: "Webinaire",
    filterLabel: "Webinaires",
    description: "format de formation court",
    color: "bg-blue-700 text-white",
  },
  atelier_mensuel: {
    label: "Atelier mensuel",
    filterLabel: "Ateliers mensuels",
    description: "réservés aux abonnés à un accompagnement en ligne",
    color: "bg-pink-600 text-white",
  },
  masterclass: {
    label: "Masterclass",
    filterLabel: "Masterclass",
    description: "un sujet précis approfondi en une session",
    color: "bg-amber-600 text-white",
  },
  conference: {
    label: "Conférence",
    filterLabel: "Conférences",
    description: "une intervention ponctuelle, souvent gratuite",
    color: "bg-primary-red text-white",
  },
  e_learning: {
    label: "E-learning",
    filterLabel: "E-learning",
    description: "à suivre quand vous voulez, à votre rythme",
    color: "bg-primary-green/80 text-white",
  },
};

/**
 * Categorie d'une formation, avec repli sur « formation ».
 *
 * Le repli couvre le cas d'une valeur lue depuis la base avant que le code ne
 * connaisse une nouvelle categorie : mieux vaut une pastille generique qu'un
 * rendu casse.
 */
export const resolveFormationCategory = (category: string | null): CategoryConfig =>
  FORMATION_CATEGORY_CONFIG[category as FormationCategory] ??
  FORMATION_CATEGORY_CONFIG.formation;

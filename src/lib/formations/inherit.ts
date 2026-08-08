/**
 * Heritage du contenu editorial depuis la fiche partagee.
 *
 * Une meme formation se tient a des dizaines de dates. Le resume, les
 * objectifs, le programme et le public vise vivent donc sur
 * `formation_templates` et non sur chaque session (migration 00076).
 *
 * La session garde le dernier mot : une valeur saisie sur la session
 * l'emporte, ce qui permet d'amenager un programme ou d'elargir un public
 * pour une date precise sans dupliquer la fiche.
 */

/** Colonnes qu'une session peut heriter de sa fiche. */
export const INHERITABLE_FIELDS = [
  "summary_html",
  "objectives_html",
  "program_html",
  "audience_html",
  "external_url",
  "badge",
] as const;

export type InheritableField = (typeof INHERITABLE_FIELDS)[number];

export type FormationTemplateFields = Partial<Record<InheritableField, string | null>>;

type WithTemplate<T> = T & {
  formation_templates?: FormationTemplateFields | null;
};

/**
 * Renvoie la formation avec ses champs vides completes par ceux de sa fiche.
 *
 * Une chaine vide compte comme non saisie : l'editeur du back-office produit
 * `""` quand on efface tout le contenu d'une section, et une section vide ne
 * doit pas priver la session de l'heritage.
 */
export const inheritFromTemplate = <T extends FormationTemplateFields>(
  formation: WithTemplate<T>,
): T => {
  const template = formation.formation_templates;
  if (!template) return formation;

  const inherited: FormationTemplateFields = {};
  for (const field of INHERITABLE_FIELDS) {
    const own = formation[field];
    if (own == null || own === "") inherited[field] = template[field] ?? null;
  }

  return { ...formation, ...inherited };
};

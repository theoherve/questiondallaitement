/**
 * Public vise par une session, distinct de la categorie (qui decrit un
 * format). Miroir de l'enum `formation_audience_group` (migration 00091).
 */
export const FORMATION_AUDIENCE_GROUPS = ["maman", "pro", "both"] as const;

export type FormationAudienceGroup = (typeof FORMATION_AUDIENCE_GROUPS)[number];

export const FORMATION_AUDIENCE_GROUP_LABELS: Record<FormationAudienceGroup, string> = {
  maman: "Mamans",
  pro: "Professionnels de santé",
  both: "Mamans et professionnels",
};

/** Etat du toggle public sur /formations. */
export type AudienceFilter = "all" | "maman" | "pro";

export const AUDIENCE_FILTERS: { value: AudienceFilter; label: string }[] = [
  { value: "all", label: "Tout voir" },
  { value: "maman", label: "Pour les mamans" },
  { value: "pro", label: "Pour les pros de santé" },
];

/**
 * Slug d'un organisme de formation, derive de son nom.
 *
 * Le slug est la cle unique de `training_providers` : c'est lui qui rend la
 * creation libre idempotente, deux saisies du meme nom retombant sur la meme
 * ligne quelles que soient la casse et les accents.
 */
export const slugifyProviderName = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Filtre public "Organisme" sur /formations : "all" ou l'id d'un organisme. */
export type ProviderFilter = "all" | string;

/**
 * Une formation sans organisme (organisee directement par Carole) reste
 * toujours visible, quel que soit l'organisme selectionne : ce filtre ne
 * restreint que les formations qui EN ONT un.
 */
export const matchesProviderFilter = (
  providerId: string | null,
  filter: ProviderFilter,
): boolean => {
  if (filter === "all") return true;
  if (providerId === null) return true;
  return providerId === filter;
};

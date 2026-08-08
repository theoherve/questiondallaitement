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

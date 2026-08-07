/** Code de reduction negocie avec les organismes partenaires. */
export const EXTERNAL_PROMO_CODE = "MILKPOWER";

/**
 * Ajoute le code partenaire au lien d'inscription de l'organisme.
 *
 * Utilise par la fiche formation et par la carte de la liste : le code doit
 * partir quelle que soit la porte d'entree, d'ou la centralisation ici.
 */
export const buildExternalUrl = (url: string): string => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}code=${EXTERNAL_PROMO_CODE}`;
};

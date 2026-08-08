/**
 * Codes de reduction negocies avec les organismes partenaires.
 *
 * Ils sont choisis formation par formation (`formations.partner_promo_codes`).
 * Nous ne les appliquons pas : c'est l'organisme qui les honore sur son propre
 * site, nous les annoncons et les transmettons.
 */

/** Un code par formation suffit au lien : une URL n'en accepte qu'un. */
const codeParam = (codes: string[] | null | undefined): string | null => {
  const first = codes?.find((code) => code.trim() !== "");
  return first ? first.trim() : null;
};

/**
 * Ajoute le code partenaire au lien d'inscription de l'organisme.
 *
 * Utilise par la fiche formation et par la carte de la liste : le code doit
 * partir quelle que soit la porte d'entree, d'ou la centralisation ici. Sans
 * code, le lien part tel quel.
 */
export const buildExternalUrl = (
  url: string,
  codes?: string[] | null,
): string => {
  const code = codeParam(codes);
  if (!code) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}code=${encodeURIComponent(code)}`;
};

/**
 * Libelle du badge affiche sur la carte et la fiche.
 *
 * Renvoie `null` quand la formation n'a aucun code : le badge disparait alors
 * completement plutot que d'annoncer une reduction inexistante.
 */
export const promoCodeLabel = (
  codes: string[] | null | undefined,
): string | null => {
  const cleaned = (codes ?? []).map((code) => code.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return cleaned.length === 1
    ? `Code ${cleaned[0]}`
    : `Codes ${cleaned.join(", ")}`;
};

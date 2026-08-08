import { formatPrice } from "@/config/accompagnements";

/**
 * Ancrage de valeur en bas d'une page de module : ce qu'il reste a payer pour
 * passer au pack complet. Meme logique que `savingsCents` cote pack, vue depuis
 * l'autre bout. Tout vient de la base, rien n'est ecrit en dur.
 */
export type PackUpsell = {
  deltaCents: number;
  /** Complement formate, ex. « 322,00 € ». */
  deltaLabel: string;
  /** Nombre de modules que la cliente n'a pas encore, hors module courant. */
  otherModulesCount: number;
  packTitle: string;
};

export function computePackUpsell({
  packPriceCents,
  packTitle,
  modulePriceCents,
  currency,
  totalModulesCount,
}: {
  /** Null quand le pack n'est pas publie ou introuvable. */
  packPriceCents: number | null;
  packTitle: string | null;
  modulePriceCents: number;
  currency: string;
  /** Nombre de modules publies du catalogue, module courant inclus. */
  totalModulesCount: number;
}): PackUpsell | null {
  if (packPriceCents === null || packTitle === null) return null;

  const deltaCents = packPriceCents - modulePriceCents;
  if (deltaCents <= 0) return null;

  const otherModulesCount = totalModulesCount - 1;
  if (otherModulesCount < 1) return null;

  return {
    deltaCents,
    deltaLabel: formatPrice(deltaCents, currency),
    otherModulesCount,
    packTitle,
  };
}

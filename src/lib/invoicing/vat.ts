/**
 * Decomposition d'un prix TTC en base hors taxe et TVA.
 *
 * Les prix du site sont affiches et encaisses TTC : c'est donc ce montant
 * qu'on redecoupe pour la facture, jamais l'inverse.
 */

/** Taux de TVA applique par Carole HERVÉ (IBCLC, non exoneree). */
export const STANDARD_VAT_RATE = 20;

export type VatBreakdown = {
  ttcCents: number;
  htCents: number;
  vatCents: number;
  /** Taux en points de pourcentage (20 pour 20 %). */
  rate: number;
};

export const breakdownFromTTC = (
  ttcCents: number,
  rate: number,
): VatBreakdown => {
  if (ttcCents < 0) {
    throw new Error(`Montant TTC negatif : ${ttcCents}`);
  }

  const htCents = Math.round(ttcCents / (1 + rate / 100));

  // La TVA est le reste, pas un produit arrondi separement : ainsi
  // HT + TVA egale exactement le TTC encaisse, quelle que soit la parite du
  // montant. Meme principe que la repartition des reversements (4-6).
  const vatCents = ttcCents - htCents;

  return { ttcCents, htCents, vatCents, rate };
};

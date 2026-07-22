/**
 * Numero de facture au format `AAAA-MM-NNNN` (ex. `2026-07-0001`).
 *
 * La sequence `NNNN` est propre a chaque consultante et remise a zero chaque
 * mois : c'est l'attribution du numero (cote base, atomique) qui garantit
 * l'absence de trou et de doublon. Cette fonction ne fait que le rendu.
 */

const pad = (value: number, width: number): string =>
  String(value).padStart(width, "0");

export const formatInvoiceNumber = (
  year: number,
  month: number,
  sequence: number,
): string => {
  if (month < 1 || month > 12) {
    throw new Error(`Mois invalide : ${month}`);
  }
  if (sequence < 1) {
    // La numerotation commence a 1 ; 0 ou negatif trahit une erreur d'allocation.
    throw new Error(`Sequence invalide : ${sequence}`);
  }
  // La sequence est padee a quatre chiffres mais jamais tronquee : au-dela de
  // 9999 factures dans le mois, on prefere un numero plus long a un doublon.
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(sequence, 4)}`;
};

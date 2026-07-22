import { breakdownFromTTC } from "./vat";

/**
 * Construit le contenu de la facture corrigee passe a `correct_invoice`.
 *
 * Pur : la nouvelle designation et le nouveau TTC (saisis par la consultante)
 * sont redecoupes en HT + TVA au taux d'origine. L'avoir et l'identite des
 * parties sont, eux, repris tels quels de l'originale, cote base.
 */
export type CorrectionInput = {
  vatRate: number;
  description: string;
  ttcCents: number;
};

export type CorrectionContent = {
  vat_rate: number;
  description: string;
  amount_ttc_cents: number;
  amount_ht_cents: number;
  amount_vat_cents: number;
};

export const buildCorrectionContent = (
  input: CorrectionInput,
): CorrectionContent => {
  if (input.description.trim().length === 0) {
    throw new Error("La désignation est obligatoire.");
  }
  if (input.ttcCents <= 0) {
    throw new Error("Le montant doit être strictement positif.");
  }

  const { htCents, vatCents } = breakdownFromTTC(input.ttcCents, input.vatRate);

  return {
    vat_rate: input.vatRate,
    description: input.description.trim(),
    amount_ttc_cents: input.ttcCents,
    amount_ht_cents: htCents,
    amount_vat_cents: vatCents,
  };
};

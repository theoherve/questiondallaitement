/**
 * Identite de facturation d'une consultante.
 *
 * La facture est emise par la consultante : son en-tete porte ces mentions,
 * toutes obligatoires sur une facture francaise. Tant qu'elles ne sont pas
 * renseignees, aucune facture conforme ne peut etre produite — donc aucune
 * vente en ligne ne peut aboutir pour cette consultante (gate applique a
 * l'emission).
 */

export type BillingProfile = {
  billing_legal_name: string | null;
  billing_address: string | null;
  billing_siren: string | null;
  billing_vat_number: string | null;
};

/** Champs sans lesquels une facture n'est pas recevable. */
export const REQUIRED_BILLING_FIELDS = [
  "billing_legal_name",
  "billing_address",
  "billing_siren",
  "billing_vat_number",
] as const;

export type RequiredBillingField = (typeof REQUIRED_BILLING_FIELDS)[number];

const isBlank = (value: string | null | undefined): boolean =>
  !value || value.trim().length === 0;

export const missingBillingFields = (
  profile: BillingProfile,
): RequiredBillingField[] =>
  REQUIRED_BILLING_FIELDS.filter((field) => isBlank(profile[field]));

export const isBillingComplete = (profile: BillingProfile): boolean =>
  missingBillingFields(profile).length === 0;

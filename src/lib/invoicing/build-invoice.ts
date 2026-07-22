/**
 * Assemble le *contenu* d'une facture a partir du paiement confirme et de
 * l'identite de facturation de la consultante.
 *
 * Fonction pure. Le numero, la sequence et la date d'emission ne sont
 * volontairement pas produits ici : ils sont attribues de facon atomique cote
 * base (fonction `create_invoice`), seule maniere de garantir une numerotation
 * sans trou ni doublon meme lors d'une redelivery Stripe simultanee.
 *
 * L'identite de l'emettrice est figee dans la facture : une facture emise est
 * immuable, meme si la consultante modifie ensuite son profil.
 */

import { breakdownFromTTC, STANDARD_VAT_RATE } from "./vat";
import {
  isBillingComplete,
  type BillingProfile,
} from "./billing-profile";

type PaymentType = "formation" | "booking" | "event";

export type BuildInvoiceInput = {
  paymentId: string;
  consultantId: string;
  clientId: string;
  type: PaymentType;
  referenceId: string;
  ttcCents: number;
  currency: string;
  description: string;
  clientName: string;
  clientEmail: string;
  vatRate?: number;
  issuer: BillingProfile & { billing_legal_form: string | null };
};

/** Champs metier de la facture, hors identite du numero (allouee en base). */
export type InvoiceContent = {
  payment_id: string;
  consultant_id: string;
  client_id: string;
  type: PaymentType;
  reference_id: string;
  currency: string;
  vat_rate: number;
  amount_ttc_cents: number;
  amount_ht_cents: number;
  amount_vat_cents: number;
  description: string;
  client_name: string;
  client_email: string;
  issuer_legal_name: string;
  issuer_address: string;
  issuer_siren: string;
  issuer_vat_number: string;
  issuer_legal_form: string | null;
  status: "issued";
};

export const buildInvoiceContent = (input: BuildInvoiceInput): InvoiceContent => {
  if (!isBillingComplete(input.issuer)) {
    throw new Error(
      "Impossible d'emettre une facture : profil de facturation incomplet.",
    );
  }

  const rate = input.vatRate ?? STANDARD_VAT_RATE;
  const { htCents, vatCents } = breakdownFromTTC(input.ttcCents, rate);

  return {
    payment_id: input.paymentId,
    consultant_id: input.consultantId,
    client_id: input.clientId,
    type: input.type,
    reference_id: input.referenceId,
    currency: input.currency,
    vat_rate: rate,
    amount_ttc_cents: input.ttcCents,
    amount_ht_cents: htCents,
    amount_vat_cents: vatCents,
    description: input.description,
    client_name: input.clientName,
    client_email: input.clientEmail,
    // Snapshot fige : ces valeurs ne suivent pas les modifications ulterieures
    // du profil de la consultante.
    issuer_legal_name: input.issuer.billing_legal_name as string,
    issuer_address: input.issuer.billing_address as string,
    issuer_siren: input.issuer.billing_siren as string,
    issuer_vat_number: input.issuer.billing_vat_number as string,
    issuer_legal_form: input.issuer.billing_legal_form,
    status: "issued",
  };
};

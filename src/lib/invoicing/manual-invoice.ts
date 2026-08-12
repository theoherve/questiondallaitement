import { breakdownFromTTC, STANDARD_VAT_RATE } from "./vat";

export type ManualInvoiceInput = {
  description: string;
  ttcCents: number;
  dueDate?: string;
};

export type ManualInvoiceContent = {
  description: string;
  vat_rate: number;
  amount_ttc_cents: number;
  amount_ht_cents: number;
  amount_vat_cents: number;
  due_date: string | null;
};

export const buildManualInvoiceContent = (
  input: ManualInvoiceInput,
): ManualInvoiceContent => {
  if (input.description.trim().length === 0) {
    throw new Error("La désignation est obligatoire.");
  }
  if (input.ttcCents <= 0) {
    throw new Error("Le montant doit être strictement positif.");
  }

  const { htCents, vatCents } = breakdownFromTTC(
    input.ttcCents,
    STANDARD_VAT_RATE,
  );

  return {
    description: input.description.trim(),
    vat_rate: STANDARD_VAT_RATE,
    amount_ttc_cents: input.ttcCents,
    amount_ht_cents: htCents,
    amount_vat_cents: vatCents,
    due_date: input.dueDate ?? null,
  };
};

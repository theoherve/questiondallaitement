import { describe, it, expect } from "vitest";
import { buildInvoiceContent, type BuildInvoiceInput } from "./build-invoice";

const base: BuildInvoiceInput = {
  paymentId: "pay-1",
  consultantId: "cons-1",
  clientId: "cli-1",
  type: "booking",
  referenceId: "ref-1",
  ttcCents: 8000,
  currency: "eur",
  description: "Consultation lactation — 60 min",
  clientName: "Marie Dupont",
  clientEmail: "marie@example.com",
  issuer: {
    billing_legal_name: "Carole HERVÉ",
    billing_address: "1 rue des Lilas, 44000 Nantes",
    billing_siren: "540075819",
    billing_vat_number: "FR94540075819",
    billing_legal_form: "Entreprise individuelle",
  },
};

describe("buildInvoiceContent", () => {
  it("decompose le TTC en HT + TVA a 20 % au centime", () => {
    const row = buildInvoiceContent(base);
    expect(row.amount_ttc_cents).toBe(8000);
    expect(row.amount_ht_cents).toBe(6667);
    expect(row.amount_vat_cents).toBe(1333);
    expect(row.amount_ht_cents + row.amount_vat_cents).toBe(row.amount_ttc_cents);
    expect(row.vat_rate).toBe(20);
  });

  it("fige l'identite de l'emettrice dans la facture (immuabilite)", () => {
    const row = buildInvoiceContent(base);
    expect(row.issuer_legal_name).toBe("Carole HERVÉ");
    expect(row.issuer_address).toBe("1 rue des Lilas, 44000 Nantes");
    expect(row.issuer_siren).toBe("540075819");
    expect(row.issuer_vat_number).toBe("FR94540075819");
    expect(row.issuer_legal_form).toBe("Entreprise individuelle");
  });

  it("reporte le lien vers le paiement et les parties, sans allouer de numero", () => {
    // Le numero et la sequence sont attribues de facon atomique cote base :
    // le contenu construit ici n'en porte volontairement aucune trace.
    const row = buildInvoiceContent(base) as Record<string, unknown>;
    expect(row.payment_id).toBe("pay-1");
    expect(row.consultant_id).toBe("cons-1");
    expect(row.client_id).toBe("cli-1");
    expect(row.status).toBe("issued");
    expect(row.number).toBeUndefined();
    expect(row.sequence).toBeUndefined();
  });

  it("reporte la remise dans le contenu de la facture", () => {
    const row = buildInvoiceContent({
      ...base,
      ttcCents: 8500,
      promoCode: "SUPERMAMAN",
      discountCents: 1500,
      grossTtcCents: 10_000,
    });

    expect(row).toMatchObject({
      amount_ttc_cents: 8500,
      promo_code: "SUPERMAMAN",
      discount_cents: 1500,
      gross_amount_ttc_cents: 10_000,
    });
  });

  it("laisse les champs de remise nuls sans code", () => {
    expect(buildInvoiceContent(base)).toMatchObject({
      promo_code: null,
      discount_cents: null,
      gross_amount_ttc_cents: null,
    });
  });

  it("refuse d'emettre sans les mentions obligatoires de l'emettrice", () => {
    // Une facture sans raison sociale ni adresse n'a aucune valeur legale :
    // mieux vaut echouer que produire un document non conforme.
    expect(() =>
      buildInvoiceContent({
        ...base,
        issuer: { ...base.issuer, billing_address: "  " },
      }),
    ).toThrow();
  });
});

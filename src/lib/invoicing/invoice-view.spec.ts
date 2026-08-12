import { describe, it, expect } from "vitest";
import { formatMoneyCents, buildInvoiceView, type InvoiceRecord } from "./invoice-view";

const record: InvoiceRecord = {
  number: "2026-07-0001",
  issued_at: "2026-07-22T08:30:00.000Z",
  type: "booking",
  currency: "eur",
  vat_rate: 20,
  amount_ht_cents: 6667,
  amount_vat_cents: 1333,
  amount_ttc_cents: 8000,
  description: "Consultation — Allaitement",
  client_name: "Marie Dupont",
  client_email: "marie@example.com",
  issuer_legal_name: "Carole HERVÉ",
  issuer_address: "1 rue des Lilas, 44000 Nantes",
  issuer_siren: "540075819",
  issuer_vat_number: "FR94540075819",
  issuer_legal_form: "Entreprise individuelle",
  status: "issued",
};

describe("formatMoneyCents", () => {
  it("formate des centimes en euros a la francaise", () => {
    expect(formatMoneyCents(8000, "eur")).toBe("80,00 €");
    expect(formatMoneyCents(6667, "eur")).toBe("66,67 €");
    expect(formatMoneyCents(0, "eur")).toBe("0,00 €");
  });
});

describe("buildInvoiceView", () => {
  it("reporte les mentions obligatoires de l'emettrice", () => {
    const view = buildInvoiceView(record);
    expect(view.issuer.legalName).toBe("Carole HERVÉ");
    expect(view.issuer.address).toBe("1 rue des Lilas, 44000 Nantes");
    expect(view.issuer.siren).toBe("540075819");
    expect(view.issuer.vatNumber).toBe("FR94540075819");
    expect(view.issuer.legalForm).toBe("Entreprise individuelle");
  });

  it("formate les montants et le taux de TVA", () => {
    const view = buildInvoiceView(record);
    expect(view.ht).toBe("66,67 €");
    expect(view.vat).toBe("13,33 €");
    expect(view.ttc).toBe("80,00 €");
    expect(view.vatRateLabel).toBe("20 %");
  });

  it("formate la date d'emission en francais", () => {
    const view = buildInvoiceView(record);
    expect(view.issuedDate).toBe("22 juillet 2026");
  });

  it("marque une facture annulee", () => {
    expect(buildInvoiceView(record).isCancelled).toBe(false);
    expect(buildInvoiceView({ ...record, status: "cancelled" }).isCancelled).toBe(
      true,
    );
  });

  it("intitule le document selon son type", () => {
    expect(buildInvoiceView(record).documentLabel).toBe("Facture");
    const avoir = buildInvoiceView({ ...record, document_type: "credit_note" });
    expect(avoir.documentLabel).toBe("Avoir");
    expect(avoir.isCreditNote).toBe(true);
  });

  it("expose la ligne de remise quand la facture en porte une", () => {
    const view = buildInvoiceView({
      ...record,
      amount_ttc_cents: 8500,
      promo_code: "SUPERMAMAN",
      discount_cents: 1500,
      gross_amount_ttc_cents: 10_000,
    });

    expect(view.discount).toEqual({
      label: "Remise SUPERMAMAN",
      gross: "100,00 €",
      amount: "-15,00 €",
    });
  });

  it("n'expose pas de ligne de remise sans code", () => {
    expect(buildInvoiceView(record).discount).toBeUndefined();
  });

  it("gere un taux de TVA a virgule sans zero superflu", () => {
    const view = buildInvoiceView({ ...record, vat_rate: 5.5 });
    expect(view.vatRateLabel).toBe("5,5 %");
  });

  it("expose les instructions de virement pour une facture manuelle impayee avec IBAN", () => {
    const view = buildInvoiceView({
      ...record,
      origin: "manual",
      payment_status: "unpaid",
      issuer_iban: "FR7630006000011234567890189",
      issuer_bic: "BNPAFRPPXXX",
    });
    expect(view.paymentInstructions).toEqual({
      iban: "FR7630006000011234567890189",
      bic: "BNPAFRPPXXX",
    });
  });

  it("n'expose pas d'instructions de virement une fois la facture payee", () => {
    const view = buildInvoiceView({
      ...record,
      origin: "manual",
      payment_status: "paid",
      issuer_iban: "FR7630006000011234567890189",
      issuer_bic: "BNPAFRPPXXX",
    });
    expect(view.paymentInstructions).toBeUndefined();
  });

  it("n'expose pas d'instructions pour une facture Stripe", () => {
    const view = buildInvoiceView({
      ...record,
      origin: "stripe",
      payment_status: "paid",
      issuer_iban: "FR7630006000011234567890189",
      issuer_bic: "BNPAFRPPXXX",
    });
    expect(view.paymentInstructions).toBeUndefined();
  });
});

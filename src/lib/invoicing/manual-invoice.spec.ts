import { describe, it, expect } from "vitest";
import { buildManualInvoiceContent } from "./manual-invoice";

describe("buildManualInvoiceContent", () => {
  it("decompose le TTC en HT + TVA a 20%", () => {
    const content = buildManualInvoiceContent({
      description: "Pack de 3 consultations",
      ttcCents: 24000,
    });
    expect(content).toEqual({
      description: "Pack de 3 consultations",
      vat_rate: 20,
      amount_ttc_cents: 24000,
      amount_ht_cents: 20000,
      amount_vat_cents: 4000,
      due_date: null,
    });
  });

  it("reprend l'echeance fournie telle quelle", () => {
    const content = buildManualInvoiceContent({
      description: "Formation sur mesure",
      ttcCents: 15000,
      dueDate: "2026-09-15T00:00:00.000Z",
    });
    expect(content.due_date).toBe("2026-09-15T00:00:00.000Z");
  });

  it("refuse une designation vide", () => {
    expect(() =>
      buildManualInvoiceContent({ description: "   ", ttcCents: 8000 }),
    ).toThrow();
  });

  it("refuse un montant nul ou negatif", () => {
    expect(() =>
      buildManualInvoiceContent({ description: "x", ttcCents: 0 }),
    ).toThrow();
    expect(() =>
      buildManualInvoiceContent({ description: "x", ttcCents: -500 }),
    ).toThrow();
  });
});

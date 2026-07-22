import { describe, it, expect } from "vitest";
import { buildCorrectionContent } from "./correction";

describe("buildCorrectionContent", () => {
  it("decompose le nouveau TTC en HT + TVA au taux d'origine", () => {
    const content = buildCorrectionContent({
      vatRate: 20,
      description: "Consultation — 90 min",
      ttcCents: 12000,
    });
    expect(content).toEqual({
      vat_rate: 20,
      description: "Consultation — 90 min",
      amount_ttc_cents: 12000,
      amount_ht_cents: 10000,
      amount_vat_cents: 2000,
    });
  });

  it("garantit HT + TVA = TTC au centime", () => {
    const content = buildCorrectionContent({
      vatRate: 20,
      description: "x",
      ttcCents: 8000,
    });
    expect(content.amount_ht_cents + content.amount_vat_cents).toBe(8000);
  });

  it("refuse une designation vide", () => {
    expect(() =>
      buildCorrectionContent({ vatRate: 20, description: "  ", ttcCents: 8000 }),
    ).toThrow();
  });

  it("refuse un montant nul ou negatif", () => {
    expect(() =>
      buildCorrectionContent({ vatRate: 20, description: "x", ttcCents: 0 }),
    ).toThrow();
    expect(() =>
      buildCorrectionContent({ vatRate: 20, description: "x", ttcCents: -100 }),
    ).toThrow();
  });
});

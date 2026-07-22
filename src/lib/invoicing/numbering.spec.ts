import { describe, it, expect } from "vitest";
import { formatInvoiceNumber } from "./numbering";

describe("formatInvoiceNumber", () => {
  it("formate AAAA-MM-NNNN avec le mois et la sequence sur deux et quatre chiffres", () => {
    expect(formatInvoiceNumber(2026, 7, 1)).toBe("2026-07-0001");
  });

  it("ne tronque pas un mois deja sur deux chiffres", () => {
    expect(formatInvoiceNumber(2026, 12, 42)).toBe("2026-12-0042");
  });

  it("laisse la sequence s'etendre au-dela de quatre chiffres plutot que de tronquer", () => {
    // Un numero tronque creerait un doublon : mieux vaut cinq chiffres.
    expect(formatInvoiceNumber(2026, 7, 12345)).toBe("2026-07-12345");
  });

  it("refuse une sequence nulle ou negative : la numerotation commence a 1", () => {
    expect(() => formatInvoiceNumber(2026, 7, 0)).toThrow();
    expect(() => formatInvoiceNumber(2026, 7, -1)).toThrow();
  });

  it("refuse un mois hors plage", () => {
    expect(() => formatInvoiceNumber(2026, 0, 1)).toThrow();
    expect(() => formatInvoiceNumber(2026, 13, 1)).toThrow();
  });
});

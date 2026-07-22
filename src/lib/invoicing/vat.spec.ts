import { describe, it, expect } from "vitest";
import { breakdownFromTTC, STANDARD_VAT_RATE } from "./vat";

describe("breakdownFromTTC", () => {
  it("decompose un prix TTC en HT + TVA a 20 %", () => {
    // 80 € TTC = 66,67 € HT + 13,33 € TVA. Les prix du site sont affiches et
    // encaisses TTC : c'est le montant paye qu'on redecoupe, pas l'inverse.
    expect(breakdownFromTTC(8000, STANDARD_VAT_RATE)).toEqual({
      ttcCents: 8000,
      htCents: 6667,
      vatCents: 1333,
      rate: 20,
    });
  });

  it("garantit que HT + TVA egale toujours le TTC", () => {
    // La TVA est le reste, pas un produit arrondi separement : sinon la somme
    // pourrait s'ecarter d'un centime du montant reellement encaisse, et une
    // facture dont le total ne tombe pas juste n'est pas recevable.
    for (const ttc of [100, 999, 4999, 8000, 12345, 9900]) {
      const b = breakdownFromTTC(ttc, STANDARD_VAT_RATE);
      expect(b.htCents + b.vatCents).toBe(ttc);
    }
  });

  it("gere un taux nul sans inventer de TVA", () => {
    // Une future consultante exoneree (profession de sante) facturerait a 0 %.
    expect(breakdownFromTTC(8000, 0)).toEqual({
      ttcCents: 8000,
      htCents: 8000,
      vatCents: 0,
      rate: 0,
    });
  });

  it("traite un montant nul", () => {
    expect(breakdownFromTTC(0, STANDARD_VAT_RATE)).toEqual({
      ttcCents: 0,
      htCents: 0,
      vatCents: 0,
      rate: 20,
    });
  });

  it("refuse un montant negatif", () => {
    expect(() => breakdownFromTTC(-100, STANDARD_VAT_RATE)).toThrow();
  });
});

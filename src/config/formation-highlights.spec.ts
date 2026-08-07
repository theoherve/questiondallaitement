import { describe, it, expect } from "vitest";
import { resolveFormationHighlights } from "./formation-highlights";

describe("resolveFormationHighlights", () => {
  it("rend les reperes dans l'ordre du catalogue, pas celui de la saisie", () => {
    const labels = resolveFormationHighlights(["ibclc", "elearning"]).map(
      ({ label }) => label,
    );

    expect(labels).toEqual(["E-Learning", "Formatrice certifiée IBCLC"]);
  });

  it("ignore une cle inconnue", () => {
    expect(resolveFormationHighlights(["zoom", "cle-retiree"])).toHaveLength(1);
  });

  it("rend une liste vide pour null ou un tableau vide", () => {
    expect(resolveFormationHighlights(null)).toEqual([]);
    expect(resolveFormationHighlights([])).toEqual([]);
  });
});

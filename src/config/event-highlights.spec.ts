import { describe, it, expect } from "vitest";
import { resolveEventHighlights } from "./event-highlights";

describe("resolveEventHighlights", () => {
  it("rend les reperes dans l'ordre du catalogue, pas celui de la saisie", () => {
    const labels = resolveEventHighlights(["ibclc", "elearning"]).map(
      ({ label }) => label,
    );

    expect(labels).toEqual(["E-Learning", "Formatrice certifiée IBCLC"]);
  });

  it("ignore une cle inconnue", () => {
    expect(resolveEventHighlights(["zoom", "cle-retiree"])).toHaveLength(1);
  });

  it("rend une liste vide pour null ou un tableau vide", () => {
    expect(resolveEventHighlights(null)).toEqual([]);
    expect(resolveEventHighlights([])).toEqual([]);
  });
});

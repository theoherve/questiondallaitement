import { describe, it, expect } from "vitest";
import { matchesFormationSearch, normalizeSearchText } from "./search";

describe("normalizeSearchText", () => {
  it("ignore la casse et les accents", () => {
    expect(normalizeSearchText("Éligible FIFPL")).toBe("eligible fifpl");
  });
});

describe("matchesFormationSearch", () => {
  it("matche une sous-chaine du titre, insensible a la casse", () => {
    expect(matchesFormationSearch("Atelier mensuel : l'essentiel", "essentiel")).toBe(true);
    expect(matchesFormationSearch("Atelier mensuel : l'essentiel", "ESSENTIEL")).toBe(true);
  });

  it("matche malgre une difference d'accent", () => {
    expect(matchesFormationSearch("Éligible FIFPL", "eligible")).toBe(true);
  });

  it("ne matche pas une chaine absente du titre", () => {
    expect(matchesFormationSearch("Atelier mensuel", "webinaire")).toBe(false);
  });

  it("une recherche vide laisse tout passer", () => {
    expect(matchesFormationSearch("Atelier mensuel", "")).toBe(true);
    expect(matchesFormationSearch("Atelier mensuel", "   ")).toBe(true);
  });
});

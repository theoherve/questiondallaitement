import { describe, it, expect } from "vitest";
import { normalizeRichText } from "./rich-text";

describe("normalizeRichText", () => {
  it("renvoie null pour une valeur absente", () => {
    expect(normalizeRichText(null)).toBeNull();
    expect(normalizeRichText(undefined)).toBeNull();
  });

  it("renvoie null pour les coquilles vides produites par l'editeur", () => {
    expect(normalizeRichText("")).toBeNull();
    expect(normalizeRichText("   ")).toBeNull();
    expect(normalizeRichText("<p></p>")).toBeNull();
    expect(normalizeRichText("<p><br></p>")).toBeNull();
  });

  it("conserve un contenu reel", () => {
    expect(normalizeRichText("<p>Trois points cles</p>")).toBe(
      "<p>Trois points cles</p>",
    );
  });
});

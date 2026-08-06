import { describe, it, expect } from "vitest";
import { stripHtml, truncate } from "./strip";

describe("stripHtml", () => {
  it("retire les balises et garde le texte", () => {
    expect(stripHtml("<p>Bonjour <strong>toi</strong></p>")).toBe("Bonjour toi");
  });

  it("insere une espace entre deux blocs colles", () => {
    expect(stripHtml("<li>Un</li><li>Deux</li>")).toBe("Un Deux");
  });

  it("decode les entites courantes", () => {
    expect(
      stripHtml("<p>Pr&eacute;natal &amp; postnatal&nbsp;: d&#233;tails</p>"),
    ).toBe("Prénatal & postnatal : détails");
  });

  it("normalise les espaces et les retours a la ligne", () => {
    expect(stripHtml("<p>Deux\n\n  espaces</p>")).toBe("Deux espaces");
  });

  it("renvoie une chaine vide pour une entree absente", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
    expect(stripHtml("<p></p>")).toBe("");
  });
});

describe("truncate", () => {
  it("renvoie le texte tel quel s'il tient dans la limite", () => {
    expect(truncate("Formation allaitement", 40)).toBe("Formation allaitement");
  });

  it("coupe sur un mot entier et suffixe une ellipse", () => {
    expect(truncate("Formation allaitement pour les professionnelles", 22)).toBe(
      "Formation allaitement…",
    );
  });

  it("coupe brutalement si le premier mot depasse deja la limite", () => {
    expect(truncate("Anticonstitutionnellement", 10)).toBe("Anticonst…");
  });

  it("renvoie undefined pour un texte vide", () => {
    expect(truncate("", 40)).toBeUndefined();
    expect(truncate("   ", 40)).toBeUndefined();
  });
});

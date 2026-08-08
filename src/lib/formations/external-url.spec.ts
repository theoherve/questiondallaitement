import { describe, it, expect } from "vitest";
import { buildExternalUrl, promoCodeLabel } from "./external-url";

describe("buildExternalUrl", () => {
  it("ouvre la query string quand l'url n'en a pas", () => {
    expect(buildExternalUrl("https://ecole.fr/formation", ["MILKPOWER"])).toBe(
      "https://ecole.fr/formation?code=MILKPOWER",
    );
  });

  it("enchaine sur une query string existante", () => {
    expect(
      buildExternalUrl("https://ecole.fr/formation?ref=qda", ["MILKPOWER"]),
    ).toBe("https://ecole.fr/formation?ref=qda&code=MILKPOWER");
  });

  it("laisse l'url intacte sans code", () => {
    expect(buildExternalUrl("https://ecole.fr/formation", [])).toBe(
      "https://ecole.fr/formation",
    );
    expect(buildExternalUrl("https://ecole.fr/formation")).toBe(
      "https://ecole.fr/formation",
    );
  });

  it("ne transmet que le premier code, une url n'en accepte qu'un", () => {
    expect(
      buildExternalUrl("https://ecole.fr/formation", ["MILKPOWER", "AUTRE"]),
    ).toBe("https://ecole.fr/formation?code=MILKPOWER");
  });

  it("echappe un code contenant un caractere reserve", () => {
    expect(buildExternalUrl("https://ecole.fr/f", ["A&B"])).toBe(
      "https://ecole.fr/f?code=A%26B",
    );
  });
});

describe("promoCodeLabel", () => {
  it("n'annonce rien sans code", () => {
    expect(promoCodeLabel(null)).toBeNull();
    expect(promoCodeLabel([])).toBeNull();
    expect(promoCodeLabel(["  "])).toBeNull();
  });

  it("accorde le libelle au nombre de codes", () => {
    expect(promoCodeLabel(["MILKPOWER"])).toBe("Code MILKPOWER");
    expect(promoCodeLabel(["MILKPOWER", "NOEL"])).toBe(
      "Codes MILKPOWER, NOEL",
    );
  });
});

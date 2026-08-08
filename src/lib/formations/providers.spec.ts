import { describe, it, expect } from "vitest";
import { slugifyProviderName } from "./providers";

describe("slugifyProviderName", () => {
  it("derive un slug d'un nom d'organisme", () => {
    expect(slugifyProviderName("Breastfeeding Conferences")).toBe(
      "breastfeeding-conferences",
    );
  });

  it("retombe sur le meme slug malgre la casse et les accents", () => {
    // C'est ce qui rend la creation libre idempotente : deux saisies du meme
    // organisme ne doivent pas creer deux lignes.
    expect(slugifyProviderName("L'École Périnatale")).toBe(
      slugifyProviderName("l ecole perinatale"),
    );
  });

  it("ne laisse pas de tiret en bord de slug", () => {
    expect(slugifyProviderName("  Dyskate !  ")).toBe("dyskate");
  });

  it("rend une chaine vide quand le nom n'a aucun caractere utile", () => {
    expect(slugifyProviderName("!!!")).toBe("");
  });
});

import { describe, it, expect } from "vitest";
import { slugifyProviderName, matchesProviderFilter } from "./providers";

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

describe("matchesProviderFilter", () => {
  it("laisse tout passer sur le filtre 'all'", () => {
    expect(matchesProviderFilter("provider-1", "all")).toBe(true);
    expect(matchesProviderFilter(null, "all")).toBe(true);
  });

  it("une formation sans organisme reste visible quel que soit le filtre", () => {
    expect(matchesProviderFilter(null, "provider-1")).toBe(true);
  });

  it("filtre une formation dont l'organisme ne correspond pas au filtre", () => {
    expect(matchesProviderFilter("provider-1", "provider-2")).toBe(false);
  });

  it("garde une formation dont l'organisme correspond au filtre", () => {
    expect(matchesProviderFilter("provider-1", "provider-1")).toBe(true);
  });
});

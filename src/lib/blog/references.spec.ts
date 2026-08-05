import { describe, expect, it } from "vitest";
import { isBlankHtml, withSafeExternalLinks } from "./references";

describe("withSafeExternalLinks", () => {
  it("ouvre les liens externes dans un nouvel onglet, sans prise sur la page", () => {
    expect(
      withSafeExternalLinks('<a href="https://who.int/lait">OMS</a>'),
    ).toBe(
      '<a href="https://who.int/lait" target="_blank" rel="noopener noreferrer">OMS</a>',
    );
  });

  it("laisse les liens internes dans le même onglet", () => {
    const html = '<a href="/blog/allaitement">Notre article</a>';
    expect(withSafeExternalLinks(html)).toBe(html);
  });

  it("conserve les attributs déjà posés", () => {
    const html =
      '<a href="https://who.int" target="_self" rel="nofollow">Source</a>';
    expect(withSafeExternalLinks(html)).toBe(html);
  });

  it("conserve les classes et complète ce qui manque", () => {
    expect(
      withSafeExternalLinks(
        '<a class="text-primary-red" href="http://exemple.fr">Source</a>',
      ),
    ).toBe(
      '<a class="text-primary-red" href="http://exemple.fr" target="_blank" rel="noopener noreferrer">Source</a>',
    );
  });

  it("traite tous les liens d'une liste", () => {
    const result = withSafeExternalLinks(
      '<ul><li><a href="https://a.fr">A</a></li><li><a href="https://b.fr">B</a></li></ul>',
    );
    expect(result.match(/target="_blank"/g)).toHaveLength(2);
  });
});

describe("isBlankHtml", () => {
  it("considère comme vide l'absence de contenu", () => {
    expect(isBlankHtml(null)).toBe(true);
    expect(isBlankHtml(undefined)).toBe(true);
    expect(isBlankHtml("")).toBe(true);
  });

  it("considère comme vide un paragraphe sans texte", () => {
    expect(isBlankHtml("<p></p>")).toBe(true);
    expect(isBlankHtml("<p>&nbsp;</p>")).toBe(true);
    expect(isBlankHtml("<p><br></p>")).toBe(true);
  });

  it("reconnaît un contenu réel", () => {
    expect(isBlankHtml("<p>Source : OMS, 2024</p>")).toBe(false);
  });

  it("reconnaît un contenu uniquement visuel", () => {
    expect(isBlankHtml('<p><img src="/capture.png" alt=""></p>')).toBe(false);
  });
});

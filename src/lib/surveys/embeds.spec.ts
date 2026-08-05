import { describe, expect, it } from "vitest";
import { splitSurveyEmbeds } from "./embeds";

describe("splitSurveyEmbeds", () => {
  it("renvoie un seul segment HTML quand il n'y a pas d'embed", () => {
    expect(splitSurveyEmbeds("<p>Bonjour</p>")).toEqual([
      { type: "html", html: "<p>Bonjour</p>" },
    ]);
  });

  it("extrait un embed entouré de texte", () => {
    const html =
      '<p>Avant</p><div data-survey-embed="" data-survey-slug="reveils" data-survey-mode="chart"></div><p>Après</p>';

    expect(splitSurveyEmbeds(html)).toEqual([
      { type: "html", html: "<p>Avant</p>" },
      { type: "embed", slug: "reveils", mode: "chart" },
      { type: "html", html: "<p>Après</p>" },
    ]);
  });

  it("accepte les attributs dans un ordre quelconque", () => {
    const html =
      '<div data-survey-mode="form" data-survey-slug="reveils" data-survey-embed=""></div>';

    expect(splitSurveyEmbeds(html)).toEqual([
      { type: "embed", slug: "reveils", mode: "form" },
    ]);
  });

  it("retombe sur le mode formulaire si l'attribut est absent ou inconnu", () => {
    const html =
      '<div data-survey-embed="" data-survey-slug="reveils" data-survey-mode="bidon"></div>';

    expect(splitSurveyEmbeds(html)).toEqual([
      { type: "embed", slug: "reveils", mode: "form" },
    ]);
  });

  it("ignore un marqueur sans slug plutôt que de rendre un embed cassé", () => {
    const html = '<div data-survey-embed=""></div><p>Suite</p>';

    expect(splitSurveyEmbeds(html)).toEqual([{ type: "html", html: "<p>Suite</p>" }]);
  });

  it("gère plusieurs embeds à la suite", () => {
    const html =
      '<div data-survey-embed="" data-survey-slug="a" data-survey-mode="form"></div>' +
      '<div data-survey-embed="" data-survey-slug="b" data-survey-mode="chart"></div>';

    expect(splitSurveyEmbeds(html)).toEqual([
      { type: "embed", slug: "a", mode: "form" },
      { type: "embed", slug: "b", mode: "chart" },
    ]);
  });
});

import { describe, it, expect } from "vitest";
import {
  PREFERENCE_CATEGORIES,
  CLIENT_PREFERENCE_CATEGORIES,
} from "./preference-categories";
import { NOTIFICATION_CATALOG } from "./catalog";

describe("PREFERENCE_CATEGORIES", () => {
  it("indexe chaque catégorie sous sa propre clé", () => {
    for (const [key, cat] of Object.entries(PREFERENCE_CATEGORIES)) {
      expect(cat.key).toBe(key);
    }
  });

  it("marque comme imposées toutes les catégories transactionnelles", () => {
    const forced = Object.values(PREFERENCE_CATEGORIES).filter((c) => c.forced);
    expect(forced.map((c) => c.key).sort()).toEqual([
      "acces_contenus",
      "paiements",
      "rendez_vous",
      "systeme",
    ]);
  });

  it("démarre le digest désactivé sur tous les canaux", () => {
    expect(PREFERENCE_CATEGORIES.digest.defaults).toEqual({
      in_app: false,
      email: false,
      push: false,
    });
  });

  it("démarre les autres catégories optionnelles activées, sauf le push", () => {
    for (const key of ["replays", "articles", "rappels_suivi"] as const) {
      expect(PREFERENCE_CATEGORIES[key].defaults).toEqual({
        in_app: true,
        email: true,
        push: false,
      });
    }
  });

  it("donne un libellé à chaque catégorie, pour l'écran de préférences", () => {
    for (const cat of Object.values(PREFERENCE_CATEGORIES)) {
      expect(cat.label.length).toBeGreaterThan(0);
    }
  });

  it("rattache chaque événement du catalogue à une catégorie connue", () => {
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      expect(PREFERENCE_CATEGORIES[def.preferenceKey]).toBeDefined();
    }
  });

  it("ne rattache un événement marketing qu'à une catégorie non imposée", () => {
    for (const def of Object.values(NOTIFICATION_CATALOG)) {
      if (def.category !== "marketing") continue;
      expect(PREFERENCE_CATEGORIES[def.preferenceKey].forced).toBe(false);
    }
  });

  it("expose une catégorie d'annonces, désactivable et active par défaut", () => {
    const annonces = PREFERENCE_CATEGORIES.annonces;
    expect(annonces).toBeDefined();
    expect(annonces.forced).toBe(false);
    expect(annonces.defaults).toEqual({
      in_app: true,
      email: true,
      push: false,
    });
  });

  it("affiche les annonces dans l'écran client", () => {
    expect(CLIENT_PREFERENCE_CATEGORIES.map((c) => c.key)).toContain("annonces");
  });

  it("interdit le push exactement sur les trois catégories décidées", () => {
    const forbidden = Object.values(PREFERENCE_CATEGORIES)
      .filter((c) => c.pushForbidden)
      .map((c) => c.key)
      .sort();

    expect(forbidden).toEqual(["articles", "digest", "paiements"]);
  });

  it("n'active le push par défaut que sur les catégories imposées", () => {
    const on = Object.values(PREFERENCE_CATEGORIES)
      .filter((c) => c.defaults.push)
      .map((c) => c.key)
      .sort();

    expect(on).toEqual(["acces_contenus", "rendez_vous", "systeme"]);
  });

  it("n'autorise jamais un défaut de push sur une catégorie qui l'interdit", () => {
    for (const category of Object.values(PREFERENCE_CATEGORIES)) {
      if (category.pushForbidden) expect(category.defaults.push).toBe(false);
    }
  });
});

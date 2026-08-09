import { describe, it, expect } from "vitest";
import { PREFERENCE_CATEGORIES } from "./preference-categories";
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

  it("démarre le digest désactivé sur les deux canaux", () => {
    expect(PREFERENCE_CATEGORIES.digest.defaults).toEqual({
      in_app: false,
      email: false,
    });
  });

  it("démarre les autres catégories optionnelles activées", () => {
    for (const key of ["replays", "articles", "rappels_suivi"] as const) {
      expect(PREFERENCE_CATEGORIES[key].defaults).toEqual({
        in_app: true,
        email: true,
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
});

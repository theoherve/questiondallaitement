import { describe, it, expect } from "vitest";
import { buildModuleCards, type ModuleRow } from "./pack-modules-data";

const row = (slug: string): ModuleRow => ({
  id: slug,
  title: slug,
  slug,
  short_description: null,
  thumbnail_url: null,
  price_cents: 2900,
  currency: "EUR",
});

describe("buildModuleCards", () => {
  it("ordonne les modules selon MODULE_ORDER (pas l'ordre d'entrée)", () => {
    const cards = buildModuleCards([
      row("je-souhaite-sevrer-mon-bebe"),
      row("je-me-prepare-a-allaiter"),
    ]);
    expect(cards.map((c) => c.slug)).toEqual([
      "je-me-prepare-a-allaiter",
      "je-souhaite-sevrer-mon-bebe",
    ]);
  });

  it("attache l'accent connu et null pour un slug inconnu", () => {
    const cards = buildModuleCards([
      row("je-me-prepare-a-allaiter"),
      row("slug-inconnu"),
    ]);
    const known = cards.find((c) => c.slug === "je-me-prepare-a-allaiter");
    const unknown = cards.find((c) => c.slug === "slug-inconnu");
    expect(known?.accent?.iconKey).toBe("Sprout");
    expect(unknown?.accent).toBeNull();
  });
});

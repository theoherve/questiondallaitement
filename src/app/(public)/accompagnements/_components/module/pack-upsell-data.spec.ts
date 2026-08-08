import { describe, it, expect } from "vitest";
import { computePackUpsell } from "./pack-upsell-data";

describe("computePackUpsell", () => {
  it("calcule le complément à payer et le nombre de modules restants", () => {
    const upsell = computePackUpsell({
      packPriceCents: 39700,
      packTitle: "Mon Allaitement Sur Mesure",
      modulePriceCents: 7500,
      currency: "EUR",
      totalModulesCount: 8,
    });
    expect(upsell?.deltaCents).toBe(32200);
    expect(upsell?.otherModulesCount).toBe(7);
    expect(upsell?.deltaLabel).toContain("322,00");
    expect(upsell?.packTitle).toBe("Mon Allaitement Sur Mesure");
  });

  it("renvoie null quand le pack n'est pas publié", () => {
    expect(
      computePackUpsell({
        packPriceCents: null,
        packTitle: null,
        modulePriceCents: 7500,
        currency: "EUR",
        totalModulesCount: 8,
      })
    ).toBeNull();
  });

  it("renvoie null quand le pack ne coûte pas plus cher que le module", () => {
    expect(
      computePackUpsell({
        packPriceCents: 7500,
        packTitle: "Pack",
        modulePriceCents: 7500,
        currency: "EUR",
        totalModulesCount: 8,
      })
    ).toBeNull();
  });

  it("renvoie null quand le catalogue ne contient qu'un module", () => {
    expect(
      computePackUpsell({
        packPriceCents: 39700,
        packTitle: "Pack",
        modulePriceCents: 7500,
        currency: "EUR",
        totalModulesCount: 1,
      })
    ).toBeNull();
  });
});

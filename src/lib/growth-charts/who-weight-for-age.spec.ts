import { describe, it, expect } from "vitest";
import { getPercentileWeightGrams, WHO_PERCENTILES } from "./who-weight-for-age";
import whoData from "./who-weight-for-age.json";

describe("getPercentileWeightGrams", () => {
  it("le P50 à un âge donné correspond au paramètre M de la table (± 1g)", () => {
    const firstMaleRow = whoData.male[0];
    const p50Grams = getPercentileWeightGrams(firstMaleRow.ageDays, "male", 50);
    expect(p50Grams).not.toBeNull();
    expect(p50Grams).toBeCloseTo(firstMaleRow.M * 1000, 0);
  });

  it("les percentiles sont strictement croissants pour un âge donné", () => {
    const values = WHO_PERCENTILES.map(
      (p) => getPercentileWeightGrams(30, "female", p) ?? 0,
    );
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it("retourne null hors de la plage de données (âge négatif ou > 2 ans)", () => {
    expect(getPercentileWeightGrams(-1, "female", 50)).toBeNull();
    expect(getPercentileWeightGrams(10000, "female", 50)).toBeNull();
  });

  it("interpole entre deux points d'âge connus", () => {
    const dayZero = getPercentileWeightGrams(0, "male", 50);
    const daySeven = getPercentileWeightGrams(7, "male", 50);
    const dayThree = getPercentileWeightGrams(3, "male", 50);
    expect(dayZero).not.toBeNull();
    expect(daySeven).not.toBeNull();
    expect(dayThree).not.toBeNull();
    expect(dayThree as number).toBeGreaterThan(dayZero as number);
    expect(dayThree as number).toBeLessThan(daySeven as number);
  });
});

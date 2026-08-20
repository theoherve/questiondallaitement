import { describe, it, expect } from "vitest";
import {
  getPercentileWeightGrams,
  getZScoreForWeight,
  getPercentileBandForWeight,
  WHO_PERCENTILES,
} from "./who-weight-for-age";
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

describe("getZScoreForWeight", () => {
  it("retrouve le z-score attendu pour un poids exactement au P50", () => {
    const weightAtP50 = getPercentileWeightGrams(30, "female", 50) as number;
    const z = getZScoreForWeight(30, "female", weightAtP50);
    expect(z).not.toBeNull();
    expect(z as number).toBeCloseTo(0, 1);
  });

  it("retourne null hors de la plage de données", () => {
    expect(getZScoreForWeight(10000, "female", 5000)).toBeNull();
  });
});

describe("getPercentileBandForWeight", () => {
  it("retrouve le couloir exact en aller-retour avec getPercentileWeightGrams", () => {
    for (const p of WHO_PERCENTILES) {
      const weight = getPercentileWeightGrams(60, "male", p) as number;
      expect(getPercentileBandForWeight(60, "male", weight)).toBe(p);
    }
  });

  it("retourne null hors de la plage de données", () => {
    expect(getPercentileBandForWeight(-1, "male", 3000)).toBeNull();
  });
});

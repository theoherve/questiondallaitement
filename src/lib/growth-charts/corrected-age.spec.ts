import { describe, it, expect } from "vitest";
import { getCorrectedAgeInDays } from "./corrected-age";

describe("getCorrectedAgeInDays", () => {
  it("retourne l'âge réel inchangé pour un enfant né à terme", () => {
    expect(
      getCorrectedAgeInDays({ is_premature: false, gestational_age_weeks: null }, 60),
    ).toBe(60);
  });

  it("soustrait les semaines de prématurité pour un prématuré", () => {
    // né à 32 semaines : 8 semaines de prématurité = 56 jours de correction
    expect(
      getCorrectedAgeInDays({ is_premature: true, gestational_age_weeks: 32 }, 100),
    ).toBe(44);
  });

  it("ne descend jamais sous zéro", () => {
    expect(
      getCorrectedAgeInDays({ is_premature: true, gestational_age_weeks: 32 }, 10),
    ).toBe(0);
  });

  it("retourne l'âge réel si gestational_age_weeks est absent malgré is_premature", () => {
    expect(
      getCorrectedAgeInDays({ is_premature: true, gestational_age_weeks: null }, 60),
    ).toBe(60);
  });
});

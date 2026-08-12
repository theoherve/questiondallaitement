import { describe, it, expect } from "vitest";
import { childSchema, weightMeasurementSchema } from "./children";

describe("childSchema", () => {
  it("accepte un enfant valide sans prématurité", () => {
    const result = childSchema.safeParse({
      first_name: "Léa",
      birth_date: "2025-01-10",
      sex: "female",
      is_premature: false,
    });
    expect(result.success).toBe(true);
  });

  it("exige gestational_age_weeks quand is_premature est vrai", () => {
    const result = childSchema.safeParse({
      first_name: "Noah",
      birth_date: "2025-01-10",
      sex: "male",
      is_premature: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejette un prénom vide", () => {
    const result = childSchema.safeParse({
      first_name: "",
      birth_date: "2025-01-10",
      sex: "female",
      is_premature: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejette une date de naissance dans le futur", () => {
    const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const result = childSchema.safeParse({
      first_name: "Léa",
      birth_date: tomorrow,
      sex: "female",
      is_premature: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejette une date de naissance qui n'existe pas au calendrier", () => {
    const result = childSchema.safeParse({
      first_name: "Léa",
      birth_date: "2025-02-31",
      sex: "female",
      is_premature: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("weightMeasurementSchema", () => {
  it("accepte une pesée valide", () => {
    const result = weightMeasurementSchema.safeParse({
      child_id: "550e8400-e29b-41d4-a716-446655440000",
      weight_grams: 4200,
      measured_at: "2025-02-01",
      source: "home",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un poids négatif ou nul", () => {
    const result = weightMeasurementSchema.safeParse({
      child_id: "550e8400-e29b-41d4-a716-446655440000",
      weight_grams: 0,
      measured_at: "2025-02-01",
      source: "home",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un poids irréaliste (>50kg)", () => {
    const result = weightMeasurementSchema.safeParse({
      child_id: "550e8400-e29b-41d4-a716-446655440000",
      weight_grams: 60000,
      measured_at: "2025-02-01",
      source: "home",
    });
    expect(result.success).toBe(false);
  });

  it("rejette une pesée datée dans le futur", () => {
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const result = weightMeasurementSchema.safeParse({
      child_id: "550e8400-e29b-41d4-a716-446655440000",
      weight_grams: 4200,
      measured_at: inTwoDays,
      source: "home",
    });
    expect(result.success).toBe(false);
  });

  it("rejette une date de pesée qui n'existe pas au calendrier", () => {
    const result = weightMeasurementSchema.safeParse({
      child_id: "550e8400-e29b-41d4-a716-446655440000",
      weight_grams: 4200,
      measured_at: "2025-13-05",
      source: "home",
    });
    expect(result.success).toBe(false);
  });
});

import { isNotInFuture } from "./children";

describe("isNotInFuture", () => {
  it("accepte une date jusqu'à 24h dans le futur (marge fuseau horaire)", () => {
    const in20Hours = new Date(Date.now() + 20 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(isNotInFuture(in20Hours)).toBe(true);
  });

  it("rejette toujours une date à plus de 24h dans le futur", () => {
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(isNotInFuture(inTwoDays)).toBe(false);
  });
});

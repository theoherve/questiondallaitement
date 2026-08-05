import { describe, expect, it } from "vitest";
import {
  surveySubmissionSchema,
  validateAnswersAgainstDefinition,
} from "./surveys";
import type { SurveyDefinition } from "@/lib/surveys/types";

const survey: SurveyDefinition = {
  id: "s1",
  slug: "reveils",
  title: "Réveils",
  intro: null,
  status: "published",
  thank_you_message: "",
  questions: [
    {
      id: "q1",
      position: 0,
      kind: "matrix",
      label: "Réveils",
      rows: [{ key: "0-2", label: "0-2 mois" }],
      choices: [{ key: "aucun", label: "pas de réveils" }],
      is_required: true,
      is_segment: false,
      is_charted: true,
    },
    {
      id: "q2",
      position: 1,
      kind: "single",
      label: "Sujet",
      rows: [{ key: "_", label: "" }],
      choices: [{ key: "siestes", label: "Les siestes courtes" }],
      is_required: false,
      is_segment: false,
      is_charted: false,
    },
  ],
};

describe("surveySubmissionSchema", () => {
  it("accepte une soumission sans email", () => {
    const parsed = surveySubmissionSchema.safeParse({
      answers: { q1: { "0-2": "aucun" } },
    });
    expect(parsed.success).toBe(true);
  });

  it("exige prénom et consentement dès qu'un email est fourni", () => {
    const parsed = surveySubmissionSchema.safeParse({
      answers: { q1: { "0-2": "aucun" } },
      email: "parent@example.com",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepte un email accompagné du prénom et du consentement", () => {
    const parsed = surveySubmissionSchema.safeParse({
      answers: { q1: { "0-2": "aucun" } },
      email: "parent@example.com",
      first_name: "Marie",
      consent: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("refuse une réponse vide", () => {
    expect(surveySubmissionSchema.safeParse({ answers: {} }).success).toBe(false);
  });
});

describe("validateAnswersAgainstDefinition", () => {
  it("accepte des réponses conformes", () => {
    expect(
      validateAnswersAgainstDefinition(survey, { q1: { "0-2": "aucun" } }),
    ).toBeNull();
  });

  it("refuse une question inconnue", () => {
    expect(
      validateAnswersAgainstDefinition(survey, { qX: { "0-2": "aucun" } }),
    ).toMatch(/inconnue/i);
  });

  it("refuse un choix qui n'existe pas", () => {
    expect(
      validateAnswersAgainstDefinition(survey, { q1: { "0-2": "inconnu" } }),
    ).toMatch(/choix/i);
  });

  it("refuse une question obligatoire incomplète", () => {
    expect(validateAnswersAgainstDefinition(survey, { q2: { _: "siestes" } })).toMatch(
      /Réveils/,
    );
  });
});

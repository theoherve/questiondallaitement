import { describe, expect, it } from "vitest";
import { computePersonalResult } from "./personal-result";
import type { AnswerCountRow, SurveyQuestion } from "./types";

const question: SurveyQuestion = {
  id: "q1",
  position: 0,
  kind: "matrix",
  label: "Combien de réveils ?",
  rows: [
    { key: "0-2", label: "0-2 mois" },
    { key: "6-9", label: "6-9 mois" },
  ],
  choices: [
    { key: "aucun", label: "pas de réveils" },
    { key: "plusieurs", label: "plusieurs réveils / nuit" },
  ],
  is_required: true,
  is_segment: false,
  is_charted: true,
};

const counts: AnswerCountRow[] = [
  { question_id: "q1", row_key: "6-9", choice_key: "aucun", responses: 57 },
  { question_id: "q1", row_key: "6-9", choice_key: "plusieurs", responses: 43 },
];

describe("computePersonalResult", () => {
  it("situe la réponse du parent dans sa tranche", () => {
    const result = computePersonalResult(
      question,
      { q1: { "0-2": "aucun", "6-9": "plusieurs" } },
      counts,
      "6-9",
    );

    expect(result).toEqual({
      rowLabel: "6-9 mois",
      choiceLabel: "plusieurs réveils / nuit",
      percentage: 43,
      sampleSize: 100,
    });
  });

  it("renvoie null si le parent n'a pas répondu pour sa tranche", () => {
    expect(
      computePersonalResult(question, { q1: { "0-2": "aucun" } }, counts, "6-9"),
    ).toBeNull();
  });

  it("renvoie null quand la tranche n'a pas assez de réponses", () => {
    expect(
      computePersonalResult(
        question,
        { q1: { "0-2": "aucun" } },
        [{ question_id: "q1", row_key: "0-2", choice_key: "aucun", responses: 2 }],
        "0-2",
      ),
    ).toBeNull();
  });
});

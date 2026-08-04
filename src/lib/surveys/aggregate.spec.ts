import { describe, expect, it } from "vitest";
import { buildChartRows } from "./aggregate";
import type { AnswerCountRow, SurveyQuestion } from "./types";

const question: SurveyQuestion = {
  id: "q1",
  position: 0,
  kind: "matrix",
  label: "Combien de réveils ?",
  rows: [
    { key: "0-2", label: "0-2 mois" },
    { key: "2-4", label: "2-4 mois" },
  ],
  choices: [
    { key: "aucun", label: "pas de réveils" },
    { key: "plusieurs", label: "plusieurs réveils / nuit" },
  ],
  is_required: true,
  is_segment: false,
  is_charted: true,
};

const count = (
  row_key: string,
  choice_key: string,
  responses: number,
): AnswerCountRow => ({ question_id: "q1", row_key, choice_key, responses });

describe("buildChartRows", () => {
  it("convertit les comptes en pourcentages par ligne", () => {
    const rows = buildChartRows(
      question,
      [count("0-2", "aucun", 3), count("0-2", "plusieurs", 7)],
      2,
    );

    expect(rows[0]).toMatchObject({
      rowKey: "0-2",
      label: "0-2 mois",
      total: 10,
      hasEnoughData: true,
      percentages: { aucun: 30, plusieurs: 70 },
    });
  });

  it("marque une ligne sous le seuil comme insuffisante", () => {
    const rows = buildChartRows(question, [count("0-2", "aucun", 4)], 10);

    expect(rows[0].hasEnoughData).toBe(false);
    expect(rows[0].total).toBe(4);
  });

  it("rend une ligne vide plutôt que de l'omettre", () => {
    const rows = buildChartRows(question, [count("0-2", "aucun", 10)], 10);

    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      rowKey: "2-4",
      total: 0,
      hasEnoughData: false,
      percentages: { aucun: 0, plusieurs: 0 },
    });
  });

  it("ignore les comptes d'une autre question", () => {
    const rows = buildChartRows(
      question,
      [
        count("0-2", "aucun", 10),
        { question_id: "q2", row_key: "0-2", choice_key: "aucun", responses: 99 },
      ],
      10,
    );

    expect(rows[0].total).toBe(10);
  });

  it("ignore une clé de choix inconnue, retirée de la définition depuis", () => {
    const rows = buildChartRows(
      question,
      [count("0-2", "aucun", 10), count("0-2", "obsolete", 5)],
      10,
    );

    expect(rows[0].total).toBe(10);
    expect(rows[0].percentages).toEqual({ aucun: 100, plusieurs: 0 });
  });

  it("garde une somme de 100 malgré les arrondis", () => {
    const rows = buildChartRows(
      question,
      [count("0-2", "aucun", 1), count("0-2", "plusieurs", 2)],
      1,
    );

    const sum = Object.values(rows[0].percentages).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });
});

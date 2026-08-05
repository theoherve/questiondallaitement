import { buildChartRows } from "./aggregate";
import type { AnswerCountRow, SurveyAnswers, SurveyQuestion } from "./types";

export type PersonalResult = {
  rowLabel: string;
  choiceLabel: string;
  percentage: number;
  sampleSize: number;
};

/**
 * Situe la réponse du parent parmi les autres familles de la même tranche.
 *
 * Renvoie `null` plutôt qu'une phrase approximative dans deux cas : le parent
 * n'a rien répondu pour sa tranche, ou la tranche compte trop peu de réponses.
 * Annoncer « 100 % des familles comme vous » sur trois répondants décrédibilise
 * tout le sondage.
 */
export const computePersonalResult = (
  question: SurveyQuestion,
  answers: SurveyAnswers,
  counts: AnswerCountRow[],
  segmentRowKey: string,
): PersonalResult | null => {
  const choiceKey = answers[question.id]?.[segmentRowKey];
  if (!choiceKey) return null;

  const row = buildChartRows(question, counts).find(
    (candidate) => candidate.rowKey === segmentRowKey,
  );
  if (!row || !row.hasEnoughData) return null;

  const choice = question.choices.find((entry) => entry.key === choiceKey);
  if (!choice) return null;

  return {
    rowLabel: row.label,
    choiceLabel: choice.label,
    percentage: row.percentages[choiceKey] ?? 0,
    sampleSize: row.total,
  };
};

import { SURVEY_MIN_RESPONSES_PER_ROW } from "@/config/surveys";
import type { AnswerCountRow, SurveyQuestion } from "./types";

export type ChartRow = {
  rowKey: string;
  label: string;
  total: number;
  hasEnoughData: boolean;
  /** Pourcentage entier par clé de choix. Somme exactement 100 dès qu'il y a
   *  au moins une réponse. */
  percentages: Record<string, number>;
};

/**
 * Transforme les comptes bruts en pourcentages par ligne.
 *
 * Les lignes viennent de la définition du sondage, pas des données : une
 * tranche d'âge sans aucune réponse doit apparaître vide sur le graphique
 * plutôt que disparaître, sinon l'axe se réordonne à chaque nouvelle réponse.
 */
export const buildChartRows = (
  question: SurveyQuestion,
  counts: AnswerCountRow[],
  minResponses: number = SURVEY_MIN_RESPONSES_PER_ROW,
): ChartRow[] => {
  const choiceKeys = question.choices.map((choice) => choice.key);

  return question.rows.map((row) => {
    // Une clé de choix absente de la définition actuelle est ignorée : elle
    // vient d'une version antérieure du sondage et n'a plus de couleur ni de
    // libellé à afficher.
    const relevant = counts.filter(
      (entry) =>
        entry.question_id === question.id &&
        entry.row_key === row.key &&
        choiceKeys.includes(entry.choice_key),
    );

    const total = relevant.reduce((sum, entry) => sum + entry.responses, 0);
    const percentages = distribute(choiceKeys, relevant, total);

    return {
      rowKey: row.key,
      label: row.label,
      total,
      hasEnoughData: total >= minResponses,
      percentages,
    };
  });
};

/**
 * Répartit 100 points entre les choix.
 *
 * Arrondir chaque part indépendamment donne des totaux à 99 ou 101, et un
 * empilement à 100 % qui ne touche pas le haut du graphique se voit. Le reste
 * est donc donné au choix le plus représenté.
 */
const distribute = (
  choiceKeys: string[],
  counts: AnswerCountRow[],
  total: number,
): Record<string, number> => {
  const percentages: Record<string, number> = {};
  for (const key of choiceKeys) percentages[key] = 0;
  if (total === 0) return percentages;

  for (const entry of counts) {
    percentages[entry.choice_key] = Math.round((entry.responses / total) * 100);
  }

  const sum = Object.values(percentages).reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    const biggest = [...counts].sort((a, b) => b.responses - a.responses)[0];
    if (biggest) percentages[biggest.choice_key] += 100 - sum;
  }

  return percentages;
};

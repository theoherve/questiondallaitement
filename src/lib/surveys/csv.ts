import type { SurveyDefinition, SurveyResponseRow } from "./types";

/**
 * Séparateur point-virgule : Excel en configuration française lit une virgule
 * comme un séparateur décimal et empile tout dans une seule colonne.
 */
const SEPARATOR = ";";

const escape = (value: string): string =>
  /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * Sérialise les réponses en une ligne par répondant.
 *
 * Les clés techniques sont traduites en libellés : le fichier part chez une
 * personne qui lit un tableur, pas chez un développeur.
 */
export const toSurveyCsv = (
  survey: SurveyDefinition,
  responses: SurveyResponseRow[],
): string => {
  const columns = survey.questions.flatMap((question) =>
    question.rows.map((row) => ({
      questionId: question.id,
      rowKey: row.key,
      header: row.label ? `${question.label}, ${row.label}` : question.label,
      labels: new Map(question.choices.map((c) => [c.key, c.label])),
    })),
  );

  const header = [
    "Date",
    "Email",
    "Consentement",
    "Segment",
    "Page",
    ...columns.map((column) => column.header),
  ];

  const lines = responses.map((response) => {
    const cells = [
      new Date(response.created_at).toLocaleString("fr-FR"),
      response.email ?? "",
      response.marketing_consent ? "oui" : "non",
      response.segment_key ?? "",
      response.source_path ?? "",
      ...columns.map((column) => {
        const choiceKey = response.answers?.[column.questionId]?.[column.rowKey];
        return choiceKey ? (column.labels.get(choiceKey) ?? choiceKey) : "";
      }),
    ];

    return cells.map(escape).join(SEPARATOR);
  });

  return [header.map(escape).join(SEPARATOR), ...lines].join("\n");
};

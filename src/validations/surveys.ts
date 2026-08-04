import { z } from "zod/v4";
import type { SurveyAnswers, SurveyDefinition } from "@/lib/surveys/types";

/**
 * Forme d'une soumission publique.
 *
 * L'email est facultatif — c'est le principe : on ne bloque pas la
 * participation derrière une adresse. Mais dès qu'il est renseigné, le prénom
 * et le consentement le deviennent : sans eux, l'inscription newsletter serait
 * soit impersonnelle, soit non prouvable.
 */
export const surveySubmissionSchema = z
  .object({
    answers: z
      .record(z.string(), z.record(z.string(), z.string()))
      .refine((value) => Object.keys(value).length > 0, {
        error: "Merci de répondre au sondage avant de l'envoyer",
      }),
    email: z.email("Merci d'indiquer un email valide").optional(),
    first_name: z.string().trim().optional(),
    consent: z.boolean().optional(),
    source_path: z.string().optional(),

    /** Piège à robots, invisible à l'écran. Voir `newsletterSignupSchema`. */
    website: z.string().optional(),
  })
  .refine((value) => !value.email || (value.first_name?.length ?? 0) > 0, {
    error: "Merci d'indiquer votre prénom",
    path: ["first_name"],
  })
  .refine((value) => !value.email || value.consent === true, {
    error: "Merci de cocher la case pour recevoir votre résultat par email",
    path: ["consent"],
  });

export type SurveySubmissionInput = z.infer<typeof surveySubmissionSchema>;

/**
 * Confronte les réponses reçues à la définition du sondage.
 *
 * Zod ne peut pas le faire : les clés valides dépendent d'une définition lue en
 * base. Sans ce contrôle, un script pourrait injecter des clés arbitraires qui
 * pollueraient durablement l'agrégat — les vues comptent ce qu'elles trouvent.
 */
export const validateAnswersAgainstDefinition = (
  survey: SurveyDefinition,
  answers: SurveyAnswers,
): string | null => {
  for (const [questionId, rowMap] of Object.entries(answers)) {
    const question = survey.questions.find((entry) => entry.id === questionId);
    if (!question) return "Question inconnue dans cette réponse";

    for (const [rowKey, choiceKey] of Object.entries(rowMap)) {
      if (!question.rows.some((row) => row.key === rowKey)) {
        return `Ligne inconnue pour « ${question.label} »`;
      }
      if (!question.choices.some((choice) => choice.key === choiceKey)) {
        return `Choix invalide pour « ${question.label} »`;
      }
    }
  }

  for (const question of survey.questions) {
    if (!question.is_required) continue;
    const given = answers[question.id] ?? {};
    const missing = question.rows.some((row) => !given[row.key]);
    if (missing) return `Merci de compléter « ${question.label} »`;
  }

  return null;
};

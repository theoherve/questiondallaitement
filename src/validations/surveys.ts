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

    // Sur une question à cases à cocher, les lignes non cochées sont
    // simplement absentes : exiger une valeur pour chacune reviendrait à
    // obliger à tout cocher. Une seule case suffit.
    const missing =
      question.kind === "multi"
        ? Object.keys(given).length === 0
        : question.rows.some((row) => !given[row.key]);

    if (missing) return `Merci de compléter « ${question.label} »`;
  }

  return null;
};

// ─── Administration ─────────────────────────────────────────

const choiceSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .regex(
      /^[a-z0-9-]+$/,
      "Les clés ne contiennent que des minuscules, chiffres et tirets",
    ),
  label: z.string().trim().min(1, "Chaque option a besoin d'un libellé"),
  /** Renvoi vers un contenu du site, proposé sur l'écran de résultat. */
  href: z.string().trim().optional(),
});

/**
 * Définition d'un sondage côté administration.
 *
 * Les clés sont validées strictement : elles sont recopiées dans chaque réponse
 * enregistrée. Une clé renommée après coup couperait le sondage en deux jeux de
 * données qui ne s'additionnent plus.
 */
export const surveyDefinitionSchema = z.object({
  id: z.uuid().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Le slug ne contient que minuscules, chiffres, tirets"),
  title: z.string().trim().min(1, "Le titre est obligatoire"),
  kind: z.enum(["poll", "quiz"]).default("poll"),
  intro: z.string().trim().optional(),
  status: z.enum(["draft", "published", "closed"]),
  thank_you_message: z.string().trim().default(""),
  questions: z
    .array(
      z
        .object({
          id: z.uuid().optional(),
          kind: z.enum(["matrix", "single", "multi"]),
          label: z.string().trim().min(1, "Chaque question a besoin d'un intitulé"),
          rows: z.array(choiceSchema),
          choices: z.array(choiceSchema).min(1, "Au moins une option par question"),
          is_required: z.boolean(),
          is_segment: z.boolean(),
          is_charted: z.boolean(),
          correct_choice_key: z.string().trim().optional().nullable(),
          explanation_html: z.string().trim().optional().nullable(),
        })
        // Une question à cases à cocher n'a qu'un choix, « oui » : ce sont ses
        // lignes qui portent les options. Partout ailleurs, une seule option
        // ne laisse rien à choisir.
        .refine((q) => q.kind === "multi" || q.choices.length >= 2, {
          error: "Au moins deux options par question",
          path: ["choices"],
        })
        // Une bonne réponse doit désigner un choix qui existe, sinon la
        // correction ne tomberait jamais juste.
        .refine(
          (q) =>
            !q.correct_choice_key ||
            q.choices.some((choice) => choice.key === q.correct_choice_key),
          {
            error: "La bonne réponse doit être l'une des options proposées",
            path: ["correct_choice_key"],
          },
        ),
    )
    .min(1, "Un sondage a besoin d'au moins une question")
    .refine((questions) => questions.filter((q) => q.is_charted).length <= 1, {
      error: "Une seule question peut alimenter le graphique",
    })
    .refine((questions) => questions.filter((q) => q.is_segment).length <= 1, {
      error: "Une seule question peut servir de segment marketing",
    }),
});

export type SurveyDefinitionInput = z.infer<typeof surveyDefinitionSchema>;

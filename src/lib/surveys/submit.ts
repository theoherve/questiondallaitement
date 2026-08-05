import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscribeToNewsletter } from "@/lib/newsletter/subscribe";
import { SURVEY_CONSENT_TEXT } from "@/config/surveys";
import {
  validateAnswersAgainstDefinition,
  type SurveySubmissionInput,
} from "@/validations/surveys";
import { getSurveyBySlug, getSurveyCounts } from "./queries";
import { computePersonalResult, type PersonalResult } from "./personal-result";
import type { SurveyAnswers } from "./types";

export type SubmitOutcome =
  | { status: "ok"; personalResult: PersonalResult | null; totalResponses: number }
  | { status: "invalid"; error: string }
  | { status: "closed" }
  | { status: "error" };

/**
 * L'adresse n'est jamais conservée en clair : elle ne sert qu'à repérer un
 * envoi massif depuis une même source, ce qu'une empreinte permet aussi bien.
 */
const hashIp = (ip: string | null): string | null =>
  ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null;

export const submitSurveyResponse = async (
  slug: string,
  input: Omit<SurveySubmissionInput, "website">,
  meta: { ip: string | null },
): Promise<SubmitOutcome> => {
  const survey = await getSurveyBySlug(slug);
  if (!survey) return { status: "invalid", error: "Sondage introuvable" };
  if (survey.status === "closed") return { status: "closed" };

  const answers = input.answers as SurveyAnswers;
  const invalid = validateAnswersAgainstDefinition(survey, answers);
  if (invalid) return { status: "invalid", error: invalid };

  const segmentQuestion = survey.questions.find((entry) => entry.is_segment);
  const segmentKey = segmentQuestion
    ? (Object.values(answers[segmentQuestion.id] ?? {})[0] ?? null)
    : null;

  const email = input.email?.trim().toLowerCase() ?? null;

  const { error } = await createAdminClient().from("survey_responses").insert({
    survey_id: survey.id,
    answers,
    segment_key: segmentKey,
    email,
    marketing_consent: Boolean(email && input.consent),
    consent_text: email ? SURVEY_CONSENT_TEXT : null,
    consented_at: email ? new Date().toISOString() : null,
    source_path: input.source_path ?? null,
    ip_hash: hashIp(meta.ip),
  });

  if (error) {
    // Sans l'email ni l'IP : les journaux ne sont pas un endroit où stocker des
    // données personnelles.
    console.error("[sondage] enregistrement impossible", error);
    return { status: "error" };
  }

  // Après l'insertion, jamais avant : une panne Brevo ne doit pas faire perdre
  // une réponse déjà donnée. Et l'agrégat est relu ensuite pour que le résultat
  // personnalisé inclue la réponse qui vient d'être envoyée.
  if (email && input.consent && input.first_name) {
    await subscribeToNewsletter(
      { email, first_name: input.first_name, source: "sondage" },
      null,
      segmentKey ? { TRANCHE_AGE: segmentKey } : {},
    );
  }

  const { counts, totalResponses } = await getSurveyCounts(survey.id);
  const chartQuestion = survey.questions.find((entry) => entry.is_charted);

  const personalResult =
    chartQuestion && segmentKey
      ? computePersonalResult(chartQuestion, answers, counts, segmentKey)
      : null;

  return { status: "ok", personalResult, totalResponses };
};

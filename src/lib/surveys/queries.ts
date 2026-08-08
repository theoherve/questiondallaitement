import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AnswerCountRow,
  SurveyDefinition,
  SurveyPublicPayload,
  SurveyQuestion,
} from "./types";

/**
 * Lit la définition d'un sondage publiable.
 *
 * Un brouillon n'est jamais servi publiquement : le lien pourrait circuler
 * avant relecture, et les réponses collectées sur une version non figée
 * fausseraient l'agrégat.
 */
export const getSurveyBySlug = async (
  slug: string,
): Promise<SurveyDefinition | null> => {
  const { data, error } = await createAdminClient()
    .from("surveys")
    .select(
      "id, slug, title, kind, intro, status, thank_you_message, survey_questions(*)",
    )
    .eq("slug", slug)
    .in("status", ["published", "closed"])
    .maybeSingle();

  if (error || !data) return null;

  const questions = (data.survey_questions ?? []) as SurveyQuestion[];

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    kind: data.kind ?? "poll",
    intro: data.intro,
    status: data.status,
    thank_you_message: data.thank_you_message,
    questions: [...questions].sort((a, b) => a.position - b.position),
  };
};

export const getSurveyCounts = async (
  surveyId: string,
): Promise<{ counts: AnswerCountRow[]; totalResponses: number }> => {
  const supabase = createAdminClient();

  const [{ data: counts }, { data: totals }] = await Promise.all([
    supabase
      .from("survey_answer_counts")
      .select("question_id, row_key, choice_key, responses")
      .eq("survey_id", surveyId),
    supabase
      .from("survey_response_counts")
      .select("total_responses")
      .eq("survey_id", surveyId)
      .maybeSingle(),
  ]);

  return {
    counts: (counts ?? []) as AnswerCountRow[],
    totalResponses: totals?.total_responses ?? 0,
  };
};

export const getSurveyPayload = async (
  slug: string,
): Promise<SurveyPublicPayload | null> => {
  const survey = await getSurveyBySlug(slug);
  if (!survey) return null;

  const { counts, totalResponses } = await getSurveyCounts(survey.id);
  return { survey, counts, totalResponses };
};

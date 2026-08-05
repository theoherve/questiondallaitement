"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SINGLE_ROW_KEY } from "@/config/surveys";
import { surveyDefinitionSchema } from "@/validations/surveys";
import type { ActionResult } from "@/types";
import type { SurveyQuestionRow, SurveyRow } from "@/lib/surveys/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

export const listSurveys = async () => {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("surveys")
    .select("id, slug, title, status, created_at")
    .order("created_at", { ascending: false });

  return data ?? [];
};

export type AdminSurvey = SurveyRow & { survey_questions: SurveyQuestionRow[] };

export const getSurveyForAdmin = async (
  id: string,
): Promise<AdminSurvey | null> => {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("surveys")
    .select("*, survey_questions(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    survey_questions: [...(data.survey_questions ?? [])].sort(
      (a: SurveyQuestionRow, b: SurveyQuestionRow) => a.position - b.position,
    ),
  } as AdminSurvey;
};

/**
 * Enregistre un sondage et ses questions.
 *
 * Les questions sont réécrites en bloc — supprimées puis réinsérées — mais en
 * conservant les `id` déjà présents : ce sont eux qui indexent les réponses
 * déjà collectées. Les perdre orphelinerait tout l'historique.
 */
export const saveSurvey = async (
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = surveyDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { questions, ...survey } = parsed.data;
  const supabase = createAdminClient();

  const { data: saved, error } = await supabase
    .from("surveys")
    .upsert(
      {
        ...(survey.id ? { id: survey.id } : {}),
        slug: survey.slug,
        title: survey.title,
        intro: survey.intro ?? null,
        status: survey.status,
        thank_you_message: survey.thank_you_message,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id")
    .single();

  if (error || !saved) {
    console.error("[sondage] enregistrement impossible", error);
    return { success: false, error: "Enregistrement impossible" };
  }

  const keptIds = questions
    .map((question) => question.id)
    .filter((id): id is string => Boolean(id));

  let deletion = supabase
    .from("survey_questions")
    .delete()
    .eq("survey_id", saved.id);
  if (keptIds.length > 0) {
    deletion = deletion.not("id", "in", `(${keptIds.join(",")})`);
  }
  await deletion;

  const { error: questionsError } = await supabase
    .from("survey_questions")
    .upsert(
      questions.map((question, position) => ({
        ...(question.id ? { id: question.id } : {}),
        survey_id: saved.id,
        position,
        kind: question.kind,
        label: question.label,
        // Une question à choix unique n'a pas de lignes à l'écran, mais en
        // porte une en base : les réponses gardent ainsi une forme unique.
        rows:
          question.kind === "single"
            ? [{ key: SINGLE_ROW_KEY, label: "" }]
            : question.rows,
        choices: question.choices,
        is_required: question.is_required,
        is_segment: question.is_segment,
        is_charted: question.is_charted,
      })),
      { onConflict: "id" },
    );

  if (questionsError) {
    console.error("[sondage] questions non enregistrees", questionsError);
    return { success: false, error: "Questions non enregistrées" };
  }

  revalidatePath("/admin/sondages");
  return { success: true, data: { id: saved.id } };
};

/**
 * Supprime un sondage — et ses réponses avec lui, par cascade.
 *
 * Refusé dès qu'une réponse existe : « clôturer » couvre le besoin courant
 * (arrêter la collecte) sans détruire des données que personne ne pourra
 * reconstituer.
 */
export const deleteSurvey = async (id: string): Promise<ActionResult<null>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", id);

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `Ce sondage a ${count} réponses. Clôturez-le plutôt que de le supprimer.`,
    };
  }

  const { error } = await supabase.from("surveys").delete().eq("id", id);
  if (error) return { success: false, error: "Suppression impossible" };

  revalidatePath("/admin/sondages");
  return { success: true, data: null };
};

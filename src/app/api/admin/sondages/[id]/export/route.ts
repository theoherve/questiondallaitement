import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toSurveyCsv } from "@/lib/surveys/csv";
import type {
  SurveyDefinition,
  SurveyQuestionRow,
  SurveyResponseRow,
} from "@/lib/surveys/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: survey } = await supabase
    .from("surveys")
    .select("*, survey_questions(*)")
    .eq("id", id)
    .maybeSingle();

  if (!survey) {
    return NextResponse.json({ error: "Sondage introuvable" }, { status: 404 });
  }

  const { data: responses } = await supabase
    .from("survey_responses")
    .select("*")
    .eq("survey_id", id)
    .order("created_at", { ascending: false });

  const definition: SurveyDefinition = {
    ...survey,
    questions: [...((survey.survey_questions ?? []) as SurveyQuestionRow[])].sort(
      (a, b) => a.position - b.position,
    ),
  };

  const csv = toSurveyCsv(definition, (responses ?? []) as SurveyResponseRow[]);

  // BOM UTF-8 : sans lui, Excel affiche « rÃ©veils » à l'ouverture du fichier.
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sondage-${survey.slug}.csv"`,
    },
  });
}

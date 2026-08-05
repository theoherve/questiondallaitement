import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSurveyCounts } from "@/lib/surveys/queries";
import { SurveyChart } from "@/components/surveys/survey-chart";
import { getSurveyForAdmin } from "../../actions";
import type { SurveyDefinition, SurveyResponseRow } from "@/lib/surveys/types";

/** Les deux cents dernières suffisent à l'usage courant — au-delà, c'est
 *  l'export CSV qui sert, et charger tout le fichier ferait ramer la page. */
const RECENT_LIMIT = 200;

export default async function SurveyResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const survey = await getSurveyForAdmin(id);
  if (!survey) notFound();

  const definition: SurveyDefinition = {
    id: survey.id,
    slug: survey.slug,
    title: survey.title,
    intro: survey.intro,
    status: survey.status,
    thank_you_message: survey.thank_you_message,
    questions: survey.survey_questions,
  };

  const supabase = createAdminClient();
  const [{ data: recent }, { count: total }, { count: withConsent }, counts] =
    await Promise.all([
      supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", id)
        .order("created_at", { ascending: false })
        .limit(RECENT_LIMIT),
      supabase
        .from("survey_responses")
        .select("id", { count: "exact", head: true })
        .eq("survey_id", id),
      supabase
        .from("survey_responses")
        .select("id", { count: "exact", head: true })
        .eq("survey_id", id)
        .eq("marketing_consent", true),
      getSurveyCounts(id),
    ]);

  const responses = (recent ?? []) as SurveyResponseRow[];

  const columns = definition.questions.flatMap((question) =>
    question.rows.map((row) => ({
      questionId: question.id,
      rowKey: row.key,
      header: row.label ? `${question.label} — ${row.label}` : question.label,
      labels: new Map(question.choices.map((c) => [c.key, c.label])),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-primary-green">
            {survey.title}
          </h1>
          <p className="text-sm text-primary-green/60">
            {total ?? 0} réponse{(total ?? 0) > 1 ? "s" : ""} — {withConsent ?? 0}{" "}
            email{(withConsent ?? 0) > 1 ? "s" : ""} avec consentement
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/sondages/${id}`}>Modifier le sondage</Link>
          </Button>
          <Button asChild>
            <a href={`/api/admin/sondages/${id}/export`}>Exporter en CSV</a>
          </Button>
        </div>
      </div>

      <SurveyChart
        payload={{
          survey: definition,
          counts: counts.counts,
          totalResponses: counts.totalResponses,
        }}
      />

      {responses.length === 0 ? (
        <p className="text-primary-green/70">Aucune réponse pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Page</TableHead>
                {columns.map((column) => (
                  <TableHead key={`${column.questionId}-${column.rowKey}`}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow key={response.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(response.created_at), "d MMM yyyy HH:mm", {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell>
                    {response.email ?? (
                      <span className="text-primary-green/40">—</span>
                    )}
                  </TableCell>
                  <TableCell>{response.segment_key ?? "—"}</TableCell>
                  <TableCell className="max-w-48 truncate">
                    {response.source_path ?? "—"}
                  </TableCell>
                  {columns.map((column) => {
                    const choiceKey =
                      response.answers?.[column.questionId]?.[column.rowKey];
                    return (
                      <TableCell key={`${column.questionId}-${column.rowKey}`}>
                        {choiceKey
                          ? (column.labels.get(choiceKey) ?? choiceKey)
                          : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(total ?? 0) > RECENT_LIMIT && (
        <p className="text-sm text-primary-green/60">
          Seules les {RECENT_LIMIT} dernières réponses sont affichées. L&apos;export
          CSV les contient toutes.
        </p>
      )}
    </div>
  );
}

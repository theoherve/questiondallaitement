"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildChartRows } from "@/lib/surveys/aggregate";
import { SURVEY_SEGMENT_COLORS } from "@/config/surveys";
import type { SurveyPublicPayload } from "@/lib/surveys/types";

type Props = {
  payload: SurveyPublicPayload;
  /** Barre à mettre en évidence : la tranche du parent qui vient de répondre. */
  highlightRowKey?: string | null;
};

export const SurveyChart = ({ payload, highlightRowKey }: Props) => {
  const question = payload.survey.questions.find((entry) => entry.is_charted);
  if (!question) return null;

  const rows = buildChartRows(question, payload.counts);
  const data = rows.map((row) => ({
    label: row.label,
    rowKey: row.rowKey,
    hasEnoughData: row.hasEnoughData,
    // Une tranche sous le seuil est laissée vide : afficher son pourcentage
    // reviendrait à publier un chiffre que les données ne soutiennent pas.
    ...(row.hasEnoughData ? row.percentages : {}),
  }));

  const today = new Date().toLocaleDateString("fr-FR");

  return (
    <figure className="not-prose my-8 rounded-xl border border-primary-green/10 bg-background-beige-dark/40 p-4 sm:p-6">
      <figcaption className="mb-4">
        <h3 className="font-serif text-lg text-primary-green">
          {payload.survey.title}
        </h3>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {question.choices.map((choice, index) => (
            <li
              key={choice.key}
              className="flex items-center gap-2 text-sm text-primary-green/80"
            >
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-sm"
                style={{
                  backgroundColor:
                    SURVEY_SEGMENT_COLORS[index % SURVEY_SEGMENT_COLORS.length],
                }}
              />
              {choice.label}
            </li>
          ))}
        </ul>
      </figcaption>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis domain={[0, 100]} unit=" %" tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => `${Number(value)} %`} />
            {question.choices.map((choice, index) => (
              <Bar
                key={choice.key}
                dataKey={choice.key}
                name={choice.label}
                stackId="a"
                fill={SURVEY_SEGMENT_COLORS[index % SURVEY_SEGMENT_COLORS.length]}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.rowKey}
                    // La tranche du répondant ressort par l'opacité plutôt que
                    // par une couleur : la palette code déjà l'intensité des
                    // réveils, la détourner rendrait la légende fausse.
                    fillOpacity={
                      !highlightRowKey || entry.rowKey === highlightRowKey
                        ? 1
                        : 0.35
                    }
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-sm text-primary-green/70">
        {payload.totalResponses.toLocaleString("fr-FR")} répondant
        {payload.totalResponses > 1 ? "s" : ""} au {today}
      </p>

      {data.some((entry) => !entry.hasEnoughData) && (
        <p className="mt-1 text-xs text-primary-green/60">
          Les tranches sans barre n&apos;ont pas encore assez de données.
        </p>
      )}
    </figure>
  );
};

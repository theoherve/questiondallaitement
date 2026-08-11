"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getPercentileWeightGrams,
  WHO_PERCENTILES,
} from "@/lib/growth-charts/who-weight-for-age";
import type { WeightMeasurement } from "@/types/database";

type ChartPoint = {
  ageDays: number;
  measured: number | null;
  source: "home" | "consultation" | null;
  p3: number | null;
  p15: number | null;
  p50: number | null;
  p85: number | null;
  p97: number | null;
};

const ageDaysBetween = (birthDate: string, measuredAt: string): number =>
  Math.round(
    (new Date(measuredAt).getTime() - new Date(birthDate).getTime()) /
      (24 * 60 * 60 * 1000),
  );

const buildChartData = (
  measurements: WeightMeasurement[],
  birthDate: string,
  sex: "female" | "male",
): ChartPoint[] => {
  const measurementPoints: ChartPoint[] = measurements.map((m) => {
    const ageDays = ageDaysBetween(birthDate, m.measured_at);
    return {
      ageDays,
      measured: m.weight_grams,
      source: m.source,
      p3: getPercentileWeightGrams(ageDays, sex, 3),
      p15: getPercentileWeightGrams(ageDays, sex, 15),
      p50: getPercentileWeightGrams(ageDays, sex, 50),
      p85: getPercentileWeightGrams(ageDays, sex, 85),
      p97: getPercentileWeightGrams(ageDays, sex, 97),
    };
  });

  const maxAgeDays = Math.max(730, ...measurementPoints.map((p) => p.ageDays));
  const backgroundPoints: ChartPoint[] = [];
  for (let ageDays = 0; ageDays <= maxAgeDays; ageDays += 14) {
    if (measurementPoints.some((p) => p.ageDays === ageDays)) continue;
    backgroundPoints.push({
      ageDays,
      measured: null,
      source: null,
      p3: getPercentileWeightGrams(ageDays, sex, 3),
      p15: getPercentileWeightGrams(ageDays, sex, 15),
      p50: getPercentileWeightGrams(ageDays, sex, 50),
      p85: getPercentileWeightGrams(ageDays, sex, 85),
      p97: getPercentileWeightGrams(ageDays, sex, 97),
    });
  }

  return [...measurementPoints, ...backgroundPoints].sort(
    (a, b) => a.ageDays - b.ageDays,
  );
};

export const WeightChart = ({
  measurements,
  birthDate,
  sex,
}: {
  measurements: WeightMeasurement[];
  birthDate: string;
  sex: "female" | "male";
}) => {
  if (measurements.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Pas de pesée enregistrée pour le moment.
      </p>
    );
  }

  const data = buildChartData(measurements, birthDate, sex);

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="ageDays"
            tickFormatter={(days: number) => `${Math.round(days / 30)} m`}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            type="number"
          />
          <YAxis
            tickFormatter={(g: number) => `${(g / 1000).toFixed(1)} kg`}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            width={70}
          />
          <Tooltip
            labelFormatter={(label) =>
              `${Math.round(Number(label) / 30)} mois`
            }
            formatter={(value, name) => [
              `${(Number(value) / 1000).toFixed(2)} kg`,
              String(name),
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
          />
          {WHO_PERCENTILES.map((p) => (
            <Area
              key={p}
              dataKey={`p${p}`}
              stroke="none"
              fill="#9ca3af"
              fillOpacity={p === 50 ? 0 : 0.08}
              connectNulls
              name={`P${p}`}
              isAnimationActive={false}
            />
          ))}
          <Line
            dataKey="measured"
            stroke="#a0283e"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
            name="Poids de l'enfant"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-muted-foreground">
        Ces courbes sont indicatives et ne remplacent pas un avis médical.
      </p>
    </div>
  );
};

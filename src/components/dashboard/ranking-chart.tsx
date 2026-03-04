"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

type RankingChartProps = {
  data: { name: string; value: number }[];
  format?: "currency" | "number";
  label?: string;
};

export const RankingChart = ({
  data,
  format = "number",
  label = "Valeur",
}: RankingChartProps) => {
  const formatValue = format === "currency" ? formatCurrency : (v: number) => v.toString();
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Pas de données.
      </p>
    );
  }

  // Alternate bar colors
  const colors = ["#A0283E", "#203634", "#C4566A", "#2D4A47", "#7A1E2F"];

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          type="number"
          tickFormatter={formatValue}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          width={150}
        />
        <Tooltip
          formatter={(value) => [formatValue(Number(value ?? 0)), label]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

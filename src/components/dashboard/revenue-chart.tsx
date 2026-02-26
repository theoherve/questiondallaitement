"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type RevenueChartProps = {
  data: { label: string; revenue: number }[];
  formatValue?: (value: number) => string;
};

const defaultFormat = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value / 100);

export const RevenueChart = ({
  data,
  formatValue = defaultFormat,
}: RevenueChartProps) => {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Pas de données pour cette période.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#A0283E" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#A0283E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis
          tickFormatter={formatValue}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          width={80}
        />
        <Tooltip
          formatter={(value) => [formatValue(Number(value ?? 0)), "Revenus"]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#A0283E"
          strokeWidth={2}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

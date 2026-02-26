"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const PERIODS = [
  { key: "30d", label: "30 jours" },
  { key: "90d", label: "90 jours" },
  { key: "12m", label: "12 mois" },
] as const;

export type Period = (typeof PERIODS)[number]["key"];

export const PeriodSelector = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("period") as Period) || "30d";

  const handleChange = (period: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-1">
      {PERIODS.map((p) => (
        <Button
          key={p.key}
          variant={current === p.key ? "default" : "outline"}
          size="sm"
          onClick={() => handleChange(p.key)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
};

/**
 * Compute date range from a period key.
 */
export const getDateRange = (
  period: string,
): { start: Date; end: Date; groupBy: "day" | "month" } => {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "90d":
      start.setDate(start.getDate() - 90);
      return { start, end, groupBy: "day" };
    case "12m":
      start.setMonth(start.getMonth() - 12);
      return { start, end, groupBy: "month" };
    case "30d":
    default:
      start.setDate(start.getDate() - 30);
      return { start, end, groupBy: "day" };
  }
};

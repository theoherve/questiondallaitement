"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const PERIODS = [
  { key: "30d", label: "30 jours" },
  { key: "90d", label: "90 jours" },
  { key: "12m", label: "12 mois" },
] as const;

export type Period = (typeof PERIODS)[number]["key"];

export { getDateRange } from "@/lib/date-range";

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


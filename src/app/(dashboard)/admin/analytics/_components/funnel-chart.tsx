import type { FunnelStep } from "@/actions/analytics-advanced";

interface Props {
  data: FunnelStep[];
}

export function FunnelChart({ data }: Props) {
  const maxCount = data[0]?.count ?? 1;

  return (
    <div className="space-y-4">
      {data.map((step, i) => {
        const pct = maxCount > 0 ? Math.round((step.count / maxCount) * 100) : 0;
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{step.label}</span>
              <div className="flex items-center gap-3">
                {step.conversionFromPrev !== null && (
                  <span className="text-xs text-muted-foreground">
                    ↓ {step.conversionFromPrev}% de conversion
                  </span>
                )}
                <span className="font-semibold tabular-nums">
                  {step.count.toLocaleString("fr-FR")}
                </span>
              </div>
            </div>
            <div className="h-8 w-full rounded-md bg-muted overflow-hidden">
              <div
                className="h-full rounded-md bg-primary-green transition-all duration-500"
                style={{ width: `${pct}%`, opacity: 0.9 - i * 0.15 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

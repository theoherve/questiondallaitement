import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: number | null;
  trendLabel?: string;
};

export const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
}: StatCardProps) => {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold text-primary-green">
              {value}
            </p>
            {trend != null && (
              <div className="mt-1 flex items-center gap-1">
                {trend >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={`text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}
                >
                  {trend >= 0 ? "+" : ""}
                  {trend.toFixed(1)}%
                </span>
                {trendLabel && (
                  <span className="text-xs text-muted-foreground">
                    {trendLabel}
                  </span>
                )}
              </div>
            )}
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-red/10">
            <Icon className="h-5 w-5 text-primary-red" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

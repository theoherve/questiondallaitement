import type { RetentionRow } from "@/actions/analytics-advanced";

interface Props {
  data: RetentionRow[];
}

function heatColor(value: number | null): string {
  if (value === null) return "bg-muted text-muted-foreground";
  if (value >= 70) return "bg-green-700 text-white";
  if (value >= 50) return "bg-green-500 text-white";
  if (value >= 30) return "bg-green-300 text-green-900";
  if (value >= 10) return "bg-green-100 text-green-800";
  return "bg-muted text-muted-foreground";
}

export function RetentionHeatmap({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Pas encore assez de données pour calculer la rétention.
      </p>
    );
  }

  const maxMonths = Math.max(...data.map((r) => r.months.length));
  const headers = Array.from({ length: maxMonths }, (_, i) =>
    i === 0 ? "M+0" : `M+${i}`,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="text-left py-1 pr-3 font-medium text-muted-foreground whitespace-nowrap">
              Cohorte
            </th>
            <th className="py-1 px-2 font-medium text-muted-foreground text-center whitespace-nowrap">
              Taille
            </th>
            {headers.map((h) => (
              <th
                key={h}
                className="py-1 px-2 font-medium text-muted-foreground text-center whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.cohort}>
              <td className="py-1 pr-3 font-medium whitespace-nowrap capitalize">
                {row.cohort}
              </td>
              <td className="py-1 px-2 text-center text-muted-foreground">
                {row.cohortSize}
              </td>
              {Array.from({ length: maxMonths }, (_, i) => {
                const val = row.months[i] ?? null;
                return (
                  <td key={i} className="py-0.5 px-0.5">
                    <div
                      className={`rounded text-center py-1 px-2 tabular-nums font-medium ${heatColor(val)}`}
                      title={val !== null ? `${val}%` : "Non disponible"}
                    >
                      {val !== null ? `${val}%` : "-"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">
        % de clients actifs (au moins 1 achat) par mois après inscription.
      </p>
    </div>
  );
}

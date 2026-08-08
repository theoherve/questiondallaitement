import type { LtvData } from "@/actions/analytics-advanced";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  data: LtvData;
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

export function LtvTable({ data }: Props) {
  const { summary, topClients } = data;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">LTV moyenne</p>
          <p className="mt-1 text-2xl font-bold text-primary-green">
            {formatCurrency(summary.avgLtv)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">CA total plateforme</p>
          <p className="mt-1 text-2xl font-bold text-primary-green">
            {formatCurrency(summary.totalRevenue)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Clients ayant acheté</p>
          <p className="mt-1 text-2xl font-bold text-primary-green">
            {summary.activeClientsCount.toLocaleString("fr-FR")}
          </p>
        </div>
      </div>

      {/* Top clients table */}
      {topClients.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Top 20 clients par revenu
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">#</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Client</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">
                    Total dépensé
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-center">
                    Consultations
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-center">
                    Formations
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    Dernière activité
                  </th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((client, i) => {
                  const name =
                    client.first_name || client.last_name
                      ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
                      : client.email;
                  return (
                    <tr key={client.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="py-2 pr-4">
                        <p className="font-medium">{name}</p>
                        {(client.first_name || client.last_name) && (
                          <p className="text-xs text-muted-foreground">
                            {client.email}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold tabular-nums">
                        {formatCurrency(client.total_spent_cents)}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        {client.booking_count}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        {client.accompagnement_count}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {client.last_activity
                          ? format(new Date(client.last_activity), "d MMM yyyy", {
                              locale: fr,
                            })
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune donnée de paiement disponible.
        </p>
      )}
    </div>
  );
}

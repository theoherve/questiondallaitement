import Link from "next/link";

type ConsultantStatusData = {
  total: number;
  active: number;
  inactive: number;
  stripeConnected: number;
  stripePending: number;
  withAvailabilities: number;
};

export const ConsultantStatus = ({
  data,
}: {
  data: ConsultantStatusData;
}) => {
  const rows = [
    { label: "Actives", value: data.active, total: data.total, color: "bg-emerald-500" },
    { label: "Inactives", value: data.inactive, total: data.total, color: "bg-gray-300" },
    {
      label: "Stripe connecté",
      value: data.stripeConnected,
      total: data.total,
      color: "bg-blue-500",
    },
    {
      label: "Stripe en attente",
      value: data.stripePending,
      total: data.total,
      color: "bg-amber-500",
    },
    {
      label: "Disponibilités configurées",
      value: data.withAvailabilities,
      total: data.total,
      color: "bg-primary-red",
    },
  ];

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const pct = row.total > 0 ? (row.value / row.total) * 100 : 0;
        return (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>{row.label}</span>
              <span className="font-medium">
                {row.value}/{row.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${row.color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <Link
        href="/admin/consultantes"
        className="block text-center text-sm text-primary-red hover:underline"
      >
        Gérer les consultantes
      </Link>
    </div>
  );
};

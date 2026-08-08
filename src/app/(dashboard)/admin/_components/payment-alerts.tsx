import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";

type PaymentAlertsData = {
  pending: number;
  failed: number;
};

export const PaymentAlerts = ({ data }: { data: PaymentAlertsData }) => {
  if (data.pending === 0 && data.failed === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <p className="text-sm text-emerald-700">
          Tous les paiements sont en ordre.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.failed > 0 && (
        <Link
          href="/admin/paiements?status=failed"
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 transition-colors hover:bg-red-100"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-700">
              {data.failed} paiement{data.failed > 1 ? "s" : ""} échoué
              {data.failed > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-600">
              Action requise, cliquez pour voir
            </p>
          </div>
        </Link>
      )}
      {data.pending > 0 && (
        <Link
          href="/admin/paiements?status=pending"
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
        >
          <Clock className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-700">
              {data.pending} paiement{data.pending > 1 ? "s" : ""} en attente
            </p>
            <p className="text-xs text-amber-600">
              En cours de traitement
            </p>
          </div>
        </Link>
      )}
    </div>
  );
};

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { getPayments, type PaymentFilters } from "../actions";

type ExportCsvButtonProps = {
  filters: PaymentFilters;
};

const formatPrice = (cents: number): string => (cents / 100).toFixed(2);

const escapeCSV = (value: string): string => {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const ExportCsvButton = ({ filters }: ExportCsvButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    setError(null);

    startTransition(async () => {
      const result = await getPayments(filters);
      if (!result.success || !result.data) {
        setError("Erreur lors de l'export");
        return;
      }

      const headers = [
        "Date",
        "Client",
        "Email client",
        "Consultante",
        "Type",
        "Montant (€)",
        "Commission (€)",
        "Remboursé (€)",
        "Statut",
        "Stripe PI",
      ];

      const rows = result.data.map((p) => [
        new Date(p.created_at).toLocaleDateString("fr-FR"),
        escapeCSV(
          `${p.client.first_name ?? ""} ${p.client.last_name ?? ""}`.trim()
        ),
        escapeCSV(p.client.email),
        escapeCSV(
          `${p.consultant.first_name ?? ""} ${p.consultant.last_name ?? ""}`.trim()
        ),
        p.type,
        formatPrice(p.amount_cents),
        formatPrice(p.platform_fee_cents),
        formatPrice(p.refund_amount_cents),
        p.status,
        p.stripe_payment_intent_id ?? "",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n"
      );

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `paiements-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        variant="default"
        size="sm"
        onClick={handleExport}
        disabled={isPending}
        aria-label="Exporter les paiements en CSV"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Export CSV
      </Button>
    </div>
  );
};

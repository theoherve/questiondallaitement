import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";

type Payment = {
  id: string;
  amount_cents: number;
  currency: string;
  type: string;
  status: string;
  stripe_invoice_url: string | null;
  created_at: string;
  consultant: { first_name: string | null; last_name: string | null } | null;
};

const STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  succeeded: { label: "Réussi", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  failed: { label: "Échoué", variant: "destructive" },
  refunded: { label: "Remboursé", variant: "outline" },
  partially_refunded: { label: "Remb. partiel", variant: "outline" },
};

const TYPE_MAP: Record<string, string> = {
  formation: "Accompagnement",
  booking: "Réservation",
  event: "Événement",
};

const formatPrice = (cents: number, currency = "eur") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100,
  );

export const TabPaiements = ({ payments }: { payments: Payment[] }) => {
  const total = payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary-green">
            Paiements ({payments.length})
          </CardTitle>
          {total > 0 && (
            <span className="text-sm font-semibold text-primary-green">
              Total : {formatPrice(total)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun paiement.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Consultante</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => {
                const s = STATUS_MAP[p.status] ?? {
                  label: p.status,
                  variant: "outline" as const,
                };
                const consultantName = p.consultant
                  ? `${p.consultant.first_name ?? ""} ${p.consultant.last_name ?? ""}`.trim() ||
                    "—"
                  : "—";

                return (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>{TYPE_MAP[p.type] ?? p.type}</TableCell>
                    <TableCell>{consultantName}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(p.amount_cents, p.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.stripe_invoice_url && (
                        <a
                          href={p.stripe_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

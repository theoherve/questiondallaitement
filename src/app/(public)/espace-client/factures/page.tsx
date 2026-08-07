import { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatMoneyCents } from "@/lib/invoicing/invoice-view";

export const metadata: Metadata = {
  title: "Mes factures",
};

const TYPE_LABELS: Record<string, string> = {
  booking: "Consultation",
  accompagnement: "Accompagnement",
  formation: "Formation",
};

const ClientInvoicesPage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, number, issued_at, type, amount_ttc_cents, currency, issuer_legal_name, status",
    )
    .eq("client_id", user.id)
    .order("issued_at", { ascending: false });

  const rows = invoices ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Mes factures
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Le justificatif de chacun de vos achats.
      </p>

      <div className="mt-6">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <FileText className="h-8 w-8" />
              <p>Vous n&apos;avez aucune facture pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {rows.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">N° {invoice.number}</p>
                    <p className="text-sm text-muted-foreground">
                      {TYPE_LABELS[invoice.type] ?? invoice.type} —{" "}
                      {invoice.issuer_legal_name} —{" "}
                      {format(new Date(invoice.issued_at), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-primary-green">
                      {formatMoneyCents(
                        invoice.amount_ttc_cents,
                        invoice.currency,
                      )}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/factures/${invoice.id}`}>
                        <Eye className="mr-1 h-4 w-4" />
                        Voir
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClientInvoicesPage;

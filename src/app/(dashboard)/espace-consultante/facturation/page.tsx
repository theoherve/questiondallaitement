import { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatMoneyCents } from "@/lib/invoicing/invoice-view";
import { ResendInvoiceButton } from "./_components/resend-button";
import { CorrectInvoiceButton } from "./_components/correct-button";
import { getContacts } from "../crm/actions";
import { NewInvoiceButton } from "./_components/new-invoice-button";
import { SettlementButton } from "./_components/settlement-button";
import { ExportButton } from "./_components/export-button";

export const metadata: Metadata = {
  title: "Facturation",
};

const TYPE_LABELS: Record<string, string> = {
  booking: "Consultation",
  accompagnement: "Accompagnement",
  formation: "Formation",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "En attente",
  partial: "Partiellement payée",
  paid: "Payée",
};

const isOverdue = (dueDate: string | null, paymentStatus: string) =>
  Boolean(dueDate) && paymentStatus !== "paid" && new Date(dueDate as string) < new Date();

const ConsultantInvoicesPage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, number, issued_at, type, amount_ttc_cents, currency, client_name, status, emailed_at, document_type, description, payment_status, due_date, origin",
    )
    .eq("consultant_id", user.id)
    .order("issued_at", { ascending: false });

  const rows = invoices ?? [];

  const contacts = await getContacts();
  const clients = contacts.map((c) => ({
    id: c.id,
    label: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            Facturation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les factures émises automatiquement à chaque encaissement, et
            celles créées manuellement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton />
          <NewInvoiceButton clients={clients} />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8" />
            <p>Aucune facture pour le moment.</p>
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
                  <p className="font-medium">
                    {invoice.document_type === "credit_note"
                      ? "Avoir"
                      : "Facture"}{" "}
                    N° {invoice.number}
                    {invoice.status === "cancelled" && (
                      <Badge variant="destructive" className="ml-2">
                        Annulée
                      </Badge>
                    )}
                    {invoice.origin === "manual" && (
                      <Badge
                        variant={isOverdue(invoice.due_date, invoice.payment_status) ? "destructive" : "outline"}
                        className="ml-2"
                      >
                        {isOverdue(invoice.due_date, invoice.payment_status)
                          ? "En retard"
                          : PAYMENT_STATUS_LABELS[invoice.payment_status]}
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {TYPE_LABELS[invoice.type] ?? invoice.type} ,{" "}
                    {invoice.client_name} ,{" "}
                    {format(new Date(invoice.issued_at), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.emailed_at
                      ? `Envoyée le ${format(new Date(invoice.emailed_at), "d MMM yyyy", { locale: fr })}`
                      : "Pas encore envoyée"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-primary-green">
                    {formatMoneyCents(invoice.amount_ttc_cents, invoice.currency)}
                  </span>
                  {invoice.document_type === "invoice" &&
                    invoice.status === "issued" && (
                      <CorrectInvoiceButton
                        invoiceId={invoice.id}
                        defaultDescription={invoice.description}
                        defaultTtcEuros={(
                          invoice.amount_ttc_cents / 100
                        ).toFixed(2)}
                      />
                    )}
                  {invoice.origin === "manual" && invoice.payment_status !== "paid" && (
                    <>
                      <SettlementButton
                        invoiceId={invoice.id}
                        remainingCents={invoice.amount_ttc_cents}
                      />
                      {isOverdue(invoice.due_date, invoice.payment_status) && (
                        <ResendInvoiceButton
                          invoiceId={invoice.id}
                          alreadySent
                        />
                      )}
                    </>
                  )}
                  <ResendInvoiceButton
                    invoiceId={invoice.id}
                    alreadySent={Boolean(invoice.emailed_at)}
                  />
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
  );
};

export default ConsultantInvoicesPage;

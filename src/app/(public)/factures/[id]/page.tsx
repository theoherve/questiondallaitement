import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { buildInvoiceView } from "@/lib/invoicing/invoice-view";
import { InvoiceDocument } from "./_components/invoice-document";
import { PrintButton } from "./_components/print-button";

type Props = { params: Promise<{ id: string }> };

const INVOICE_FIELDS =
  "number, issued_at, type, currency, vat_rate, amount_ht_cents, amount_vat_cents, amount_ttc_cents, description, client_name, client_email, issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number, issuer_legal_form, status, document_type, client_id, consultant_id, promo_code, discount_cents, gross_amount_ttc_cents, origin, payment_status, issuer_iban, issuer_bic";

/**
 * Facture consultable par les deux parties et l'administration. Le client
 * Supabase admin contourne les RLS ; l'autorisation est faite ici : seules la
 * cliente concernee, la consultante emettrice et un admin peuvent l'ouvrir.
 */
const InvoicePage = async ({ params }: Props) => {
  const { id } = await params;
  const { supabase, user } = await getSupabaseAndUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(INVOICE_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  const isAdmin = user.roles?.includes("admin");
  const canView =
    invoice.client_id === user.id ||
    invoice.consultant_id === user.id ||
    isAdmin;

  if (!canView) notFound();

  const view = buildInvoiceView(invoice);

  // Retour vers l'espace d'ou l'on vient : l'emettrice et l'admin cote
  // consultante, la cliente cote client.
  const isIssuerOrAdmin = invoice.consultant_id === user.id || isAdmin;
  const backHref = isIssuerOrAdmin
    ? "/espace-consultante/facturation"
    : "/espace-client/factures";
  const backLabel = isIssuerOrAdmin ? "Facturation" : "Mes factures";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Isolation a l'impression : on ne garde que le document, sans le reste
          de l'interface (en-tete, navigation, boutons). */}
      <style>{`@media print {
        body * { visibility: hidden; }
        #invoice-print, #invoice-print * { visibility: visible; }
        #invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
      }`}</style>

      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <PrintButton />
      </div>

      <InvoiceDocument view={view} />
    </div>
  );
};

export default InvoicePage;

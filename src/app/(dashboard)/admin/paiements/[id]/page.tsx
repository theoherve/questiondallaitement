import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  Receipt,
  User,
} from "lucide-react";
import { RefundForm } from "../_components/refund-form";

type Props = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { id } = await params;
  return { title: `Paiement ${id.slice(0, 8)}...` };
};

const formatPrice = (cents: number, currency = "eur"): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  succeeded: { label: "Réussi", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  failed: { label: "Échoué", variant: "destructive" },
  refunded: { label: "Remboursé", variant: "outline" },
  partially_refunded: { label: "Partiellement remboursé", variant: "outline" },
};

const TYPE_LABELS: Record<string, string> = {
  accompagnement: "Accompagnement",
  booking: "Consultation",
  formation: "Formation",
};

const PaymentDetailPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/admin");

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select(
      `
      *,
      client:profiles!payments_client_id_fkey (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      consultant:consultants!payments_consultant_id_fkey (
        id,
        slug,
        commission_rate,
        stripe_account_id,
        profiles!consultants_id_fkey (
          first_name,
          last_name,
          email
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!payment) notFound();

  const client = payment.client as unknown as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
  };

  const consultantRaw = payment.consultant as unknown as {
    id: string;
    slug: string;
    commission_rate: number;
    stripe_account_id: string | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
  };

  const clientName =
    `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || client.email;
  const consultantName = consultantRaw?.profiles
    ? `${consultantRaw.profiles.first_name ?? ""} ${consultantRaw.profiles.last_name ?? ""}`.trim()
    : "";
  const statusConf = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.pending;
  const isRefundable =
    payment.status === "succeeded" || payment.status === "partially_refunded";
  const maxRefundable = payment.amount_cents - payment.refund_amount_cents;
  const stripePaymentUrl = payment.stripe_payment_intent_id
    ? `https://dashboard.stripe.com/payments/${payment.stripe_payment_intent_id}`
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/paiements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            Paiement
          </h1>
          <p className="font-mono text-sm text-muted-foreground">{payment.id}</p>
        </div>
        <Badge variant={statusConf.variant} className="text-sm">
          {statusConf.label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Montants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-green">
              <Receipt className="h-5 w-5" />
              Montants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Montant total" value={formatPrice(payment.amount_cents, payment.currency)} bold />
            <Row
              label="Commission plateforme"
              value={formatPrice(payment.platform_fee_cents, payment.currency)}
            />
            <Row
              label="Revenu consultante"
              value={formatPrice(
                payment.amount_cents - payment.platform_fee_cents,
                payment.currency
              )}
            />
            {payment.refund_amount_cents > 0 && (
              <>
                <div className="my-2 border-t" />
                <Row
                  label="Montant remboursé"
                  value={`-${formatPrice(payment.refund_amount_cents, payment.currency)}`}
                  className="text-destructive"
                />
                {payment.refunded_at && (
                  <Row
                    label="Remboursé le"
                    value={formatDate(payment.refunded_at)}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Informations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-green">
              <CreditCard className="h-5 w-5" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Type" value={TYPE_LABELS[payment.type] ?? payment.type} />
            <Row label="Date" value={formatDate(payment.created_at)} />
            <Row label="Devise" value={payment.currency.toUpperCase()} />
            {payment.stripe_payment_intent_id && (
              <Row
                label="Payment Intent"
                value={
                  <span className="flex items-center gap-1">
                    <code className="text-xs">
                      {payment.stripe_payment_intent_id}
                    </code>
                    {stripePaymentUrl && (
                      <a
                        href={stripePaymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-red hover:text-primary-red-dark"
                        aria-label="Voir sur Stripe"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </span>
                }
              />
            )}
            {payment.stripe_invoice_url && (
              <Row
                label="Facture"
                value={
                  <a
                    href={payment.stripe_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary-red hover:text-primary-red-dark"
                  >
                    Voir la facture
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                }
              />
            )}
            <Row
              label="Reference ID"
              value={
                <code className="text-xs">{payment.reference_id}</code>
              }
            />
          </CardContent>
        </Card>

        {/* Client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-green">
              <User className="h-5 w-5" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Nom" value={clientName} />
            <Row label="Email" value={client.email} />
            {client.phone && <Row label="Téléphone" value={client.phone} />}
          </CardContent>
        </Card>

        {/* Consultante */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-green">
              <User className="h-5 w-5" />
              Consultante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Nom" value={consultantName} />
            <Row label="Email" value={consultantRaw?.profiles?.email ?? ""} />
            <Row
              label="Commission"
              value={`${consultantRaw?.commission_rate ?? 0}%`}
            />
            <Row
              label="Stripe Account"
              value={
                <code className="text-xs">
                  {consultantRaw?.stripe_account_id ?? "Non connecté"}
                </code>
              }
            />
            <Row
              label="Fiche"
              value={
                <Link
                  href={`/admin/consultantes/${consultantRaw?.id}`}
                  className="text-sm text-primary-red hover:underline"
                >
                  Voir la fiche
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      {payment.metadata &&
        Object.keys(payment.metadata as Record<string, unknown>).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-primary-green">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
                {JSON.stringify(payment.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

      {/* Refund form */}
      {isRefundable && payment.stripe_payment_intent_id && (
        <RefundForm
          paymentId={payment.id}
          maxRefundableCents={maxRefundable}
          currency={payment.currency}
          alreadyRefundedCents={payment.refund_amount_cents}
        />
      )}
    </div>
  );
};

const Row = ({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  className?: string;
}) => (
  <div className={`flex items-start justify-between gap-4 ${className ?? ""}`}>
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm text-right ${bold ? "font-bold" : ""}`}>
      {value}
    </span>
  </div>
);

export default PaymentDetailPage;

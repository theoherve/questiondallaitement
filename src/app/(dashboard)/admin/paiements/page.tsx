import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Eye, TrendingUp, ArrowDownRight, DollarSign } from "lucide-react";
import { getPayments, type PaymentFilters } from "./actions";
import { ExportCsvButton } from "@/app/(dashboard)/admin/paiements/_components/export-csv-button";

export const metadata: Metadata = {
  title: "Paiements",
};

type SearchParams = Promise<{
  status?: string;
  type?: string;
  consultant_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}>;

const formatPrice = (cents: number, currency = "eur"): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
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
  partially_refunded: { label: "Partiel. remb.", variant: "outline" },
};

const TYPE_CONFIG: Record<string, { label: string }> = {
  formation: { label: "Accompagnement" },
  booking: { label: "Consultation" },
  event: { label: "Événement" },
};

const PaiementsPage = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/admin");

  const params = await searchParams;
  const filters: PaymentFilters = {
    status: params.status,
    type: params.type,
    consultant_id: params.consultant_id,
    date_from: params.date_from,
    date_to: params.date_to,
    search: params.search,
  };

  const result = await getPayments(filters);
  const payments = result.data ?? [];

  const supabase = createAdminClient();
  const { data: consultants } = await supabase
    .from("consultants")
    .select("id, profiles!consultants_id_fkey (first_name, last_name)")
    .order("created_at", { ascending: false });

  const totalAmount = payments
    .filter((p) => p.status === "succeeded" || p.status === "partially_refunded")
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const totalFees = payments
    .filter((p) => p.status === "succeeded" || p.status === "partially_refunded")
    .reduce((sum, p) => sum + p.platform_fee_cents, 0);
  const totalRefunded = payments.reduce(
    (sum, p) => sum + p.refund_amount_cents,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            Paiements
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {payments.length} paiement{payments.length > 1 ? "s" : ""}
          </p>
        </div>
        <ExportCsvButton filters={filters} />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <TrendingUp className="h-5 w-5 text-primary-green" />
            <div>
              <p className="text-sm text-muted-foreground">Total encaissé</p>
              <p className="text-2xl font-bold text-primary-green">
                {formatPrice(totalAmount)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <DollarSign className="h-5 w-5 text-primary-green" />
            <div>
              <p className="text-sm text-muted-foreground">
                Commissions plateforme
              </p>
              <p className="text-2xl font-bold text-primary-green">
                {formatPrice(totalFees)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <ArrowDownRight className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">
                Total remboursé
              </p>
              <p className="text-2xl font-bold text-destructive">
                {formatPrice(totalRefunded)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 p-0">
          <CardTitle className="flex items-center gap-2 text-primary-green">
            <CreditCard className="h-5 w-5" />
            Filtres
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button type="submit" form="paiements-filters-form" variant="outline">
              Filtrer
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link href="/admin/paiements">Réinitialiser</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form
            id="paiements-filters-form"
            className="flex flex-wrap items-end gap-x-4 gap-y-4"
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="search"
                className="text-xs font-medium text-muted-foreground"
              >
                Recherche
              </label>
              <input
                id="search"
                type="text"
                name="search"
                placeholder="Nom, email, PI..."
                defaultValue={params.search ?? ""}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Rechercher un paiement"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="status"
                className="text-xs font-medium text-muted-foreground"
              >
                Statut
              </label>
              <select
                id="status"
                name="status"
                defaultValue={params.status ?? "all"}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Filtrer par statut"
              >
                <option value="all">Tous</option>
                <option value="succeeded">Réussi</option>
                <option value="pending">En attente</option>
                <option value="failed">Échoué</option>
                <option value="refunded">Remboursé</option>
                <option value="partially_refunded">Partiel. remboursé</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="type"
                className="text-xs font-medium text-muted-foreground"
              >
                Type
              </label>
              <select
                id="type"
                name="type"
                defaultValue={params.type ?? "all"}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Filtrer par type"
              >
                <option value="all">Tous</option>
                <option value="formation">Accompagnement</option>
                <option value="booking">Consultation</option>
                <option value="event">Événement</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="consultant_id"
                className="text-xs font-medium text-muted-foreground"
              >
                Consultante
              </label>
              <select
                id="consultant_id"
                name="consultant_id"
                defaultValue={params.consultant_id ?? "all"}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Filtrer par consultante"
              >
                <option value="all">Toutes</option>
                {(consultants ?? []).map((c) => {
                  const profile = c.profiles as unknown as {
                    first_name: string | null;
                    last_name: string | null;
                  };
                  return (
                    <option key={c.id} value={c.id}>
                      {profile?.first_name} {profile?.last_name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="date_from"
                className="text-xs font-medium text-muted-foreground"
              >
                Du
              </label>
              <input
                id="date_from"
                type="date"
                name="date_from"
                defaultValue={params.date_from ?? ""}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Date de début"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="date_to"
                className="text-xs font-medium text-muted-foreground"
              >
                Au
              </label>
              <input
                id="date_to"
                type="date"
                name="date_to"
                defaultValue={params.date_to ?? ""}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Date de fin"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Payments table */}
      {payments.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Consultante</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const clientName =
                    `${payment.client.first_name ?? ""} ${payment.client.last_name ?? ""}`.trim() ||
                    payment.client.email;
                  const consultantName =
                    `${payment.consultant.first_name ?? ""} ${payment.consultant.last_name ?? ""}`.trim() ||
                    payment.consultant.email;
                  const statusConf =
                    STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.pending;
                  const typeConf =
                    TYPE_CONFIG[payment.type] ?? { label: payment.type };

                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(payment.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.client.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{consultantName}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{typeConf.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(payment.amount_cents, payment.currency)}
                        {payment.refund_amount_cents > 0 && (
                          <p className="text-xs text-destructive">
                            -{formatPrice(payment.refund_amount_cents, payment.currency)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatPrice(payment.platform_fee_cents, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConf.variant}>
                          {statusConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/paiements/${payment.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Voir</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center">
            <p className="text-muted-foreground">Aucun paiement trouvé.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaiementsPage;

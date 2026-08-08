import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Tag } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { listPromoCodes } from "./actions";
import {
  formatDiscount,
  formatMoney,
  targetsSummary,
} from "./_components/format";

export const metadata: Metadata = {
  title: "Codes promo",
};

const formatWindow = (from: string | null, until: string | null): string => {
  if (!from && !until) return ",";
  const fmt = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: fr });
  if (from && until) return `${fmt(from)} → ${fmt(until)}`;
  return from ? `dès le ${fmt(from)}` : `jusqu'au ${fmt(until as string)}`;
};

const PromoCodesPage = async () => {
  const codes = await listPromoCodes();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            Codes promo
          </h1>
          <p className="text-sm text-muted-foreground">
            Remises applicables aux accompagnements, aux formations et aux
            rendez-vous. Un seul code par commande.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/marketing/codes-promo/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau code
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {codes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Tag className="h-10 w-10 text-muted-foreground/40" />
              <div className="space-y-1">
                <p className="font-medium text-primary-green">
                  Aucun code pour le moment
                </p>
                <p className="text-sm text-muted-foreground">
                  Crée un premier code pour lancer une campagne.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Remise</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead>Utilisations</TableHead>
                  <TableHead>Remise consentie</TableHead>
                  <TableHead>Validité</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-medium text-primary-green">
                      {code.code}
                      {code.label && (
                        <p className="text-xs font-normal text-muted-foreground">
                          {code.label}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDiscount(code.discount_type, code.discount_value)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {targetsSummary(code.scope_all, code.target_count)}
                    </TableCell>
                    <TableCell>
                      {code.redemptions}
                      {code.max_redemptions ? ` / ${code.max_redemptions}` : " / ∞"}
                    </TableCell>
                    <TableCell>{formatMoney(code.discount_total_cents)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatWindow(code.valid_from, code.valid_until)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.is_active ? "default" : "secondary"}>
                        {code.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/marketing/codes-promo/${code.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PromoCodesPage;

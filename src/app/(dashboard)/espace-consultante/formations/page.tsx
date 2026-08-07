import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
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
import { Eye, MapPin, Video, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Mes formations",
};

const TYPE_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  online: { label: "En ligne", variant: "secondary" },
  in_person: { label: "Présentiel", variant: "default" },
  hybrid: { label: "Hybride", variant: "outline" },
};

const formatPrice = (cents: number, currency: string): string => {
  if (cents === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
};

const ConsultanteFormationsPage = async () => {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");

  const supabase = createAdminClient();

  // Get the consultant record for this user
  const { data: consultant } = await supabase
    .from("consultants")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!consultant) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Mes formations
        </h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Accès réservé aux consultantes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: formations } = await supabase
    .from("formations")
    .select("id, title, slug, type, starts_at, ends_at, show_time, location, max_participants, price_cents, currency, is_published, created_at")
    .eq("consultant_id", consultant.id)
    .order("starts_at", { ascending: false });

  // Count registrations for all formations
  const formationIds = (formations ?? []).map((e) => e.id);
  const { data: registrations } = formationIds.length
    ? await supabase
        .from("formation_registrations")
        .select("formation_id")
        .in("formation_id", formationIds)
        .eq("status", "registered")
    : { data: [] };

  const regCounts = new Map<string, number>();
  for (const reg of registrations ?? []) {
    regCounts.set(reg.formation_id, (regCounts.get(reg.formation_id) ?? 0) + 1);
  }

  type FormationRow = {
    id: string;
    title: string;
    slug: string;
    type: string;
    starts_at: string;
    ends_at: string;
    show_time: boolean;
    location: string | null;
    max_participants: number | null;
    price_cents: number;
    currency: string;
    is_published: boolean;
    created_at: string;
  };

  const rows = (formations ?? []) as FormationRow[];

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Mes formations
      </h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-60">Titre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Inscrits</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Aucune formation trouvée
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((formation) => {
                  const typeConfig =
                    TYPE_CONFIG[formation.type] ?? TYPE_CONFIG.online;
                  const regCount = regCounts.get(formation.id) ?? 0;
                  const spotsLabel = formation.max_participants
                    ? `${regCount}/${formation.max_participants}`
                    : `${regCount}`;
                  const isPast = new Date(formation.ends_at) < new Date();

                  return (
                    <TableRow
                      key={formation.id}
                      className={isPast ? "opacity-60" : ""}
                    >
                      <TableCell>
                        <p className="font-medium">{formation.title}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeConfig.variant} className="gap-1">
                          {formation.type === "online" ? (
                            <Video className="mr-1 h-3 w-3" />
                          ) : formation.type === "in_person" ? (
                            <MapPin className="mr-1 h-3 w-3" />
                          ) : (
                            <Users className="mr-1 h-3 w-3" />
                          )}
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          {format(new Date(formation.starts_at), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </div>
                        {formation.show_time && (
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(formation.starts_at), "HH'h'mm", {
                              locale: fr,
                            })}{" "}
                            –{" "}
                            {format(new Date(formation.ends_at), "HH'h'mm", {
                              locale: fr,
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatPrice(formation.price_cents, formation.currency)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span
                          className={
                            formation.max_participants &&
                            regCount >= formation.max_participants
                              ? "font-medium text-destructive"
                              : ""
                          }
                        >
                          {spotsLabel}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formation.is_published ? (
                          <Badge variant="default">Publié</Badge>
                        ) : (
                          <Badge variant="secondary">Brouillon</Badge>
                        )}
                        {isPast && (
                          <Badge variant="outline" className="ml-1">
                            Passé
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formation.is_published && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Voir"
                          >
                            <Link
                              href={`/formations/${formation.slug}`}
                              target="_blank"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultanteFormationsPage;

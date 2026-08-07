import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Eye, MapPin, Video, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Gestion des formations",
};

const TYPE_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  online: { label: "En ligne", variant: "secondary" },
  in_person: { label: "Présentiel", variant: "default" },
  hybrid: { label: "Hybride", variant: "outline" },
};

const TypeIcon = ({ type }: { type: string }) => {
  const iconClass = "h-3 w-3 mr-1";
  if (type === "online") return <Video className={iconClass} />;
  if (type === "in_person") return <MapPin className={iconClass} />;
  return <Users className={iconClass} />;
};

const formatPrice = (cents: number, currency: string): string => {
  if (cents === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
};

type Props = {
  searchParams: Promise<{
    type?: string;
    published?: string;
    consultant?: string;
    q?: string;
  }>;
};

const AdminFormationsPage = async ({ searchParams }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const params = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("events")
    .select(
      `
      id,
      title,
      slug,
      type,
      starts_at,
      ends_at,
      location,
      max_participants,
      price_cents,
      currency,
      is_published,
      consultant_id,
      created_at,
      consultants (
        id,
        profiles!consultants_id_fkey (
          first_name,
          last_name
        )
      )
    `,
    )
    .order("starts_at", { ascending: false });

  if (params.type && params.type !== "all") {
    query = query.eq("type", params.type);
  }

  if (params.published === "true") {
    query = query.eq("is_published", true);
  } else if (params.published === "false") {
    query = query.eq("is_published", false);
  }

  if (params.consultant) {
    query = query.eq("consultant_id", params.consultant);
  }

  if (params.q) {
    query = query.ilike("title", `%${params.q}%`);
  }

  const [formationsResult, consultantsResult, registrationsResult] =
    await Promise.all([
      query,
      supabase
        .from("consultants")
        .select("id, profiles!consultants_id_fkey(first_name, last_name)")
        .eq("is_active", true),
      supabase
        .from("event_registrations")
        .select("event_id")
        .eq("status", "registered"),
    ]);

  type FormationRow = {
    id: string;
    title: string;
    slug: string;
    type: string;
    starts_at: string;
    ends_at: string;
    location: string | null;
    max_participants: number | null;
    price_cents: number;
    currency: string;
    is_published: boolean;
    consultant_id: string;
    created_at: string;
    consultants: {
      id: string;
      profiles: {
        first_name: string | null;
        last_name: string | null;
      } | null;
    } | null;
  };

  type ConsultantOption = {
    id: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  };

  const rows = (formationsResult.data ?? []) as unknown as FormationRow[];
  const consultantOptions =
    (consultantsResult.data ?? []) as unknown as ConsultantOption[];

  // Count registrations per formation
  const regCounts = new Map<string, number>();
  for (const reg of registrationsResult.data ?? []) {
    regCounts.set(reg.event_id, (regCounts.get(reg.event_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Formations
        </h1>
        <Button asChild className="bg-primary-red hover:bg-primary-red-dark">
          <Link href="/admin/formations/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle formation
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <form className="flex flex-wrap items-end gap-4">
            <div className="min-w-50 flex-1">
              <label
                htmlFor="search"
                className="mb-1 block text-sm font-medium"
              >
                Recherche
              </label>
              <Input
                id="search"
                name="q"
                placeholder="Rechercher une formation..."
                defaultValue={params.q}
              />
            </div>
            <div className="w-40">
              <label htmlFor="type" className="mb-1 block text-sm font-medium">
                Type
              </label>
              <select
                id="type"
                name="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={params.type || "all"}
              >
                <option value="all">Tous</option>
                <option value="online">En ligne</option>
                <option value="in_person">Présentiel</option>
                <option value="hybrid">Hybride</option>
              </select>
            </div>
            <div className="w-40">
              <label
                htmlFor="published"
                className="mb-1 block text-sm font-medium"
              >
                Statut
              </label>
              <select
                id="published"
                name="published"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={params.published || "all"}
              >
                <option value="all">Tous</option>
                <option value="true">Publié</option>
                <option value="false">Brouillon</option>
              </select>
            </div>
            <div className="w-48">
              <label
                htmlFor="consultant"
                className="mb-1 block text-sm font-medium"
              >
                Consultante
              </label>
              <select
                id="consultant"
                name="consultant"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={params.consultant || ""}
              >
                <option value="">Toutes</option>
                {consultantOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.profiles
                      ? `${c.profiles.first_name ?? ""} ${c.profiles.last_name ?? ""}`.trim()
                      : c.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Titre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Consultante</TableHead>
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
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Aucune formation trouvée
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((formation) => {
                  const typeConfig =
                    TYPE_CONFIG[formation.type] ?? TYPE_CONFIG.online;
                  const consultantName = formation.consultants?.profiles
                    ? `${formation.consultants.profiles.first_name ?? ""} ${formation.consultants.profiles.last_name ?? ""}`.trim()
                    : "—";

                  const regCount = regCounts.get(formation.id) ?? 0;
                  const spotsLabel = formation.max_participants
                    ? `${regCount}/${formation.max_participants}`
                    : `${regCount}`;

                  const isPast = new Date(formation.ends_at) < new Date();

                  return (
                    <TableRow key={formation.id} className={isPast ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium truncate" title={formation.title}>{formation.title}</p>
                          <p className="text-xs text-muted-foreground truncate" title={`/formations/${formation.slug}`}>
                            /formations/{formation.slug}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeConfig.variant} className="gap-1">
                          <TypeIcon type={formation.type} />
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          {format(new Date(formation.starts_at), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(formation.starts_at), "HH'h'mm", {
                            locale: fr,
                          })}{" "}
                          –{" "}
                          {format(new Date(formation.ends_at), "HH'h'mm", {
                            locale: fr,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="block truncate" title={consultantName}>
                          {consultantName}
                        </span>
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
                        <div className="flex justify-end gap-2">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Modifier"
                          >
                            <Link
                              href={`/admin/formations/${formation.id}/edit`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
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

export default AdminFormationsPage;

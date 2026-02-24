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
import { Plus, Pencil, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Gestion des formations",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  published: { label: "Publiée", variant: "default" },
  archived: { label: "Archivée", variant: "outline" },
};

const formatPrice = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

type Props = {
  searchParams: Promise<{
    status?: string;
    consultant?: string;
    q?: string;
  }>;
};

const AdminFormationsPage = async ({ searchParams }: Props) => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");

  const params = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("formations")
    .select(
      `
      id,
      title,
      slug,
      status,
      price_cents,
      created_at,
      published_at,
      consultant_id,
      consultants!formations_consultant_id_fkey (
        id,
        profiles!consultants_id_fkey (
          first_name,
          last_name
        )
      )
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.consultant) {
    query = query.eq("consultant_id", params.consultant);
  }

  if (params.q) {
    query = query.ilike("title", `%${params.q}%`);
  }

  const { data: formations, error: formationsError } = await query;

  const { data: consultants } = await supabase
    .from("consultants")
    .select("id, profiles!consultants_id_fkey(first_name, last_name)")
    .eq("is_active", true);

  type FormationRow = {
    id: string;
    title: string;
    slug: string;
    status: string;
    price_cents: number;
    created_at: string;
    published_at: string | null;
    consultant_id: string;
    consultants: {
      id: string;
      profiles: { first_name: string | null; last_name: string | null } | null;
    } | null;
  };

  type ConsultantOption = {
    id: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  };

  const rows = (formations ?? []) as unknown as FormationRow[];
  const consultantOptions = (
    (consultants ?? []) as unknown as ConsultantOption[]
  ).sort((a, b) => {
    const aName = `${a.profiles?.last_name ?? ""} ${a.profiles?.first_name ?? ""}`.trim();
    const bName = `${b.profiles?.last_name ?? ""} ${b.profiles?.first_name ?? ""}`.trim();
    return aName.localeCompare(bName);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Formations
        </h1>
        <Button asChild className="bg-primary-red hover:bg-primary-red-dark">
          <Link href="/admin/formations/nouveau" tabIndex={0}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle formation
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <form className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="search"
                className="mb-1 block text-sm font-medium"
              >
                Recherche
              </label>
              <Input
                id="search"
                name="q"
                placeholder="Rechercher par titre..."
                defaultValue={params.q ?? ""}
              />
            </div>
            <div>
              <label
                htmlFor="status-filter"
                className="mb-1 block text-sm font-medium"
              >
                Statut
              </label>
              <select
                id="status-filter"
                name="status"
                defaultValue={params.status ?? "all"}
                className="h-9 rounded-md border bg-white px-3 text-sm"
              >
                <option value="all">Tous</option>
                <option value="draft">Brouillon</option>
                <option value="published">Publiée</option>
                <option value="archived">Archivée</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="consultant-filter"
                className="mb-1 block text-sm font-medium"
              >
                Consultante
              </label>
              <select
                id="consultant-filter"
                name="consultant"
                defaultValue={params.consultant ?? ""}
                className="h-9 rounded-md border bg-white px-3 text-sm"
              >
                <option value="">Toutes</option>
                {consultantOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.profiles?.first_name ?? ""} {c.profiles?.last_name ?? ""}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline" size="sm">
              Filtrer
            </Button>
          </form>
        </CardContent>
      </Card>

      {formationsError && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Erreur lors du chargement des formations : {formationsError.message}
        </p>
      )}

      {/* Table */}
      {rows.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Consultante</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((formation) => {
                const config =
                  STATUS_CONFIG[formation.status] ?? STATUS_CONFIG.draft;
                const consultantName = formation.consultants?.profiles
                  ? `${formation.consultants.profiles.first_name ?? ""} ${formation.consultants.profiles.last_name ?? ""}`.trim()
                  : "—";

                return (
                  <TableRow key={formation.id}>
                    <TableCell>
                      <Link
                        href={`/admin/formations/${formation.id}/edit`}
                        className="font-medium text-primary-green hover:underline"
                        tabIndex={0}
                      >
                        {formation.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {consultantName}
                    </TableCell>
                    <TableCell>{formatPrice(formation.price_cents)}</TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(
                        new Date(formation.created_at),
                        "d MMM yyyy",
                        { locale: fr }
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            href={`/admin/formations/${formation.id}/preview`}
                            tabIndex={0}
                            aria-label={`Preview ${formation.title}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            href={`/admin/formations/${formation.id}/edit`}
                            tabIndex={0}
                            aria-label={`Modifier ${formation.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucune formation trouvée. Créez-en une !
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminFormationsPage;

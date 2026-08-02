import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Pencil, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FormationStatusToggle } from "./_components/formation-status-toggle";
import { DuplicateFormationButton } from "./_components/duplicate-formation-button";

export const metadata: Metadata = {
  title: "Gestion des accompagnements",
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
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

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
      ),
      formation_sections (
        id,
        formation_blocks ( id )
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
    formation_sections: { id: string; formation_blocks: { id: string }[] }[];
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
          Accompagnements
        </h1>
        <Button asChild className="bg-primary-red hover:bg-primary-red-dark">
          <Link href="/admin/formations/nouveau" tabIndex={0}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel accompagnement
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <form className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-50">
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
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </form>
        </CardContent>
      </Card>

      {formationsError && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Erreur lors du chargement des accompagnements : {formationsError.message}
        </p>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Titre</TableHead>
                <TableHead>Consultante</TableHead>
                <TableHead>Contenu</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun accompagnement trouvé. Créez-en un !
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((formation) => {
                  const consultantName = formation.consultants?.profiles
                    ? `${formation.consultants.profiles.first_name ?? ""} ${formation.consultants.profiles.last_name ?? ""}`.trim()
                    : "—";

                  const sectionCount = formation.formation_sections?.length ?? 0;
                  const blockCount =
                    formation.formation_sections?.reduce(
                      (acc, s) => acc + (s.formation_blocks?.length ?? 0),
                      0
                    ) ?? 0;

                  return (
                    <TableRow key={formation.id}>
                      <TableCell>
                        <Link
                          href={`/admin/formations/${formation.id}/edit`}
                          className="font-medium text-primary-green hover:underline truncate block"
                          tabIndex={0}
                          title={formation.title}
                        >
                          {formation.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="block truncate" title={consultantName}>
                          {consultantName}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sectionCount > 0 || blockCount > 0 ? (
                          <span>
                            {sectionCount} sec. · {blockCount} leç.
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/60">
                            Vide
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatPrice(formation.price_cents)}</TableCell>
                      <TableCell>
                        <FormationStatusToggle
                          formationId={formation.id}
                          currentStatus={
                            (formation.status as "draft" | "published" | "archived") ??
                            "draft"
                          }
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(formation.created_at), "d MMM yyyy", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="ghost" size="icon">
                            <Link
                              href={`/accompagnements/${formation.slug}`}
                              target="_blank"
                              tabIndex={0}
                              aria-label={`Voir ${formation.title} sur le site`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DuplicateFormationButton
                            formationId={formation.id}
                            formationTitle={formation.title}
                          />
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

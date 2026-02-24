import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Eye, Users } from "lucide-react";
import { ConsultantActiveToggle } from "./_components/consultant-active-toggle";

export const metadata: Metadata = {
  title: "Gestion des consultantes",
};

type SearchParams = Promise<{ search?: string; status?: string }>;

const ConsultantesPage = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/admin");

  const { search, status } = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("consultants")
    .select(
      `
      id,
      slug,
      bio,
      specialties,
      commission_rate,
      is_active,
      stripe_account_status,
      created_at,
      profiles!consultants_id_fkey (
        first_name,
        last_name,
        email,
        avatar_url
      )
    `
    )
    .order("created_at", { ascending: false });

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data: consultants } = await query;

  const filtered = search
    ? (consultants ?? []).filter((c) => {
        const profile = c.profiles as unknown as {
          first_name: string | null;
          last_name: string | null;
          email: string;
        } | null;
        const fullName =
          `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.toLowerCase();
        const email = profile?.email?.toLowerCase() ?? "";
        const q = search.toLowerCase();
        return fullName.includes(q) || email.includes(q);
      })
    : (consultants ?? []);

  const activeCount = (consultants ?? []).filter((c) => c.is_active).length;
  const totalCount = consultants?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            Gestion des consultantes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount} consultante{totalCount > 1 ? "s" : ""} &middot;{" "}
            {activeCount} active{activeCount > 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild className="bg-primary-red hover:bg-primary-red-dark">
          <Link href="/admin/consultantes/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Promouvoir un utilisateur
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-primary-green">
              <Users className="h-5 w-5" />
              Consultantes
            </CardTitle>
            <div className="flex gap-2">
              <form className="flex gap-2">
                <input
                  type="text"
                  name="search"
                  placeholder="Rechercher par nom ou email..."
                  defaultValue={search ?? ""}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  aria-label="Rechercher une consultante"
                />
                <select
                  name="status"
                  defaultValue={status ?? "all"}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  aria-label="Filtrer par statut"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actives</option>
                  <option value="inactive">Inactives</option>
                </select>
                <Button type="submit" variant="outline" size="sm">
                  Filtrer
                </Button>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Aucune consultante trouvée.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Spécialités</TableHead>
                  <TableHead>Stripe</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((consultant) => {
                  const profile = consultant.profiles as unknown as {
                    first_name: string | null;
                    last_name: string | null;
                    email: string;
                    avatar_url: string | null;
                  } | null;

                  const fullName =
                    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
                    "Sans nom";

                  return (
                    <TableRow key={consultant.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/consultantes/${consultant.id}`}
                          className="hover:text-primary-red hover:underline"
                        >
                          {fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {profile?.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(consultant.specialties ?? [])
                            .slice(0, 3)
                            .map((spec: string) => (
                              <Badge key={spec} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          {(consultant.specialties ?? []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(consultant.specialties as string[]).length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StripeStatusBadge
                          status={consultant.stripe_account_status}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {consultant.commission_rate}%
                      </TableCell>
                      <TableCell className="text-center">
                        <ConsultantActiveToggle
                          id={consultant.id}
                          isActive={consultant.is_active ?? false}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/consultantes/${consultant.id}`}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StripeStatusBadge = ({ status }: { status: string | null }) => {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Connecté", variant: "default" },
    pending: { label: "En attente", variant: "secondary" },
    restricted: { label: "Restreint", variant: "destructive" },
  };

  const config = statusMap[status ?? "pending"] ?? {
    label: "Non configuré",
    variant: "outline" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default ConsultantesPage;

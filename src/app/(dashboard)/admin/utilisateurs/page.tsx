import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES } from "@/constants/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { UserRowActions } from "./_components/user-row-actions";
import type { UserRole } from "@/types/database";

export const metadata: Metadata = {
  title: "Gestion des utilisateurs",
};

type SearchParams = Promise<{ search?: string; role?: string }>;

export type ProfileRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: UserRole[];
  created_at: string;
};

const FILTERABLE_ROLES: (keyof typeof ROLES)[] = [
  "client",
  "consultant",
  "consultant_limited",
  "marketing_manager",
  "admin",
];

const UtilisateursPage = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const currentUser = await getSessionUser();
  if (!currentUser || !currentUser.roles.includes("admin")) redirect("/admin");

  const { search, role } = await searchParams;

  const supabase = createAdminClient();

  let query = supabase
    .from("profiles")
    .select("id, email, first_name, last_name, roles, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (role && role !== "all") {
    query = query.contains("roles", [role]);
  }

  if (search && search.trim().length >= 2) {
    const q = search.trim();
    query = query.or(
      `email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`
    );
  }

  const { data } = await query;
  const users = (data ?? []) as ProfileRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Gestion des utilisateurs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {users.length} utilisateur{users.length > 1 ? "s" : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-primary-green">
              <Users className="h-5 w-5" />
              Utilisateurs
            </CardTitle>
            <form className="flex flex-wrap gap-2">
              <Input
                type="text"
                name="search"
                defaultValue={search ?? ""}
                placeholder="Rechercher par nom ou email..."
                className="w-64"
                aria-label="Rechercher un utilisateur"
              />
              <select
                name="role"
                defaultValue={role ?? "all"}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                aria-label="Filtrer par rôle"
              >
                <option value="all">Tous les rôles</option>
                {FILTERABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLES[r].label}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">
                Filtrer
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Aucun utilisateur trouvé.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôles</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((platformUser) => {
                  const fullName =
                    `${platformUser.first_name ?? ""} ${platformUser.last_name ?? ""}`.trim() ||
                    "Sans nom";

                  return (
                    <TableRow key={platformUser.id}>
                      <TableCell className="font-medium">{fullName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {platformUser.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {platformUser.roles.map((r) => (
                            <Badge key={r} variant="secondary">
                              {ROLES[r]?.label ?? r}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(platformUser.created_at).toLocaleDateString(
                          "fr-FR",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserRowActions
                          user={platformUser}
                          isCurrentAdmin={platformUser.id === currentUser.id}
                        />
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

export default UtilisateursPage;
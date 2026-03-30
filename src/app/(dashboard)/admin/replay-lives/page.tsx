import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Pencil, ExternalLink } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Replay Lives",
};

const AdminReplayLivesPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const supabase = createAdminClient();
  const { data: lives } = await supabase
    .from("replay_lives")
    .select("*")
    .order("live_date", { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Replay Lives</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez les replays des ateliers mensuels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/replay-lives" target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Voir la page
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/replay-lives/nouveau">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un replay
            </Link>
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lives?.length ?? 0} replay{(lives?.length ?? 0) > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!lives || lives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">Aucun replay pour l&apos;instant.</p>
              <Button className="mt-4" asChild>
                <Link href="/admin/replay-lives/nouveau">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter le premier replay
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Date du live</TableHead>
                  <TableHead>URL Vimeo</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lives.map((live, index) => (
                  <TableRow key={live.id}>
                    <TableCell className="font-medium">
                      {live.title}
                      {index === 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-primary-red/10 px-2 py-0.5 text-xs font-medium text-primary-red">
                          Dernier
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(live.live_date), "d MMMM yyyy", {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                      {live.vimeo_url}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/replay-lives/${live.id}/edit`}>
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

export default AdminReplayLivesPage;

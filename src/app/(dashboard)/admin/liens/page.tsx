import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BioLink } from "@/types/database";
import { BioLinksManager } from "./_components/bio-links-manager";

export const metadata: Metadata = {
  title: "Page de liens",
};

const AdminLiensPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bio_links")
    .select("*")
    .order("position", { ascending: true });

  const links = (data ?? []) as BioLink[];
  const linkCount = links.filter((link) => link.kind === "link").length;
  const totalClicks = links.reduce((sum, link) => sum + link.click_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Page de liens
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            La page partagée en bio Instagram. Elle n&apos;apparaît ni dans le
            menu, ni dans les moteurs de recherche.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/liens" target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Voir la page
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/liens/nouveau">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline gap-3">
            <span>
              {linkCount} lien{linkCount > 1 ? "s" : ""}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {totalClicks} clic{totalClicks > 1 ? "s" : ""} au total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Aucun lien pour l&apos;instant.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/admin/liens/nouveau">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter le premier lien
                </Link>
              </Button>
            </div>
          ) : (
            <BioLinksManager links={links} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLiensPage;

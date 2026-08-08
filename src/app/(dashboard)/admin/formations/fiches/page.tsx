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
import { Plus, Pencil, ArrowLeft } from "lucide-react";
import { FORMATION_CATEGORY_CONFIG } from "@/config/formation-categories";
import type { FormationCategory } from "@/types";

export const metadata: Metadata = {
  title: "Fiches de formation",
};

/** Sections attendues sur une fiche : sert a signaler celles qui sont incompletes. */
const CONTENT_COLUMNS = [
  "summary_html",
  "objectives_html",
  "program_html",
  "audience_html",
] as const;

const AdminFormationTemplatesPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const supabase = createAdminClient();
  const [templatesResult, formationsResult] = await Promise.all([
    supabase
      .from("formation_templates")
      .select(
        "id, title, slug, category, badge, summary_html, objectives_html, program_html, audience_html",
      )
      .order("title"),
    supabase.from("formations").select("template_id"),
  ]);

  type TemplateRow = {
    id: string;
    title: string;
    slug: string;
    category: FormationCategory;
    badge: string | null;
  } & Record<(typeof CONTENT_COLUMNS)[number], string | null>;

  const templates = (templatesResult.data ?? []) as unknown as TemplateRow[];

  const attachedCounts = new Map<string, number>();
  for (const row of formationsResult.data ?? []) {
    if (!row.template_id) continue;
    attachedCounts.set(
      row.template_id,
      (attachedCounts.get(row.template_id) ?? 0) + 1,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/formations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary-green">
              Fiches de formation
            </h1>
            <p className="text-sm text-muted-foreground">
              Le contenu éditorial vit ici, une seule fois, et s&apos;affiche
              sur toutes les sessions rattachées.
            </p>
          </div>
        </div>
        <Button asChild className="bg-primary-red hover:bg-primary-red-dark">
          <Link href="/admin/formations/fiches/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle fiche
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Sections remplies</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Aucune fiche pour le moment.
                  </TableCell>
                </TableRow>
              )}
              {templates.map((template) => {
                const filled = CONTENT_COLUMNS.filter(
                  (column) => template[column],
                ).length;
                const attached = attachedCounts.get(template.id) ?? 0;

                return (
                  <TableRow key={template.id}>
                    <TableCell>
                      <Link
                        href={`/admin/formations/fiches/${template.id}/edit`}
                        className="font-medium hover:underline"
                      >
                        {template.title}
                      </Link>
                      {template.badge && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {template.badge}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {FORMATION_CATEGORY_CONFIG[template.category]
                          ?.filterLabel ?? template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          filled === CONTENT_COLUMNS.length
                            ? ""
                            : "text-amber-700"
                        }
                      >
                        {filled} / {CONTENT_COLUMNS.length}
                      </span>
                    </TableCell>
                    <TableCell>{attached}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          href={`/admin/formations/fiches/${template.id}/edit`}
                        >
                          <Pencil className="h-4 w-4" />
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
    </div>
  );
};

export default AdminFormationTemplatesPage;

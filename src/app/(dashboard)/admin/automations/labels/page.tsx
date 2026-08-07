import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
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
import { ArrowLeft } from "lucide-react";
import { getLabelsWithCounts, getAccompagnements } from "../actions";
import { LabelFormDialog } from "./_components/label-form-dialog";
import { DeleteLabelButton } from "./_components/delete-label-button";

export const metadata: Metadata = {
  title: "Labels - Automations",
};

const AdminLabelsPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const [labels, formations] = await Promise.all([
    getLabelsWithCounts(),
    getAccompagnements(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/automations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            Labels
          </h1>
        </div>
        <LabelFormDialog accompagnements={formations} />
      </div>

      <Card>
        <CardContent className="overflow-hidden p-0">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Nom</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Couleur</TableHead>
                <TableHead>Auto-assignation</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Aucun label. Créez-en un pour cibler votre audience.
                  </TableCell>
                </TableRow>
              ) : (
                labels.map((label) => {
                  const rule = label.auto_assign_rule as {
                    trigger?: string;
                    accompagnement_ids?: string[];
                  } | null;
                  const autoAssignDesc = rule?.trigger
                    ? rule.accompagnement_ids?.length
                      ? `À l'achat de ${rule.accompagnement_ids.length} accompagnement(s)`
                      : "À l'achat de tout accompagnement"
                    : "—";

                  return (
                    <TableRow key={label.id}>
                      <TableCell className="font-medium">
                        {label.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {label.slug}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {label.color}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{autoAssignDesc}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {label.contact_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <LabelFormDialog
                            accompagnements={formations}
                            label={label}
                          />
                          <DeleteLabelButton labelId={label.id} />
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

export default AdminLabelsPage;

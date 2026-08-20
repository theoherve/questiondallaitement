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
import { getRecurringDefinitions, getConsultants } from "../actions";
import { describeRecurrence } from "@/lib/admin-workflows/recurrence";
import type { RecurrenceRule } from "@/lib/admin-workflows/types";
import { RecurringFormationFormDialog } from "./_components/recurring-formation-form-dialog";
import { DeleteRecurringDefinitionButton } from "./_components/delete-recurring-definition-button";
import { resolveFormationCategory } from "@/config/formation-categories";

export const metadata: Metadata = {
  title: "Formations récurrentes - Automations",
};

const AdminRecurrentsPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const [definitions, consultants] = await Promise.all([
    getRecurringDefinitions(),
    getConsultants(),
  ]);

  const consultantMap = new Map(consultants.map((c) => [c.id, c.name]));

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
            Formations récurrentes
          </h1>
        </div>
        <RecurringFormationFormDialog consultants={consultants} />
      </div>

      <Card>
        <CardContent className="overflow-hidden p-0">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%]">Titre</TableHead>
                <TableHead className="w-[18%]">Récurrence</TableHead>
                <TableHead className="w-[8%]">Heure</TableHead>
                <TableHead className="w-[14%]">Consultante</TableHead>
                <TableHead className="w-[10%]">Type</TableHead>
                <TableHead className="w-[13%]">Catégorie</TableHead>
                <TableHead className="w-[8%]">Statut</TableHead>
                <TableHead className="w-[7%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {definitions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Aucune définition. Créez-en une pour générer des formations
                    automatiquement.
                  </TableCell>
                </TableRow>
              ) : (
                definitions.map((def) => (
                  <TableRow key={def.id}>
                    <TableCell>
                      <p className="truncate font-medium">{def.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {def.slug_prefix}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm whitespace-normal">
                      {describeRecurrence(
                        def.recurrence_rule as RecurrenceRule,
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {def.time_of_day.slice(0, 5)}
                    </TableCell>
                    <TableCell className="truncate text-sm">
                      {consultantMap.get(def.consultant_id) ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{def.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={resolveFormationCategory(def.category).color}>
                        {resolveFormationCategory(def.category).label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {def.is_active ? (
                        <Badge variant="default">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <RecurringFormationFormDialog
                          consultants={consultants}
                          definition={def}
                        />
                        <DeleteRecurringDefinitionButton id={def.id} title={def.title} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRecurrentsPage;

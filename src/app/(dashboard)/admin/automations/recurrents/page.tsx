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
                <TableHead className="w-[35%]">Titre</TableHead>
                <TableHead>Récurrence</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Consultante</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {definitions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
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
                    <TableCell className="text-sm">
                      {describeRecurrence(
                        def.recurrence_rule as RecurrenceRule,
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {def.time_of_day.slice(0, 5)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {consultantMap.get(def.consultant_id) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{def.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {def.is_active ? (
                        <Badge variant="default">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
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

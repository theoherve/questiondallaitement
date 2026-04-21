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
import { Plus, Pencil, Tag, Repeat, Zap } from "lucide-react";
import { getWorkflows, getLabels, getRecurringDefinitions } from "./actions";
import { WorkflowToggle } from "./_components/workflow-toggle";

export const metadata: Metadata = {
  title: "Automations",
};

const TRIGGER_LABELS: Record<string, string> = {
  recurring_event: "Événement récurrent",
  formation_enrolled: "Achat accompagnement",
  manual: "Manuel",
};

const AdminAutomationsPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const [workflows, labels, recurringDefs] = await Promise.all([
    getWorkflows(),
    getLabels(),
    getRecurringDefinitions(),
  ]);

  const labelMap = new Map(labels.map((l) => [l.id, l]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Automations
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/automations/labels">
              <Tag className="mr-2 h-4 w-4" />
              Labels
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/automations/recurrents">
              <Repeat className="mr-2 h-4 w-4" />
              Événements récurrents
            </Link>
          </Button>
          <Button asChild className="bg-primary-red hover:bg-primary-red-dark">
            <Link href="/admin/automations/nouveau">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau workflow
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Zap className="h-8 w-8 text-primary-green" />
            <div>
              <p className="text-2xl font-bold">{workflows.length}</p>
              <p className="text-sm text-muted-foreground">Workflows</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Tag className="h-8 w-8 text-primary-green" />
            <div>
              <p className="text-2xl font-bold">{labels.length}</p>
              <p className="text-sm text-muted-foreground">Labels</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Repeat className="h-8 w-8 text-primary-green" />
            <div>
              <p className="text-2xl font-bold">{recurringDefs.length}</p>
              <p className="text-sm text-muted-foreground">
                Événements récurrents
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows Table */}
      <Card>
        <CardContent className="overflow-hidden p-0">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Nom</TableHead>
                <TableHead>Déclencheur</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Étapes</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Aucun workflow. Créez-en un pour commencer.
                  </TableCell>
                </TableRow>
              ) : (
                workflows.map((wf) => {
                  const audienceConfig = wf.audience_config as {
                    label_ids?: string[];
                    match?: string;
                  };
                  const audienceLabels = (audienceConfig.label_ids ?? [])
                    .map((id) => labelMap.get(id)?.name)
                    .filter(Boolean);

                  return (
                    <TableRow key={wf.id}>
                      <TableCell>
                        <p className="truncate font-medium">{wf.name}</p>
                        {wf.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {wf.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TRIGGER_LABELS[wf.trigger_type] ?? wf.trigger_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {audienceLabels.map((name) => (
                            <Badge key={name} variant="secondary">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{wf.steps_count}</TableCell>
                      <TableCell>
                        <WorkflowToggle
                          workflowId={wf.id}
                          isActive={wf.is_active}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="Modifier"
                        >
                          <Link href={`/admin/automations/${wf.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
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

export default AdminAutomationsPage;

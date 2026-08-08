"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type {
  AdminWorkflowLog,
  ScheduledWorkflowAction,
} from "@/lib/admin-workflows/types";

type Props = {
  logs: AdminWorkflowLog[];
  scheduledActions: (ScheduledWorkflowAction & { profile_email?: string })[];
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "En attente", variant: "secondary" },
  in_progress: { label: "En cours", variant: "outline" },
  completed: { label: "Terminé", variant: "default" },
  partial: { label: "Partiel", variant: "outline" },
  executed: { label: "Exécuté", variant: "default" },
  failed: { label: "Échoué", variant: "destructive" },
  skipped: { label: "Ignoré", variant: "secondary" },
};

export const WorkflowLogs = ({ logs, scheduledActions }: Props) => {
  return (
    <div className="space-y-6">
      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique d&apos;exécution</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Planifiées</TableHead>
                <TableHead>Exécutées</TableHead>
                <TableHead>Échouées</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Aucune exécution
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.pending;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), "d MMM yyyy HH:mm", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>{log.actions_scheduled}</TableCell>
                      <TableCell>{log.actions_executed}</TableCell>
                      <TableCell>
                        {log.actions_failed > 0 ? (
                          <span className="text-destructive">
                            {log.actions_failed}
                          </span>
                        ) : (
                          0
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Scheduled Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions planifiées</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Prévu pour</TableHead>
                <TableHead>Exécuté le</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduledActions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Aucune action planifiée
                  </TableCell>
                </TableRow>
              ) : (
                scheduledActions.map((action) => {
                  const cfg =
                    STATUS_CONFIG[action.status] ?? STATUS_CONFIG.pending;
                  return (
                    <TableRow key={action.id}>
                      <TableCell className="text-sm">
                        {action.profile_email ?? action.profile_id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(
                          new Date(action.scheduled_for),
                          "d MMM yyyy HH:mm",
                          { locale: fr },
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {action.executed_at
                          ? format(
                              new Date(action.executed_at),
                              "d MMM yyyy HH:mm",
                              { locale: fr },
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
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

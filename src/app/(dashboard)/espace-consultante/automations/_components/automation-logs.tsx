"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Log = {
  id: string;
  automation_id: string;
  trigger_data: Record<string, unknown>;
  result: { actions?: { action: string; success: boolean; error?: string }[] };
  status: string;
  executed_at: string;
};

type AutomationLogsProps = {
  logs: Log[];
};

export const AutomationLogs = ({ logs }: AutomationLogsProps) => {
  if (logs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg">
          Dernières exécutions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const clientName =
                (log.trigger_data?.client_name as string) ??
                (log.trigger_data?.client_email as string) ??
                ",";
              const actions = log.result?.actions ?? [];

              return (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(log.executed_at), "d MMM yyyy HH:mm", {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell>{clientName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.status === "success"
                          ? "default"
                          : log.status === "partial"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {log.status === "success"
                        ? "Succès"
                        : log.status === "partial"
                          ? "Partiel"
                          : "Échec"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {actions.map((a, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className={
                            a.success ? "border-green-500" : "border-destructive"
                          }
                        >
                          {a.action}
                          {!a.success && a.error && `: ${a.error}`}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

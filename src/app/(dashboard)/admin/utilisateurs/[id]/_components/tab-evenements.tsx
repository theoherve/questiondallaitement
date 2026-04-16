import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EventRegistration = {
  id: string;
  registered_at: string;
  status: string;
  events: {
    title: string;
    starts_at: string;
    type: string;
  } | null;
};

const STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  confirmed: { label: "Confirmée", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

const TYPE_MAP: Record<string, string> = {
  online: "En ligne",
  in_person: "Présentiel",
  hybrid: "Hybride",
};

export const TabEvenements = ({
  registrations,
}: {
  registrations: EventRegistration[];
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary-green">
          Événements ({registrations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune inscription à un événement.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Événement</TableHead>
                <TableHead>Date événement</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((r) => {
                const s = STATUS_MAP[r.status] ?? {
                  label: r.status,
                  variant: "outline" as const,
                };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.events?.title ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.events?.starts_at
                        ? new Date(r.events.starts_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {r.events?.type
                        ? (TYPE_MAP[r.events.type] ?? r.events.type)
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(r.registered_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

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

type FormationRegistration = {
  id: string;
  registered_at: string;
  status: string;
  formations: {
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

export const TabFormations = ({
  registrations,
}: {
  registrations: FormationRegistration[];
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary-green">
          Formations ({registrations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune inscription à une formation.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Formation</TableHead>
                <TableHead>Date formation</TableHead>
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
                      {r.formations?.title ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.formations?.starts_at
                        ? new Date(r.formations.starts_at).toLocaleDateString(
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
                      {r.formations?.type
                        ? (TYPE_MAP[r.formations.type] ?? r.formations.type)
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

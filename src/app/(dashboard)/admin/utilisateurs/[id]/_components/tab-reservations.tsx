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

type Booking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  location: string;
  consultation_types: { title: string } | null;
  consultant: { first_name: string | null; last_name: string | null } | null;
};

const STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  confirmed: { label: "Confirmée", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  cancelled: { label: "Annulée", variant: "destructive" },
  completed: { label: "Terminée", variant: "outline" },
  no_show: { label: "Absent", variant: "destructive" },
};

const LOCATION_MAP: Record<string, string> = {
  cabinet: "Cabinet",
  teleconsultation: "Téléconsultation",
  domicile: "Domicile",
};

export const TabReservations = ({ bookings }: { bookings: Booking[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary-green">
          Réservations ({bookings.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune réservation.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Consultante</TableHead>
                <TableHead>Lieu</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const s = STATUS_MAP[b.status] ?? {
                  label: b.status,
                  variant: "outline" as const,
                };
                const consultantName = b.consultant
                  ? `${b.consultant.first_name ?? ""} ${b.consultant.last_name ?? ""}`.trim() ||
                    "—"
                  : "—";

                return (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(b.starts_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      {b.consultation_types?.title ?? "—"}
                    </TableCell>
                    <TableCell>{consultantName}</TableCell>
                    <TableCell>
                      {LOCATION_MAP[b.location] ?? b.location}
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

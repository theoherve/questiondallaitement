import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ConsultationNoteSummary } from "../../../crm/actions";

export const PreviousNotesPanel = ({
  notes,
  currentBookingId,
}: {
  notes: ConsultationNoteSummary[];
  currentBookingId: string;
}) => {
  const otherNotes = notes.filter((n) => n.booking_id !== currentBookingId);

  if (otherNotes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune autre fiche de consultation pour ce client.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {otherNotes.map((note) => (
        <li key={note.id}>
          <Link
            href={`/espace-consultante/reservations/${note.booking_id}`}
            className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
          >
            <span className="line-clamp-1">{note.motif || "(motif non renseigné)"}</span>
            <span className="ml-3 flex shrink-0 items-center gap-2 text-muted-foreground">
              {format(new Date(note.booking_starts_at), "d MMM yyyy", { locale: fr })}
              <Badge variant={note.status === "published" ? "default" : "secondary"}>
                {note.status === "published" ? "Publiée" : "Brouillon"}
              </Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

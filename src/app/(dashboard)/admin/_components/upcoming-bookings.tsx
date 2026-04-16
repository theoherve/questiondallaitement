import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

type Booking = {
  id: string;
  starts_at: string;
  status: string;
  client_name: string;
  consultant_name: string;
  consultation_title: string;
};

export const UpcomingBookings = ({ bookings }: { bookings: Booking[] }) => {
  if (bookings.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucune consultation prévue.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div
          key={b.id}
          className="flex items-center gap-3 rounded-lg border p-3"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-red/10">
            <CalendarDays className="h-4 w-4 text-primary-red" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {b.consultation_title}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {b.client_name} avec {b.consultant_name}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-medium">
              {format(new Date(b.starts_at), "d MMM", { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(b.starts_at), "HH:mm")}
            </p>
          </div>
        </div>
      ))}
      <Link
        href="/admin/reservation"
        className="block text-center text-sm text-primary-red hover:underline"
      >
        Voir toutes les réservations
      </Link>
    </div>
  );
};

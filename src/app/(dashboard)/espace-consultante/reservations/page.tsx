import { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  CreditCard,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BookingActions } from "./_components/booking-actions";
import type { BookingStatus } from "@/types/database";

export const metadata: Metadata = {
  title: "Réservations",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "En attente", variant: "secondary" },
  confirmed: { label: "Confirmée", variant: "default" },
  cancelled: { label: "Annulée", variant: "destructive" },
  completed: { label: "Terminée", variant: "outline" },
  no_show: { label: "Absent", variant: "destructive" },
};

const LOCATION_LABELS: Record<string, string> = {
  cabinet: "Cabinet",
  teleconsultation: "Téléconsultation",
  domicile: "Domicile",
};

const PAYMENT_LABELS: Record<string, string> = {
  online: "En ligne",
  on_site: "Sur place",
};

const ConsultantReservationsPage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `
      id, starts_at, ends_at, status, notes, location, payment_method, reason,
      profiles!bookings_client_id_fkey(first_name, last_name, email, phone),
      consultation_types(title, duration_minutes)
    `
    )
    .eq("consultant_id", user.id)
    .order("starts_at", { ascending: false });

  const now = new Date();
  const upcoming = (bookings ?? []).filter(
    (b) =>
      new Date(b.starts_at) >= now &&
      !["cancelled", "completed", "no_show"].includes(b.status)
  );
  const past = (bookings ?? []).filter(
    (b) =>
      new Date(b.starts_at) < now ||
      ["cancelled", "completed", "no_show"].includes(b.status)
  );

  const renderBooking = (
    booking: NonNullable<typeof bookings>[number],
  ) => {
    const client = booking.profiles as unknown as {
      first_name: string | null;
      last_name: string | null;
      email: string;
      phone: string | null;
    } | null;
    const ct = booking.consultation_types as unknown as {
      title: string;
      duration_minutes: number;
    } | null;
    const config = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
    const isPast = new Date(booking.starts_at) < now;

    return (
      <Card
        key={booking.id}
        data-testid="booking-card"
        data-booking-id={booking.id}
        data-status={booking.status}
      >
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-primary-green">
                  {ct?.title}
                </h3>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {client &&
                    `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(new Date(booking.starts_at), "d MMM yyyy", {
                    locale: fr,
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(booking.starts_at), "HH'h'mm", {
                    locale: fr,
                  })}
                </span>
                {booking.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {LOCATION_LABELS[booking.location] ?? booking.location}
                  </span>
                )}
                {booking.payment_method && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    {PAYMENT_LABELS[booking.payment_method] ??
                      booking.payment_method}
                  </span>
                )}
              </div>

              {booking.reason && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Motif :</span> {booking.reason}
                </p>
              )}
            </div>

            <Button asChild variant="ghost" size="icon">
              <Link
                href={`/espace-consultante/reservations/${booking.id}`}
                aria-label="Voir le détail"
                tabIndex={0}
              >
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-3">
            <BookingActions
              bookingId={booking.id}
              status={booking.status as BookingStatus}
              isPast={isPast}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Réservations
      </h1>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            À venir ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">Passées ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {upcoming.length > 0 ? (
            upcoming.map((b) => renderBooking(b))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune réservation à venir
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-4 space-y-4">
          {past.length > 0 ? (
            past.map((b) => renderBooking(b))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune réservation passée
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsultantReservationsPage;

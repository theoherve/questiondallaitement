import { Metadata } from "next";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Clock, MapPin, Video } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { CancelBookingButton } from "./_components/cancel-booking-button";
import { features } from "@/config/features";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mes réservations",
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

const ClientReservationsPage = async () => {
  if (!features.bookingEnabled) {
    redirect("/espace-client");
  }

  const { supabase, user } = await getSupabaseAndUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `
      id,
      starts_at,
      ends_at,
      status,
      location,
      payment_method,
      zoom_join_url,
      reason,
      consultants (
        profiles!consultants_id_fkey (first_name, last_name)
      ),
      consultation_types (
        title,
        duration_minutes
      )
    `
    )
    .eq("client_id", user.id)
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
    booking: NonNullable<typeof bookings>[number]
  ) => {
    const consultant = booking.consultants as unknown as {
      profiles: { first_name: string | null; last_name: string | null } | null;
    } | null;
    const ct = booking.consultation_types as unknown as {
      title: string;
      duration_minutes: number;
    } | null;
    const config = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
    const isFuture = new Date(booking.starts_at) > now;
    const canCancel =
      isFuture && !["cancelled", "completed", "no_show"].includes(booking.status);
    const hoursUntil = differenceInHours(new Date(booking.starts_at), now);

    return (
      <Card key={booking.id}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-primary-green">
                {ct?.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {consultant?.profiles &&
                  `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()}
              </p>
            </div>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(new Date(booking.starts_at), "d MMM yyyy", {
                locale: fr,
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(booking.starts_at), "HH'h'mm", { locale: fr })}
            </span>
            {booking.location && (
              <span className="flex items-center gap-1">
                {booking.location === "teleconsultation" ? (
                  <Video className="h-3.5 w-3.5" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                {LOCATION_LABELS[booking.location] ?? booking.location}
              </span>
            )}
          </div>

          {booking.zoom_join_url && booking.status === "confirmed" && (
            <a
              href={booking.zoom_join_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-medium text-primary-red hover:underline"
              tabIndex={0}
            >
              Rejoindre la visio
            </a>
          )}

          {canCancel && (
            <div className="mt-3">
              <CancelBookingButton
                bookingId={booking.id}
                hoursUntil={hoursUntil}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Mes réservations
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
            upcoming.map(renderBooking)
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
            past.map(renderBooking)
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

export default ClientReservationsPage;

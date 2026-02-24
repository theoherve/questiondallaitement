import { Metadata } from "next";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Réservations",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  confirmed: { label: "Confirmée", variant: "default" },
  cancelled: { label: "Annulée", variant: "destructive" },
  completed: { label: "Terminée", variant: "outline" },
  no_show: { label: "Absent", variant: "destructive" },
};

const ConsultantReservationsPage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id, starts_at, ends_at, status, notes,
      profiles!bookings_client_id_fkey(first_name, last_name, email),
      consultation_types(title, duration_minutes, is_online)
    `)
    .eq("consultant_id", user.id)
    .order("starts_at", { ascending: false });

  const now = new Date();
  const upcoming = (bookings ?? []).filter(
    (b) => new Date(b.starts_at) >= now && !["cancelled", "completed", "no_show"].includes(b.status)
  );
  const past = (bookings ?? []).filter(
    (b) => new Date(b.starts_at) < now || ["cancelled", "completed", "no_show"].includes(b.status)
  );

  const renderBooking = (booking: NonNullable<typeof bookings>[number]) => {
    const client = booking.profiles as unknown as { first_name: string | null; last_name: string | null; email: string } | null;
    const ct = booking.consultation_types as unknown as { title: string; duration_minutes: number; is_online: boolean } | null;
    const config = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;

    return (
      <Card key={booking.id}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-primary-green">{ct?.title}</h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>
                  {client && `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()}
                  {client?.email && ` (${client.email})`}
                </span>
              </div>
            </div>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(new Date(booking.starts_at), "d MMM yyyy", { locale: fr })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(booking.starts_at), "HH'h'mm", { locale: fr })}
            </span>
          </div>
          {booking.notes && (
            <p className="mt-2 text-sm text-muted-foreground italic">
              Note : {booking.notes}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">Réservations</h1>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">À venir ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Passées ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {upcoming.length > 0 ? upcoming.map(renderBooking) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune réservation à venir</CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-4 space-y-4">
          {past.length > 0 ? past.map(renderBooking) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune réservation passée</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsultantReservationsPage;

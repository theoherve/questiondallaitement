import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CalendarDays, Clock, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Réservation confirmée — Question d'Allaitement",
  robots: { index: false },
};

type SearchParams = Promise<{ booking_id?: string }>;

const LOCATION_LABELS: Record<string, string> = {
  cabinet: "Au cabinet",
  teleconsultation: "Téléconsultation",
  domicile: "À domicile",
};

const ConfirmationPage = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const { booking_id } = await searchParams;
  if (!booking_id) notFound();

  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id,
      starts_at,
      ends_at,
      status,
      location,
      payment_method,
      reason,
      consultation_types (
        title,
        duration_minutes
      ),
      consultants (
        profiles (
          first_name,
          last_name
        )
      )
    `
    )
    .eq("id", booking_id)
    .single();

  if (!booking) {
    // The Stripe webhook hasn't fired yet — the booking will be created shortly.
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-6 font-serif text-2xl font-bold text-primary-green sm:text-3xl">
          Paiement reçu
        </h1>
        <p className="mt-2 text-muted-foreground">
          Votre paiement a bien été enregistré. Votre rendez-vous est en cours de confirmation — vous recevrez un email dans quelques instants.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
          <Button asChild className="bg-primary-red hover:bg-primary-red-dark">
            <Link href="/reserver">Nouvelle réservation</Link>
          </Button>
        </div>
      </div>
    );
  }

  const consultationType = booking.consultation_types as unknown as {
    title: string;
    duration_minutes: number;
  } | null;

  const consultantProfile = (
    booking.consultants as unknown as {
      profiles: { first_name: string | null; last_name: string | null } | null;
    } | null
  )?.profiles;

  const consultantName = consultantProfile
    ? `${consultantProfile.first_name ?? ""} ${consultantProfile.last_name ?? ""}`.trim()
    : "Consultante";

  const startsAt = new Date(booking.starts_at);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-500" />

      <h1 className="mt-6 font-serif text-2xl font-bold text-primary-green sm:text-3xl">
        Réservation enregistrée
      </h1>
      <p className="mt-2 text-muted-foreground">
        {booking.payment_method === "online" && booking.status === "confirmed"
          ? "Votre paiement a été confirmé."
          : booking.payment_method === "on_site"
            ? "La consultante confirmera votre rendez-vous prochainement."
            : "Votre réservation est en cours de traitement."}
      </p>

      <Card className="mt-8 text-left">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary-green/50" />
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium text-primary-green">
                {format(startsAt, "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary-green/50" />
            <div>
              <p className="text-xs text-muted-foreground">Heure</p>
              <p className="font-medium text-primary-green">
                {format(startsAt, "HH:mm")} —{" "}
                {consultationType?.duration_minutes ?? 60} min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary-green/50" />
            <div>
              <p className="text-xs text-muted-foreground">Consultante</p>
              <p className="font-medium text-primary-green">{consultantName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary-green/50" />
            <div>
              <p className="text-xs text-muted-foreground">Lieu</p>
              <p className="font-medium text-primary-green">
                {LOCATION_LABELS[booking.location] ?? booking.location}
              </p>
            </div>
          </div>
          {consultationType && (
            <div className="border-t pt-3">
              <Badge variant="secondary">{consultationType.title}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        Un email de confirmation vous a été envoyé. Vérifiez vos spams si vous ne le voyez pas.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
        <Button asChild className="bg-primary-red hover:bg-primary-red-dark">
          <Link href="/reserver">Nouvelle réservation</Link>
        </Button>
      </div>
    </div>
  );
};

export default ConfirmationPage;

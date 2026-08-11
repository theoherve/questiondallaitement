import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BookingActions } from "../_components/booking-actions";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";
import type { BookingStatus } from "@/types/database";

export const metadata: Metadata = {
  title: "Détail de la réservation",
};

type Props = {
  params: Promise<{ id: string }>;
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
  cabinet: "Au cabinet",
  teleconsultation: "Téléconsultation",
  domicile: "À domicile",
};

const PAYMENT_LABELS: Record<string, string> = {
  online: "Paiement en ligne (Stripe)",
  on_site: "Paiement sur place",
};

const formatPrice = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const BookingDetailPage = async ({ params }: Props) => {
  const { id } = await params;
  const { supabase, user } = await getSupabaseAndUser();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      *,
      profiles!bookings_client_id_fkey(first_name, last_name, email, phone, avatar_url),
      consultation_types(title, duration_minutes, price_cents, description),
      payments(id, amount_cents, platform_fee_cents, status, stripe_payment_intent_id, created_at)
    `
    )
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  if (!booking) notFound();

  const client = booking.profiles as unknown as {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;

  const ct = booking.consultation_types as unknown as {
    title: string;
    duration_minutes: number;
    price_cents: number;
    description: string | null;
  } | null;

  const payments = (
    booking.payments as unknown as {
      id: string;
      amount_cents: number;
      platform_fee_cents: number;
      status: string;
      stripe_payment_intent_id: string | null;
      created_at: string;
    }[]
  ) ?? [];

  const config = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const clientName = client
    ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
    : "Client";
  const isPast = new Date(booking.starts_at) < new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link
            href="/espace-consultante/reservations"
            aria-label="Retour aux réservations"
            tabIndex={0}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Réservation
        </h1>
        <Badge variant={config.variant} className="ml-auto">
          {config.label}
        </Badge>
      </div>

      {/* Consultation info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Consultation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <CalendarDays className="h-4 w-4 text-primary-green/50" />
            <span className="font-medium text-primary-green">
              {format(new Date(booking.starts_at), "EEEE d MMMM yyyy", {
                locale: fr,
              })}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-primary-green/50" />
            <span>
              {format(new Date(booking.starts_at), "HH:mm")} ,{" "}
              {format(new Date(booking.ends_at), "HH:mm")} (
              {ct?.duration_minutes ?? 60} min)
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-primary-green/50" />
            <span>
              {LOCATION_LABELS[booking.location] ?? booking.location}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CreditCard className="h-4 w-4 text-primary-green/50" />
            <span>
              {PAYMENT_LABELS[booking.payment_method] ??
                booking.payment_method}
            </span>
          </div>
          {ct && (
            <div className="border-t pt-3">
              <p className="font-medium text-primary-green">{ct.title}</p>
              {ct.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {ct.description}
                </p>
              )}
              <p className="mt-1 text-sm font-medium">
                {formatPrice(ct.price_cents)}
              </p>
            </div>
          )}
          {!isPast && booking.status !== "cancelled" && (
            <div className="border-t pt-3">
              <AddToCalendarButton
                event={{
                  uid: booking.id,
                  title: ct?.title ?? "Consultation d'allaitement",
                  description: clientName ? `Rendez-vous avec ${clientName}` : undefined,
                  location: LOCATION_LABELS[booking.location] ?? booking.location,
                  startsAt: booking.starts_at,
                  endsAt: booking.ends_at,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {client?.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={client.avatar_url}
                alt={clientName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-green/10 text-sm font-bold text-primary-green">
                {(client?.first_name?.[0] ?? "").toUpperCase()}
                {(client?.last_name?.[0] ?? "").toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-primary-green">{clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <a
              href={`mailto:${client?.email}`}
              className="hover:underline"
              tabIndex={0}
            >
              {client?.email}
            </a>
          </div>
          {client?.phone && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <a
                href={`tel:${client.phone}`}
                className="hover:underline"
                tabIndex={0}
              >
                {client.phone}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Motif & notes */}
      {(booking.reason || booking.notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              Motif & notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booking.reason && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Motif
                </p>
                <p className="text-sm text-primary-green">{booking.reason}</p>
              </div>
            )}
            {booking.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Notes internes
                </p>
                <p className="text-sm text-primary-green">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paiement */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium text-primary-green">
                    {formatPrice(payment.amount_cents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Commission plateforme :{" "}
                    {formatPrice(payment.platform_fee_cents)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      payment.status === "succeeded" ? "default" : "secondary"
                    }
                  >
                    {payment.status}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(payment.created_at), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Annulation */}
      {booking.status === "cancelled" && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-destructive">
              Annulation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {booking.cancellation_reason && (
              <p>
                <span className="font-medium">Raison :</span>{" "}
                {booking.cancellation_reason}
              </p>
            )}
            {booking.cancelled_at && (
              <p className="text-muted-foreground">
                Annulée le{" "}
                {format(
                  new Date(booking.cancelled_at),
                  "d MMM yyyy 'à' HH:mm",
                  { locale: fr }
                )}
              </p>
            )}
            {booking.refund_amount_cents != null &&
              booking.refund_amount_cents > 0 && (
                <p>
                  <span className="font-medium">Remboursement :</span>{" "}
                  {formatPrice(booking.refund_amount_cents)}
                </p>
              )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <BookingActions
        bookingId={booking.id}
        status={booking.status as BookingStatus}
        isPast={isPast}
        paymentMethod={booking.payment_method}
        isPaid={payments.some((p) => p.status === "succeeded")}
      />
    </div>
  );
};

export default BookingDetailPage;

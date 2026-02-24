import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, Video, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Props = {
  params: Promise<{ slug: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("title, description")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!data) return { title: "Événement introuvable" };
  return {
    title: data.title,
    description: data.description ?? undefined,
    openGraph: {
      title: data.title,
      description: data.description ?? undefined,
      type: "article",
    },
  };
};

const formatPrice = (cents: number, currency: string): string => {
  if (cents === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
};

const EventDetailPage = async ({ params }: Props) => {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      `
      *,
      consultants (
        slug,
        profiles!consultants_id_fkey (
          first_name,
          last_name,
          avatar_url
        )
      )
    `
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!event) notFound();

  const consultant = event.consultants as unknown as {
    slug: string;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;

  const consultantName = consultant?.profiles
    ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
    : "Consultante";

  const typeLabel =
    event.type === "online"
      ? "En ligne"
      : event.type === "in_person"
        ? "Présentiel"
        : "Hybride";

  const TypeIcon =
    event.type === "online"
      ? Video
      : event.type === "in_person"
        ? MapPin
        : Users;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Badge
        variant="secondary"
        className="bg-primary-green/10 text-primary-green"
      >
        <TypeIcon className="mr-1 h-3 w-3" />
        {typeLabel}
      </Badge>
      <h1 className="mt-4 font-serif text-3xl font-bold text-primary-green sm:text-4xl">
        {event.title}
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {event.description && (
            <div className="prose prose-green max-w-none text-primary-green/80">
              <p>{event.description}</p>
            </div>
          )}
          <p className="mt-6 text-sm text-primary-green/60">
            Organisé par {consultantName}
          </p>
        </div>

        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 pt-6">
            <div className="text-center">
              <p className="font-serif text-3xl font-bold text-primary-green">
                {formatPrice(event.price_cents, event.currency)}
              </p>
            </div>
            <div className="space-y-3 text-sm text-primary-green/70">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {format(
                    new Date(event.starts_at),
                    "EEEE d MMMM yyyy",
                    { locale: fr }
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(event.starts_at), "HH'h'mm", {
                    locale: fr,
                  })}{" "}
                  -{" "}
                  {format(new Date(event.ends_at), "HH'h'mm", {
                    locale: fr,
                  })}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.max_participants && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{event.max_participants} places max</span>
                </div>
              )}
            </div>
            <Button className="w-full bg-primary-red hover:bg-primary-red-dark">
              S&apos;inscrire
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventDetailPage;

import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Video, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Formations professionnelles",
  description:
    "Formations, ateliers et webinaires pour professionnels de santé en lactation et allaitement.",
};

export const dynamic = "force-dynamic";

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: typeof Video }> =
  {
    online: { label: "En ligne", icon: Video },
    in_person: { label: "Présentiel", icon: MapPin },
    hybrid: { label: "Hybride", icon: Users },
  };

const formatPrice = (cents: number, currency: string): string => {
  if (cents === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
};

const FormationsProPage = async () => {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      slug,
      description,
      type,
      starts_at,
      ends_at,
      location,
      max_participants,
      price_cents,
      currency,
      consultants (
        slug,
        profiles!consultants_id_fkey (
          first_name,
          last_name
        )
      )
    `
    )
    .eq("is_published", true)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
            Formations professionnelles
          </h1>
          <p className="mt-4 text-destructive">
            Erreur lors du chargement : {error.message}
          </p>
        </div>
      </div>
    );
  }

  const list = events ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          Formations professionnelles
        </h1>
        <p className="mt-4 text-lg text-primary-green/70">
          Formations, ateliers et webinaires pour professionnels de santé
        </p>
      </div>

      {list.length > 0 ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((event) => {
            const typeInfo =
              EVENT_TYPE_LABELS[event.type] ?? EVENT_TYPE_LABELS.online;
            const Icon = typeInfo.icon;
            const consultant = event.consultants as unknown as {
              slug: string;
              profiles: {
                first_name: string | null;
                last_name: string | null;
              } | null;
            } | null;

            return (
              <Card
                key={event.id}
                className="flex flex-col transition-shadow hover:shadow-md"
              >
                <CardContent className="flex-1 pt-6">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="bg-primary-green/10 text-primary-green"
                    >
                      <Icon className="mr-1 h-3 w-3" />
                      {typeInfo.label}
                    </Badge>
                    <span className="font-semibold text-primary-red">
                      {formatPrice(event.price_cents, event.currency)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-semibold text-primary-green">
                    {event.title}
                  </h3>
                  <div className="mt-3 flex items-center gap-2 text-sm text-primary-green/60">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {format(new Date(event.starts_at), "d MMMM yyyy 'à' HH'h'mm", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                  {event.location && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-primary-green/60">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {consultant?.profiles && (
                    <p className="mt-2 text-xs text-primary-green/50">
                      Par{" "}
                      {`${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()}
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    className="w-full bg-primary-red hover:bg-primary-red-dark"
                  >
                    <Link href={`/formations/${event.slug}`} tabIndex={0}>
                      En savoir plus
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-primary-green/60">
            Aucune formation à venir pour le moment. Revenez bientôt !
          </p>
        </div>
      )}
    </div>
  );
};

export default FormationsProPage;

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, BookOpen, Clock } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("consultants")
    .select(
      "bio, specialties, profiles!consultants_id_fkey (first_name, last_name, avatar_url)"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!data) return { title: "Consultante introuvable" };

  const profile = data.profiles as unknown as {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;

  const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  const description = data.bio
    ? `${name} — ${(data.bio as string).slice(0, 150)}`
    : `Consultante certifiée sur Question d'Allaitement`;

  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      type: "profile",
      ...(profile?.avatar_url && {
        images: [{ url: profile.avatar_url, alt: name }],
      }),
    },
  };
};

const ConsultantDetailPage = async ({ params }: Props) => {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: consultant } = await supabase
    .from("consultants")
    .select(
      `
      id,
      slug,
      bio,
      specialties,
      profiles!consultants_id_fkey (
        first_name,
        last_name,
        avatar_url
      ),
      consultation_types (
        id,
        title,
        description,
        duration_minutes,
        price_cents,
        currency,
        is_online,
        is_active
      ),
      formations (
        id,
        title,
        slug,
        short_description,
        price_cents,
        currency,
        status
      )
    `
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!consultant) notFound();

  const profile = consultant.profiles as unknown as {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;

  const fullName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "Consultante";

  const initials = profile
    ? `${(profile.first_name ?? "")[0] ?? ""}${(profile.last_name ?? "")[0] ?? ""}`
    : "C";

  const consultationTypes = (
    consultant.consultation_types as unknown as {
      id: string;
      title: string;
      description: string | null;
      duration_minutes: number;
      price_cents: number;
      currency: string;
      is_online: boolean;
      is_active: boolean;
    }[]
  ).filter((ct) => ct.is_active);

  const formations = (
    consultant.formations as unknown as {
      id: string;
      title: string;
      slug: string;
      short_description: string | null;
      price_cents: number;
      currency: string;
      status: string;
    }[]
  ).filter((f) => f.status === "published");

  const formatPrice = (cents: number, currency: string): string =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
    }).format(cents / 100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Avatar className="h-24 w-24">
          <AvatarImage
            src={profile?.avatar_url ?? undefined}
            alt={fullName}
          />
          <AvatarFallback className="bg-primary-red/10 text-2xl font-semibold text-primary-red">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary-green">
            {fullName}
          </h1>
          {consultant.specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {consultant.specialties.map((specialty: string) => (
                <Badge
                  key={specialty}
                  variant="secondary"
                  className="bg-primary-red/10 text-primary-red"
                >
                  {specialty}
                </Badge>
              ))}
            </div>
          )}
          {consultant.bio && (
            <p className="mt-4 max-w-2xl text-primary-green/80">
              {consultant.bio}
            </p>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {consultationTypes.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-semibold text-primary-green">
            <CalendarDays className="mr-2 inline h-6 w-6" />
            Consultations
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {consultationTypes.map((ct) => (
              <Card key={ct.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-primary-green">
                      {ct.title}
                    </h3>
                    <span className="font-semibold text-primary-red">
                      {formatPrice(ct.price_cents, ct.currency)}
                    </span>
                  </div>
                  {ct.description && (
                    <p className="mt-2 text-sm text-primary-green/70">
                      {ct.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-primary-green/50">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ct.duration_minutes} min
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {ct.is_online ? "Visio" : "Présentiel"}
                    </Badge>
                  </div>
                  <Button
                    asChild
                    className="mt-4 w-full bg-primary-red hover:bg-primary-red-dark"
                  >
                    <Link
                      href={`/reserver?consultant=${consultant.slug}&service=${encodeURIComponent(ct.title)}`}
                      tabIndex={0}
                      aria-label={`Réserver ${ct.title}`}
                    >
                      Réserver
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {formations.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl font-semibold text-primary-green">
            <BookOpen className="mr-2 inline h-6 w-6" />
            Formations
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {formations.map((formation) => (
              <Card key={formation.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-primary-green">
                      {formation.title}
                    </h3>
                    <span className="font-semibold text-primary-red">
                      {formatPrice(formation.price_cents, formation.currency)}
                    </span>
                  </div>
                  {formation.short_description && (
                    <p className="mt-2 text-sm text-primary-green/70">
                      {formation.short_description}
                    </p>
                  )}
                  <Button asChild variant="outline" className="mt-4 w-full">
                    <Link href={`/formations/${formation.slug}`} tabIndex={0}>
                      Voir la formation
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ConsultantDetailPage;

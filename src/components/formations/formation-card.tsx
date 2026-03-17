import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FormationCardProps = {
  formation: {
    id: string;
    title: string;
    slug: string;
    short_description: string | null;
    thumbnail_url: string | null;
    price_cents: number;
    currency: string;
    consultants?: {
      slug: string;
      profiles?: {
        first_name: string | null;
        last_name: string | null;
      } | null;
    } | null;
  };
  featured?: boolean;
};

const formatPrice = (cents: number, currency: string): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
};

export const FormationCard = ({ formation, featured }: FormationCardProps) => {
  const consultantName = formation.consultants?.profiles
    ? `${formation.consultants.profiles.first_name ?? ""} ${formation.consultants.profiles.last_name ?? ""}`.trim()
    : null;

  if (featured) {
    return (
      <Card className="group overflow-hidden">
        <div className="grid lg:grid-cols-5">
          {/* Image — constrained to 2/5 on desktop, aspect-video on mobile */}
          <div className="relative aspect-video overflow-hidden bg-background-beige-dark lg:col-span-2 lg:aspect-auto lg:min-h-70">
            {formation.thumbnail_url ? (
              <Image
                src={formation.thumbnail_url}
                alt={formation.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="font-serif text-lg text-primary-green/30">
                  Accompagnement
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col justify-between p-6 lg:col-span-3 lg:p-8">
            <div>
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="bg-primary-red/10 text-primary-red"
                >
                  Pack complet
                </Badge>
                <span className="font-serif text-xl font-bold text-primary-green lg:text-2xl">
                  {formatPrice(formation.price_cents, formation.currency)}
                </span>
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-primary-green lg:text-2xl">
                {formation.title}
              </h3>
              {formation.short_description && (
                <p className="mt-3 line-clamp-3 text-base leading-relaxed text-primary-green/70">
                  {formation.short_description}
                </p>
              )}
              {consultantName && (
                <p className="mt-3 text-xs text-primary-green/50">
                  Par {consultantName}
                </p>
              )}
            </div>
            <div className="mt-6">
              <Button
                asChild
                size="lg"
                className="bg-primary-red hover:bg-primary-red-dark"
              >
                <Link href={`/accompagnements/${formation.slug}`}>
                  Découvrir le pack
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-video overflow-hidden bg-background-beige-dark">
        {formation.thumbnail_url ? (
          <Image
            src={formation.thumbnail_url}
            alt={formation.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-serif text-lg text-primary-green/30">
              Accompagnement
            </span>
          </div>
        )}
      </div>
      <CardContent className="flex-1">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="bg-primary-red/10 text-primary-red"
          >
            Accompagnement
          </Badge>
          <span className="font-semibold text-primary-green">
            {formatPrice(formation.price_cents, formation.currency)}
          </span>
        </div>
        <h3 className="mt-3 font-serif text-lg font-semibold text-primary-green">
          {formation.title}
        </h3>
        {formation.short_description && (
          <p className="mt-2 line-clamp-2 text-sm text-primary-green/70">
            {formation.short_description}
          </p>
        )}
        {consultantName && (
          <p className="mt-2 text-xs text-primary-green/50">
            Par {consultantName}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full bg-primary-red hover:bg-primary-red-dark">
          <Link href={`/accompagnements/${formation.slug}`}>
            Découvrir
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

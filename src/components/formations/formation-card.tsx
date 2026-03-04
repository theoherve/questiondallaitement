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

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div
        className={`bg-background-beige-dark ${featured ? "aspect-4/3" : "aspect-video"} relative overflow-hidden`}
      >
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
      <CardContent className="flex-1 pt-4">
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
        <h3
          className={`mt-3 font-serif font-semibold text-primary-green ${featured ? "text-xl lg:text-2xl" : "text-lg"}`}
        >
          {formation.title}
        </h3>
        {formation.short_description && (
          <p
            className={`mt-2 text-primary-green/70 ${featured ? "line-clamp-4 text-base" : "line-clamp-2 text-sm"}`}
          >
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

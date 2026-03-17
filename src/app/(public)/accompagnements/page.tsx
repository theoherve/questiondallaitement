import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FormationCard } from "@/components/formations/formation-card";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Package, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Accompagnements en ligne",
  description:
    "Découvrez nos accompagnements en ligne en lactation, sommeil et santé maternelle.",
};

export const dynamic = "force-dynamic";

type FormationRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
  consultant_id: string;
  formation_sections: { id: string; formation_blocks: { id: string }[] }[];
  consultants: {
    slug: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100
  );

const PACK_SLUG = "pack-essentiel-allaitement";

const AccompagnementsPage = async () => {
  const supabase = await createClient();

  const { data: formations, error } = await supabase
    .from("formations")
    .select(
      `
      id,
      title,
      slug,
      short_description,
      thumbnail_url,
      price_cents,
      currency,
      consultant_id,
      formation_sections (
        id,
        formation_blocks ( id )
      ),
      consultants!formations_consultant_id_fkey (
        slug,
        profiles!consultants_id_fkey (
          first_name,
          last_name
        )
      )
    `
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .order("price_cents", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
            Accompagnements en ligne
          </h1>
          <p className="mt-4 text-destructive">
            Erreur lors du chargement : {error.message}
          </p>
        </div>
      </div>
    );
  }

  const rows = (formations ?? []) as unknown as FormationRow[];
  const pack = rows.find((f) => f.slug === PACK_SLUG);
  const modules = rows.filter((f) => f.slug !== PACK_SLUG);

  const packSectionsCount = pack?.formation_sections.length ?? 0;
  const packBlocksCount =
    pack?.formation_sections.reduce(
      (acc, s) => acc + (s.formation_blocks?.length ?? 0),
      0
    ) ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <Badge
          variant="secondary"
          className="bg-primary-red/10 text-primary-red"
        >
          Formations en ligne
        </Badge>
        <h1 className="mt-4 font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          Accompagnements en ligne
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-green/70">
          Des parcours complets pour vous accompagner dans votre allaitement et
          votre parentalité — à votre rythme, où que vous soyez.
        </p>
      </div>

      {rows.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-primary-green/60">
            Aucun accompagnement disponible pour le moment. Revenez bientôt !
          </p>
        </div>
      )}

      {/* Featured Pack */}
      {pack && (
        <div className="mt-14">
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-red" />
            <h2 className="font-serif text-xl font-semibold text-primary-green">
              Le Pack complet
            </h2>
          </div>
          <Card className="overflow-hidden border-primary-red/30 bg-background-beige shadow-md">
            <div className="grid gap-0 lg:grid-cols-5">
              <div className="flex flex-col justify-between p-8 lg:col-span-3">
                <div>
                  <Badge className="bg-primary-red text-white">Meilleure valeur</Badge>
                  <h3 className="mt-3 font-serif text-2xl font-bold text-primary-green lg:text-3xl">
                    {pack.title}
                  </h3>
                  {pack.short_description && (
                    <p className="mt-3 text-primary-green/70">
                      {pack.short_description}
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-4 text-sm text-primary-green/60">
                    {packSectionsCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4" />
                        <span>
                          {packSectionsCount} module
                          {packSectionsCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    {packBlocksCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" />
                        <span>
                          {packBlocksCount} leçon
                          {packBlocksCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-8 flex items-center gap-4">
                  <p className="font-serif text-3xl font-bold text-primary-green">
                    {formatPrice(pack.price_cents, pack.currency)}
                  </p>
                  <Button
                    asChild
                    size="lg"
                    className="bg-primary-red hover:bg-primary-red-dark"
                  >
                    <Link href={`/accompagnements/${pack.slug}`}>
                      Découvrir le pack
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="hidden bg-primary-green/5 lg:col-span-2 lg:flex lg:items-center lg:justify-center p-8">
                {pack.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pack.thumbnail_url}
                    alt={pack.title}
                    className="rounded-lg object-cover max-h-64 w-full"
                  />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-primary-green/20">
                    <Package className="h-16 w-16 text-primary-green/20" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Individual modules */}
      {modules.length > 0 && (
        <div className="mt-14">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-green" />
            <h2 className="font-serif text-xl font-semibold text-primary-green">
              Modules individuels
            </h2>
          </div>
          <p className="mb-6 text-sm text-primary-green/60">
            Accédez à un module précis selon votre besoin du moment.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map((formation) => {
              const sectionCount = formation.formation_sections.length;
              const blockCount = formation.formation_sections.reduce(
                (acc, s) => acc + (s.formation_blocks?.length ?? 0),
                0
              );
              return (
                <Card
                  key={formation.id}
                  className="flex h-full flex-col overflow-hidden"
                >
                  <div className="relative aspect-video overflow-hidden bg-background-beige-dark">
                    {formation.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formation.thumbnail_url}
                        alt={formation.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="font-serif text-sm text-primary-green/30">
                          Module
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
                        Module
                      </Badge>
                      <span className="font-semibold text-primary-green">
                        {formatPrice(formation.price_cents, formation.currency)}
                      </span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 font-serif text-base font-semibold text-primary-green">
                      {formation.title}
                    </h3>
                    {formation.short_description && (
                      <p className="mt-2 line-clamp-2 text-sm text-primary-green/70">
                        {formation.short_description}
                      </p>
                    )}
                    {(sectionCount > 0 || blockCount > 0) && (
                      <div className="mt-3 flex gap-3 text-xs text-primary-green/50">
                        {sectionCount > 0 && (
                          <span>
                            {sectionCount} section{sectionCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {blockCount > 0 && (
                          <span>
                            {blockCount} leçon{blockCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      className="w-full bg-primary-red hover:bg-primary-red-dark"
                    >
                      <Link href={`/accompagnements/${formation.slug}`}>
                        Découvrir
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccompagnementsPage;

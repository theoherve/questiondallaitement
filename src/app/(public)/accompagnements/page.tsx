import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  PACK_SLUG,
  formatPrice,
  sortByModuleOrder,
} from "@/config/accompagnements";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Package,
  Layers,
  Clock,
  Smartphone,
  BadgeCheck,
  ShieldCheck,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Accompagnements en ligne",
  description:
    "Découvrez nos accompagnements en ligne en lactation, sommeil et santé maternelle.",
};

export const dynamic = "force-dynamic";

type AccompagnementRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
  consultant_id: string;
  accompagnement_sections: { id: string; accompagnement_blocks: { id: string }[] }[];
  consultants: {
    slug: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

const BENEFITS = [
  { icon: Clock, label: "À votre rythme" },
  { icon: Smartphone, label: "Accessible partout" },
  { icon: BadgeCheck, label: "Accès à vie" },
  { icon: ShieldCheck, label: "Experts certifiés IBCLC" },
];

const AccompagnementsPage = async () => {
  const supabase = await createClient();

  const { data: accompagnements, error } = await supabase
    .from("accompagnements")
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
      accompagnement_sections (
        id,
        accompagnement_blocks ( id )
      ),
      consultants!accompagnements_consultant_id_fkey (
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

  const rows = (accompagnements ?? []) as unknown as AccompagnementRow[];
  const pack = rows.find((f) => f.slug === PACK_SLUG);
  const modules = sortByModuleOrder(rows.filter((f) => f.slug !== PACK_SLUG));

  const packSectionsCount = pack?.accompagnement_sections.length ?? 0;
  const packBlocksCount =
    pack?.accompagnement_sections.reduce(
      (acc, s) => acc + (s.accompagnement_blocks?.length ?? 0),
      0
    ) ?? 0;

  const totalModulesPrice = modules.reduce((sum, m) => sum + m.price_cents, 0);
  const packSavings = pack ? totalModulesPrice - pack.price_cents : 0;
  const packSavingsPercent =
    totalModulesPrice > 0 && packSavings > 0
      ? Math.round((packSavings / totalModulesPrice) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <Badge
          variant="secondary"
          className="bg-primary-red/10 text-primary-red"
        >
          Accompagnements en ligne
        </Badge>
        <h1 className="mt-4 font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          Le bon accompagnement, pour l&apos;étape que vous traversez maintenant
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-green/70">
          Huit parcours, un pack complet — chacun conçu pour répondre à une
          situation précise, avec la même exigence clinique. Pas de contenu
          générique : uniquement ce dont vous avez besoin, quand vous en avez
          besoin.
        </p>
      </div>

      {/* Benefits strip */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 bg-background-beige-dark px-4 py-3"
          >
            <Icon className="h-5 w-5 shrink-0 text-primary-red" />
            <span className="text-sm font-medium text-primary-green">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Orientation — aide une visiteuse pressée à choisir sans lire les 9 fiches */}
      {rows.length > 0 && (
        <div className="mx-auto mt-10 max-w-3xl border-l-2 border-primary-red/30 pl-5">
          <p className="font-serif text-lg font-semibold text-primary-green">
            Vous ne savez pas par où commencer ?
          </p>
          <ul className="mt-3 space-y-1.5 text-primary-green/75">
            <li>
              Enceinte ou en préparation —{" "}
              <Link
                href="/accompagnements/je-me-prepare-a-allaiter"
                className="text-primary-red hover:underline"
              >
                Je me prépare à allaiter
              </Link>
            </li>
            <li>
              Bébé a moins d&apos;un mois —{" "}
              <Link
                href="/accompagnements/mon-allaitement-des-premiers-jours"
                className="text-primary-red hover:underline"
              >
                Mon allaitement des premiers jours
              </Link>
            </li>
            <li>
              Une douleur ou une urgence là, maintenant —{" "}
              <Link
                href="/accompagnements/les-urgences-allaitement"
                className="text-primary-red hover:underline"
              >
                Les urgences de l&apos;allaitement
              </Link>
            </li>
            <li>
              Toutes les étapes en une fois —{" "}
              <Link
                href={`/accompagnements/${PACK_SLUG}`}
                className="text-primary-red hover:underline"
              >
                le Pack complet
              </Link>
            </li>
          </ul>
        </div>
      )}

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
            {/* Mobile: image at top */}
            {pack.thumbnail_url && (
              <div className="relative aspect-video w-full overflow-hidden lg:hidden">
                <Image
                  src={pack.thumbnail_url}
                  alt={pack.title}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            )}

            <div className="grid gap-0 lg:grid-cols-5">
              {/* Content */}
              <div className="flex flex-col justify-between p-8 lg:col-span-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-primary-red text-white">
                      Meilleure valeur
                    </Badge>
                    {packSavingsPercent > 0 && (
                      <Badge
                        variant="outline"
                        className="border-primary-green/30 text-primary-green"
                      >
                        Économisez {packSavingsPercent}%
                      </Badge>
                    )}
                  </div>
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

                  {/* Module list on mobile */}
                  {modules.length > 0 && (
                    <ul className="mt-6 space-y-2 lg:hidden">
                      {modules.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-start gap-2 text-sm text-primary-green/70"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                          <span>{m.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <div className="flex items-baseline gap-2">
                    <p className="font-serif text-3xl font-bold text-primary-green">
                      {formatPrice(pack.price_cents, pack.currency)}
                    </p>
                    {packSavingsPercent > 0 && (
                      <p className="text-base text-primary-green/40 line-through">
                        {formatPrice(totalModulesPrice, pack.currency)}
                      </p>
                    )}
                  </div>
                  <Button
                    asChild
                    size="lg"
                    className="bg-primary-red hover:bg-primary-red-dark"
                  >
                    <Link href={`/accompagnements/${pack.slug}`}>
                      Découvrir le Pack
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Desktop: image + module list */}
              <div className="hidden bg-primary-green/5 lg:col-span-2 lg:flex lg:flex-col lg:gap-4 p-8">
                {pack.thumbnail_url ? (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <Image
                      src={pack.thumbnail_url}
                      alt={pack.title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 40vw, 100vw"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center border-2 border-dashed border-primary-green/20">
                    <Package className="h-16 w-16 text-primary-green/20" />
                  </div>
                )}
                {modules.length > 0 && (
                  <ul className="space-y-2">
                    {modules.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-start gap-2 text-sm text-primary-green/70"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-red" />
                        <span>{m.title}</span>
                      </li>
                    ))}
                  </ul>
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
            {modules.map((accompagnement) => {
              const sectionCount = accompagnement.accompagnement_sections.length;
              const blockCount = accompagnement.accompagnement_sections.reduce(
                (acc, s) => acc + (s.accompagnement_blocks?.length ?? 0),
                0
              );
              return (
                <Card
                  key={accompagnement.id}
                  className="group flex h-full flex-col overflow-hidden transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="relative aspect-video overflow-hidden bg-background-beige-dark">
                    {accompagnement.thumbnail_url ? (
                      <Image
                        src={accompagnement.thumbnail_url}
                        alt={accompagnement.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-10 w-10 text-primary-green/20" />
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
                        {formatPrice(accompagnement.price_cents, accompagnement.currency)}
                      </span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 font-serif text-base font-semibold text-primary-green">
                      {accompagnement.title}
                    </h3>
                    {accompagnement.short_description && (
                      <p className="mt-2 line-clamp-2 text-sm text-primary-green/70">
                        {accompagnement.short_description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary-green/50">
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
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      className="w-full bg-primary-red hover:bg-primary-red-dark"
                    >
                      <Link href={`/accompagnements/${accompagnement.slug}`}>
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

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, User } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("formations")
    .select("title, short_description")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) return { title: "Formation introuvable" };

  return {
    title: data.title,
    description: data.short_description ?? undefined,
  };
};

const formatPrice = (cents: number, currency: string): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
};

const FormationDetailPage = async ({ params }: Props) => {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: formation } = await supabase
    .from("formations")
    .select(
      `
      *,
      consultants (
        slug,
        bio,
        profiles (
          first_name,
          last_name,
          avatar_url
        )
      ),
      formation_sections (
        id,
        title,
        position,
        formation_blocks (
          id,
          type,
          position
        )
      )
    `
    )
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (!formation) notFound();

  const sections = (formation.formation_sections ?? []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  );
  const totalBlocks = sections.reduce(
    (acc: number, s: { formation_blocks?: unknown[] }) =>
      acc + (s.formation_blocks?.length ?? 0),
    0
  );

  const consultant = formation.consultants as unknown as {
    slug: string;
    bio: string | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;

  const consultantName = consultant?.profiles
    ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
    : "Consultante";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Badge
            variant="secondary"
            className="bg-primary-red/10 text-primary-red"
          >
            Formation
          </Badge>
          <h1 className="mt-4 font-serif text-3xl font-bold text-primary-green sm:text-4xl">
            {formation.title}
          </h1>
          {formation.description && (
            <div
              className="mt-6 prose prose-green max-w-none text-primary-green/80"
              dangerouslySetInnerHTML={{ __html: formation.description }}
            />
          )}

          <div className="mt-8">
            <h2 className="font-serif text-xl font-semibold text-primary-green">
              Programme
            </h2>
            <div className="mt-4 space-y-3">
              {sections.map(
                (section: {
                  id: string;
                  title: string;
                  formation_blocks?: { id: string }[];
                }) => (
                  <Card key={section.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <span className="font-medium text-primary-green">
                        {section.title}
                      </span>
                      <span className="text-sm text-primary-green/50">
                        {section.formation_blocks?.length ?? 0} leçon
                        {(section.formation_blocks?.length ?? 0) > 1
                          ? "s"
                          : ""}
                      </span>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="space-y-6 pt-6">
              {formation.thumbnail_url && (
                <img
                  src={formation.thumbnail_url}
                  alt={formation.title}
                  className="w-full rounded-md object-cover"
                />
              )}
              <div className="text-center">
                <p className="font-serif text-3xl font-bold text-primary-green">
                  {formatPrice(formation.price_cents, formation.currency)}
                </p>
              </div>
              <div className="space-y-3 text-sm text-primary-green/70">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {sections.length} section
                    {sections.length > 1 ? "s" : ""} &middot; {totalBlocks}{" "}
                    leçon{totalBlocks > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Accès illimité</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Par {consultantName}</span>
                </div>
              </div>
              <Button className="w-full bg-primary-red hover:bg-primary-red-dark">
                Acheter la formation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FormationDetailPage;

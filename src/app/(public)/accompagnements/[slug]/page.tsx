import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronRight, Clock, Layers, User } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { PurchaseButton } from "../_components/purchase-button";
import { PACK_SLUG } from "@/config/accompagnements";
import {
  PackSalesPage,
  fetchPackModuleRows,
} from "../_components/pack/pack-sales-page";

type Props = {
  params: Promise<{ slug: string }>;
};

type PackSalesPageConsultant = {
  bio: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
} | null;

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("formations")
    .select("title, short_description, thumbnail_url")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) return { title: "Accompagnement introuvable" };

  return {
    title: data.title,
    description: data.short_description ?? undefined,
    openGraph: {
      title: data.title,
      description: data.short_description ?? undefined,
      type: "article",
      ...(data.thumbnail_url && {
        images: [{ url: data.thumbnail_url, alt: data.title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.short_description ?? undefined,
      ...(data.thumbnail_url && { images: [data.thumbnail_url] }),
    },
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
  const currentUser = await getSessionUser();

  const { data: formation } = await supabase
    .from("formations")
    .select(
      `
      *,
      consultants!formations_consultant_id_fkey (
        slug,
        bio,
        profiles!consultants_id_fkey (
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

  // L'appli s'authentifie via NextAuth, pas Supabase Auth : `auth.uid()` est
  // toujours nul cote RLS. Le client RLS (`createClient`) ne verrait donc jamais
  // l'inscription. On lit via le client admin, borne au client courant — comme
  // le reste des lectures authentifiees (voir getSupabaseAndUser, purchaseFormation).
  let isEnrolled = false;
  if (currentUser) {
    const admin = createAdminClient();
    const { data: enrollment } = await admin
      .from("formation_enrollments")
      .select("id")
      .eq("client_id", currentUser.id)
      .eq("formation_id", formation.id)
      .maybeSingle();
    isEnrolled = !!enrollment;
  }

  if (slug === PACK_SLUG) {
    const moduleRows = await fetchPackModuleRows();
    return (
      <PackSalesPage
        formation={{
          id: formation.id,
          title: formation.title,
          price_cents: formation.price_cents,
          currency: formation.currency,
          thumbnail_url: formation.thumbnail_url,
          consultants: formation.consultants as PackSalesPageConsultant,
        }}
        moduleRows={moduleRows}
        isLoggedIn={!!currentUser}
        isEnrolled={isEnrolled}
      />
    );
  }

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

  const longDescHtml = (formation as Record<string, unknown>).long_description_html as string | null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Badge
            variant="secondary"
            className="bg-primary-red/10 text-primary-red"
          >
            Accompagnement en ligne
          </Badge>
          <h1 className="mt-4 font-serif text-3xl font-bold text-primary-green sm:text-4xl">
            {formation.title}
          </h1>
          {formation.short_description && (
            <p className="mt-4 text-lg text-primary-green/70">
              {formation.short_description}
            </p>
          )}

          {/* Rich long description from Wix import */}
          {longDescHtml && (
            <div
              className="mt-6 prose prose-green max-w-none text-primary-green/80"
              dangerouslySetInnerHTML={{ __html: longDescHtml }}
            />
          )}

          {/* Fallback short description if no long desc */}
          {!longDescHtml && formation.description && (
            <div
              className="mt-6 prose prose-green max-w-none text-primary-green/80"
              dangerouslySetInnerHTML={{ __html: formation.description }}
            />
          )}

          {/* Programme */}
          {sections.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary-green" />
                <h2 className="font-serif text-xl font-semibold text-primary-green">
                  Programme
                </h2>
              </div>
              <p className="mt-1 text-sm text-primary-green/60">
                {sections.length} section{sections.length > 1 ? "s" : ""}{" "}
                &middot; {totalBlocks} contenu{totalBlocks > 1 ? "s" : ""}
              </p>
              <div className="mt-4 space-y-2">
                {sections.map(
                  (
                    section: {
                      id: string;
                      title: string;
                      formation_blocks?: { id: string; type: string }[];
                    },
                    idx: number
                  ) => {
                    const blockCount = section.formation_blocks?.length ?? 0;
                    return (
                      <Card key={section.id} className="overflow-hidden">
                        <CardContent className="flex items-center justify-between py-4 px-5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-green/10 text-xs font-semibold text-primary-green">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-primary-green">
                              {section.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-primary-green/50">
                            {blockCount > 0 && (
                              <span>
                                {blockCount} leçon{blockCount > 1 ? "s" : ""}
                              </span>
                            )}
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Consultant bio */}
          {consultant?.bio && (
            <div className="mt-10">
              <h2 className="font-serif text-xl font-semibold text-primary-green">
                Votre formatrice
              </h2>
              <div className="mt-4 flex items-start gap-4">
                {consultant.profiles?.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={consultant.profiles.avatar_url}
                    alt={consultantName}
                    className="h-16 w-16 rounded-full object-cover shrink-0"
                  />
                )}
                <div>
                  <p className="font-semibold text-primary-green">
                    {consultantName}
                  </p>
                  <p className="mt-1 text-sm text-primary-green/70">
                    {consultant.bio}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="space-y-6 pt-6">
              {formation.thumbnail_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
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
                {(sections.length > 0 || totalBlocks > 0) && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>
                      {sections.length} section
                      {sections.length > 1 ? "s" : ""} &middot; {totalBlocks}{" "}
                      leçon{totalBlocks > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Accès illimité</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Par {consultantName}</span>
                </div>
              </div>
              <PurchaseButton
                formationId={formation.id}
                isLoggedIn={!!currentUser}
                isEnrolled={isEnrolled}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FormationDetailPage;

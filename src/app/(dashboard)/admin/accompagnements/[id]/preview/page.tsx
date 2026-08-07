import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, BookOpen, Clock, Eye, Pencil, User } from "lucide-react";
import { AccompagnementReader } from "@/app/(public)/espace-client/accompagnements/[id]/_components/accompagnement-reader";

type Props = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("formations")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: data ? `Preview — ${data.title}` : "Preview introuvable",
    robots: { index: false, follow: false },
  };
};

const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  published: "Publiée",
  archived: "Archivée",
};

const AccompagnementPreviewPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: accompagnement } = await supabase
    .from("formations")
    .select(
      `
      *,
      consultants!accompagnements_consultant_id_fkey (
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
          content,
          position
        )
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!accompagnement) notFound();

  const sections = (accompagnement.formation_sections ?? [])
    .sort(
      (a: { position: number }, b: { position: number }) =>
        a.position - b.position
    )
    .map(
      (section: {
        id: string;
        title: string;
        position: number;
        formation_blocks?: {
          id: string;
          type: string;
          content: unknown;
          position: number;
        }[];
      }) => ({
        ...section,
        formation_blocks: (section.formation_blocks ?? []).sort(
          (a: { position: number }, b: { position: number }) =>
            a.position - b.position
        ),
      })
    );

  const totalBlocks = sections.reduce(
    (acc: number, s: { formation_blocks?: unknown[] }) =>
      acc + (s.formation_blocks?.length ?? 0),
    0
  );

  const consultant = accompagnement.consultants as unknown as {
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
    <div className="space-y-6">
      {/* Preview banner */}
      <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-4">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">
              Mode preview — Non indexé
            </p>
            <p className="text-sm text-amber-600">
              Statut actuel :{" "}
              <Badge variant="outline" className="ml-1">
                {statusLabels[accompagnement.status] ?? accompagnement.status}
              </Badge>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/accompagnements/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Éditer
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/accompagnements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="learner" className="w-full">
        <TabsList className="w-fit">
          <TabsTrigger value="learner">Vue apprenant</TabsTrigger>
          <TabsTrigger value="landing">Page vitrine</TabsTrigger>
        </TabsList>

        {/* Learner view — same as enrolled user */}
        <TabsContent value="learner" className="mt-6">
          {sections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-3 h-8 w-8 opacity-40" />
                <p>Aucune section. Ajoute du contenu pour prévisualiser.</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href={`/admin/accompagnements/${id}/edit`}>
                    Éditer l&apos;accompagnement
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="mx-auto max-w-4xl">
              <p className="mb-4 text-xs text-muted-foreground">
                Tu navigues comme un apprenant inscrit. La progression n&apos;est
                pas sauvegardée.
              </p>
              <AccompagnementReader
                accompagnement={{
                  id: accompagnement.id,
                  title: accompagnement.title,
                  description: accompagnement.description,
                }}
                sections={sections}
                completedBlockIds={[]}
                totalBlocks={totalBlocks}
                completedCount={0}
                readOnly
                backHref={`/admin/accompagnements/${id}/edit`}
              />
            </div>
          )}
        </TabsContent>

        {/* Landing page — what a prospect sees before purchase */}
        <TabsContent value="landing" className="mt-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Badge
                  variant="secondary"
                  className="bg-primary-red/10 text-primary-red"
                >
                  Accompagnement
                </Badge>
                <h1 className="mt-4 font-serif text-3xl font-bold text-primary-green sm:text-4xl">
                  {accompagnement.title}
                </h1>

                {accompagnement.long_description_html ? (
                  <div
                    className="prose prose-green mt-6 max-w-none text-primary-green/80"
                    dangerouslySetInnerHTML={{
                      __html: accompagnement.long_description_html,
                    }}
                  />
                ) : accompagnement.description ? (
                  <div
                    className="prose prose-green mt-6 max-w-none text-primary-green/80"
                    dangerouslySetInnerHTML={{ __html: accompagnement.description }}
                  />
                ) : null}

                <div className="mt-8">
                  <h2 className="font-serif text-xl font-semibold text-primary-green">
                    Programme
                  </h2>
                  <div className="mt-4 space-y-3">
                    {sections.map(
                      (section: {
                        id: string;
                        title: string;
                        formation_blocks?: { id: string; type: string }[];
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

                    {sections.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Aucune section pour le moment.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardContent className="space-y-6 pt-6">
                    {accompagnement.thumbnail_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={accompagnement.thumbnail_url}
                        alt={accompagnement.title}
                        className="w-full rounded-md object-cover"
                      />
                    )}
                    <div className="text-center">
                      <p className="font-serif text-3xl font-bold text-primary-green">
                        {formatPrice(
                          accompagnement.price_cents,
                          accompagnement.currency
                        )}
                      </p>
                    </div>
                    <div className="space-y-3 text-sm text-primary-green/70">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>
                          {sections.length} section
                          {sections.length > 1 ? "s" : ""} &middot;{" "}
                          {totalBlocks} leçon{totalBlocks > 1 ? "s" : ""}
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
                    <Button
                      className="w-full bg-primary-red hover:bg-primary-red-dark"
                      disabled
                    >
                      Acheter l&apos;accompagnement
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Bouton désactivé en mode preview
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccompagnementPreviewPage;

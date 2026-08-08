import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { stripHtml, truncate } from "@/lib/html/strip";
import { inheritFromTemplate } from "@/lib/formations/inherit";
import {
  FormationDetail,
  type FormationDetailConsultant,
  type FormationDetailProps,
} from "./_components/formation-detail";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ registered?: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("formations")
    .select(
      "title, description, summary_html, thumbnail_url, formation_templates (summary_html)",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!data) return { title: "Formation introuvable" };

  // Le resume prend le relais quand la description courte n'est pas saisie :
  // mieux vaut une phrase extraite du contenu editorial qu'aucune metadonnee.
  // Il peut lui-meme venir de la fiche partagee.
  const summaryHtml = inheritFromTemplate(data).summary_html;
  const description = data.description ?? truncate(stripHtml(summaryHtml), 155);

  return {
    title: data.title,
    description,
    openGraph: {
      title: data.title,
      description,
      type: "article",
      ...(data.thumbnail_url && { images: [{ url: data.thumbnail_url }] }),
    },
  };
};

const FormationDetailPage = async ({ params, searchParams }: Props) => {
  const { slug } = await params;
  const { registered } = await searchParams;
  const supabase = await createClient();

  const { data: formation } = await supabase
    .from("formations")
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
      ),
      formation_templates (
        summary_html,
        objectives_html,
        program_html,
        audience_html,
        external_url,
        badge
      )
    `
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!formation) notFound();

  const adminSupabase = createAdminClient();
  const user = await getSessionUser();

  const [regCountResult, userRegResult] = await Promise.all([
    adminSupabase
      .from("formation_registrations")
      .select("*", { count: "exact", head: true })
      .eq("formation_id", formation.id)
      .eq("status", "registered"),
    user
      ? adminSupabase
          .from("formation_registrations")
          .select("id")
          .eq("formation_id", formation.id)
          .eq("client_id", user.id)
          .eq("status", "registered")
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const registrationsCount = regCountResult.count ?? 0;
  const isAlreadyRegistered = !!userRegResult.data;
  const isFullyBooked =
    !!formation.max_participants && registrationsCount >= formation.max_participants;
  const isFree = formation.price_cents === 0;

  const consultant = formation.consultants as unknown as FormationDetailConsultant;

  // Retour d'un paiement : n'attendre le webhook que pour une formation payante
  // dont l'inscription n'apparait pas encore. Une formation gratuite s'inscrit en
  // synchrone dans l'action, sans course a combler.
  const awaitingRegistration = !!registered && !isFree && !isAlreadyRegistered;

  return (
    <FormationDetail
      formation={inheritFromTemplate(formation) as FormationDetailProps["formation"]}
      consultant={consultant}
      isAlreadyRegistered={isAlreadyRegistered}
      isFullyBooked={isFullyBooked}
      registrationsCount={registrationsCount}
      isAuthenticated={!!user}
      awaitingRegistration={awaitingRegistration}
    />
  );
};

export default FormationDetailPage;

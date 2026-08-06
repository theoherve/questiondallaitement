import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { stripHtml, truncate } from "@/lib/html/strip";
import {
  EventDetail,
  type EventDetailConsultant,
  type EventDetailProps,
} from "./_components/event-detail";

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
    .from("events")
    .select("title, description, summary_html, thumbnail_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!data) return { title: "Événement introuvable" };

  // Le resume prend le relais quand la description courte n'est pas saisie :
  // mieux vaut une phrase extraite du contenu editorial qu'aucune metadonnee.
  const description =
    data.description ?? truncate(stripHtml(data.summary_html), 155);

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

const EventDetailPage = async ({ params, searchParams }: Props) => {
  const { slug } = await params;
  const { registered } = await searchParams;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
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
      )
    `
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!event) notFound();

  // External events redirect directly to the provider's URL with discount code
  if (event.external_url) {
    const separator = event.external_url.includes("?") ? "&" : "?";
    redirect(`${event.external_url}${separator}code=MILKPOWER`);
  }

  const adminSupabase = createAdminClient();
  const user = await getSessionUser();

  const [regCountResult, userRegResult] = await Promise.all([
    adminSupabase
      .from("event_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("status", "registered"),
    user
      ? adminSupabase
          .from("event_registrations")
          .select("id")
          .eq("event_id", event.id)
          .eq("client_id", user.id)
          .eq("status", "registered")
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const registrationsCount = regCountResult.count ?? 0;
  const isAlreadyRegistered = !!userRegResult.data;
  const isFullyBooked =
    !!event.max_participants && registrationsCount >= event.max_participants;
  const isFree = event.price_cents === 0;

  const consultant = event.consultants as unknown as EventDetailConsultant;

  // Retour d'un paiement : n'attendre le webhook que pour un evenement payant
  // dont l'inscription n'apparait pas encore. Un evenement gratuit s'inscrit en
  // synchrone dans l'action, sans course a combler.
  const awaitingRegistration = !!registered && !isFree && !isAlreadyRegistered;

  return (
    <EventDetail
      event={event as EventDetailProps["event"]}
      consultant={consultant}
      isAlreadyRegistered={isAlreadyRegistered}
      isFullyBooked={isFullyBooked}
      registrationsCount={registrationsCount}
      isAuthenticated={!!user}
      awaitingRegistration={awaitingRegistration}
    />
  );
};

export default EventDetailPage;

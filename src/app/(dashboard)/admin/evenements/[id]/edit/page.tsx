import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventForm } from "../../_components/event-form";
import { getEventRegistrationsCount } from "../../actions";
import type { Event } from "@/types";

export const metadata: Metadata = {
  title: "Modifier l'événement",
};

type Props = {
  params: Promise<{ id: string }>;
};

const EditEventPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");

  const { id } = await params;
  const supabase = createAdminClient();

  const [eventResult, consultantsResult, registrationsCount] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", id).single(),
      supabase
        .from("consultants")
        .select("id, profiles!consultants_id_fkey(first_name, last_name)")
        .eq("is_active", true),
      getEventRegistrationsCount(id),
    ]);

  if (eventResult.error || !eventResult.data) {
    notFound();
  }

  const event = eventResult.data as Event;
  const consultants = (consultantsResult.data ?? []).map(
    (c: Record<string, unknown>) => ({
      id: c.id as string,
      profiles: c.profiles as {
        first_name: string | null;
        last_name: string | null;
      } | null,
    }),
  );

  return (
    <EventForm
      event={event}
      consultants={consultants}
      mode="edit"
      registrationsCount={registrationsCount}
    />
  );
};

export default EditEventPage;

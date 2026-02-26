import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventForm } from "../_components/event-form";

export const metadata: Metadata = {
  title: "Nouvel événement",
};

const NewEventPage = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");

  const supabase = createAdminClient();

  const { data: consultantsRaw } = await supabase
    .from("consultants")
    .select("id, profiles!consultants_id_fkey(first_name, last_name)")
    .eq("is_active", true);

  const consultants = (consultantsRaw ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    profiles: c.profiles as {
      first_name: string | null;
      last_name: string | null;
    } | null,
  }));

  return <EventForm consultants={consultants} mode="create" />;
};

export default NewEventPage;

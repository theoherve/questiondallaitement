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
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const supabase = createAdminClient();

  const [{ data: consultantsRaw }, { data: providers }] = await Promise.all([
    supabase
      .from("consultants")
      .select("id, profiles!consultants_id_fkey(first_name, last_name)")
      .eq("is_active", true),
    supabase.from("training_providers").select("id, name").order("name"),
  ]);

  const consultants = (consultantsRaw ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    profiles: c.profiles as {
      first_name: string | null;
      last_name: string | null;
    } | null,
  }));

  return (
    <EventForm
      consultants={consultants}
      providers={providers ?? []}
      mode="create"
    />
  );
};

export default NewEventPage;

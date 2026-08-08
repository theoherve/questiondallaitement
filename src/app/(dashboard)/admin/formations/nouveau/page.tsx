import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormationForm } from "../_components/formation-form";

export const metadata: Metadata = {
  title: "Nouvelle formation",
};

const NewFormationPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const supabase = createAdminClient();

  const [{ data: consultantsRaw }, { data: providers }, { data: templates }] =
    await Promise.all([
      supabase
        .from("consultants")
        .select("id, profiles!consultants_id_fkey(first_name, last_name)")
        .eq("is_active", true),
      supabase.from("training_providers").select("id, name").order("name"),
      supabase
        .from("formation_templates")
        .select(
          "id, title, category, summary_html, objectives_html, program_html, audience_html",
        )
        .order("title"),
    ]);

  const consultants = (consultantsRaw ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    profiles: c.profiles as {
      first_name: string | null;
      last_name: string | null;
    } | null,
  }));

  return (
    <FormationForm
      consultants={consultants}
      providers={providers ?? []}
      templates={templates ?? []}
      mode="create"
    />
  );
};

export default NewFormationPage;

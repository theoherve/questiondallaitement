import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormationForm } from "../../_components/formation-form";
import { getFormationRegistrationsCount } from "../../actions";
import type { Formation } from "@/types";

export const metadata: Metadata = {
  title: "Modifier la formation",
};

type Props = {
  params: Promise<{ id: string }>;
};

const EditFormationPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;
  const supabase = createAdminClient();

  const [
    formationResult,
    consultantsResult,
    providersResult,
    templatesResult,
    registrationsCount,
  ] = await Promise.all([
    supabase.from("formations").select("*").eq("id", id).single(),
    supabase
      .from("consultants")
      .select("id, profiles!consultants_id_fkey(first_name, last_name)")
      .eq("is_active", true),
    supabase.from("training_providers").select("id, name").order("name"),
    supabase.from("formation_templates").select("id, title, category").order("title"),
    getFormationRegistrationsCount(id),
  ]);

  if (formationResult.error || !formationResult.data) {
    notFound();
  }

  const formation = formationResult.data as Formation;
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
    <FormationForm
      formation={formation}
      consultants={consultants}
      providers={providersResult.data ?? []}
      templates={templatesResult.data ?? []}
      mode="edit"
      registrationsCount={registrationsCount}
    />
  );
};

export default EditFormationPage;

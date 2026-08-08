import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormationTemplateForm } from "../../_components/formation-template-form";
import type { FormationTemplate } from "@/types";

export const metadata: Metadata = {
  title: "Modifier la fiche de formation",
};

type Props = {
  params: Promise<{ id: string }>;
};

const EditFormationTemplatePage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;
  const supabase = createAdminClient();

  const [templateResult, attachedResult] = await Promise.all([
    supabase.from("formation_templates").select("*").eq("id", id).single(),
    supabase
      .from("formations")
      .select("*", { count: "exact", head: true })
      .eq("template_id", id),
  ]);

  if (templateResult.error || !templateResult.data) {
    notFound();
  }

  return (
    <FormationTemplateForm
      template={templateResult.data as FormationTemplate}
      mode="edit"
      attachedCount={attachedResult.count ?? 0}
    />
  );
};

export default EditFormationTemplatePage;

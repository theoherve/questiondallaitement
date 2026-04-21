import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { TemplateForm } from "../../../_components/template-form";
import {
  getTemplate,
  updateTemplate,
  deleteTemplate,
  restoreTemplateDesign,
} from "../../../actions";
import { DEFAULT_TEMPLATE_DESIGNS } from "@/lib/emails/default-template-designs";

export const metadata: Metadata = {
  title: "Modifier le template",
};

const EditTemplatePage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  const hasDefaultDesign = Boolean(DEFAULT_TEMPLATE_DESIGNS[template.name]);

  return (
    <TemplateForm
      template={template}
      hasDefaultDesign={hasDefaultDesign}
      onSave={async (data) => {
        "use server";
        return updateTemplate(id, data);
      }}
      onDelete={async () => {
        "use server";
        return deleteTemplate(id);
      }}
      onRestoreDefault={async () => {
        "use server";
        return restoreTemplateDesign(template.name);
      }}
    />
  );
};

export default EditTemplatePage;

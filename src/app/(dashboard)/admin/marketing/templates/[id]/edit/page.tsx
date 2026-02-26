import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { TemplateForm } from "../../../_components/template-form";
import { getTemplate, updateTemplate, deleteTemplate } from "../../../actions";

export const metadata: Metadata = {
  title: "Modifier le template",
};

const EditTemplatePage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");

  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  return (
    <TemplateForm
      template={template}
      onSave={async (data) => {
        "use server";
        return updateTemplate(id, data);
      }}
      onDelete={async () => {
        "use server";
        return deleteTemplate(id);
      }}
    />
  );
};

export default EditTemplatePage;

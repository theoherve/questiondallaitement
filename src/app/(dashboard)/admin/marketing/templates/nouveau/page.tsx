import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TemplateForm } from "../../_components/template-form";
import { createTemplate } from "../../actions";

export const metadata: Metadata = {
  title: "Nouveau template",
};

const NewTemplatePage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  return (
    <TemplateForm
      defaultTestEmail={user.email ?? ""}
      onSave={async (data) => {
        "use server";
        return createTemplate(data);
      }}
    />
  );
};

export default NewTemplatePage;

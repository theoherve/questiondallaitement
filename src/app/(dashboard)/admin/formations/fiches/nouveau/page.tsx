import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { FormationTemplateForm } from "../_components/formation-template-form";

export const metadata: Metadata = {
  title: "Nouvelle fiche de formation",
};

const NewFormationTemplatePage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  return <FormationTemplateForm mode="create" />;
};

export default NewFormationTemplatePage;

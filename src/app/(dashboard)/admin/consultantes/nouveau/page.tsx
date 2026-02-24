import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PromoteConsultantForm } from "../_components/promote-consultant-form";

export const metadata: Metadata = {
  title: "Promouvoir un utilisateur en consultante",
};

const NouvelleConsultantePage = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/admin");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Promouvoir un utilisateur en consultante
      </h1>
      <p className="text-sm text-muted-foreground">
        Recherchez un utilisateur existant et définissez ses paramètres de
        consultante. L&apos;utilisateur doit déjà avoir un compte sur la
        plateforme.
      </p>
      <PromoteConsultantForm />
    </div>
  );
};

export default NouvelleConsultantePage;

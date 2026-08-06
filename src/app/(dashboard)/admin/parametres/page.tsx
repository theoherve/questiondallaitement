import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPlatformSettings } from "./actions";
import { getEmailBranding } from "@/lib/emails/branding-store";
import { SettingsForm } from "./_components/settings-form";
import { EmailBrandingForm } from "./_components/email-branding-form";

export const metadata: Metadata = {
  title: "Paramètres plateforme",
};

const ParametresPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/admin");

  const [settings, branding] = await Promise.all([
    getPlatformSettings(),
    getEmailBranding(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Paramètres plateforme
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuration globale de la plateforme. Ces paramètres s&apos;appliquent à
          toutes les consultantes et tous les clients.
        </p>
      </div>
      <SettingsForm settings={settings} />

      <div className="border-t pt-8">
        <h2 className="font-serif text-xl font-bold text-primary-green">
          Identité visuelle des emails
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Logo, pied de page et bannière utilisés dans tous les emails envoyés par
          la plateforme.
        </p>
      </div>
      <EmailBrandingForm branding={branding} />
    </div>
  );
};

export default ParametresPage;

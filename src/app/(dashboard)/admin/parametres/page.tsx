import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlatformSettings } from "./actions";
import { getEmailBranding } from "@/lib/emails/branding-store";
import { getEmailSender } from "@/lib/settings/email-sender/store";
import { getAnnouncementBanner } from "@/lib/announcement-banner/store";
import { getSeoDefaults } from "@/lib/settings/seo-defaults/store";
import { getSocialLinks } from "@/lib/settings/social-links/store";
import { getFeatureFlags } from "@/lib/settings/feature-flags/store";
import { SettingsForm } from "./_components/settings-form";
import { EmailBrandingForm } from "./_components/email-branding-form";
import { EmailSenderForm } from "./_components/email-sender-form";
import { AnnouncementBannerForm } from "./_components/announcement-banner-form";
import { SeoDefaultsForm } from "./_components/seo-defaults-form";
import { SocialLinksForm } from "./_components/social-links-form";
import { FeatureFlagsForm } from "./_components/feature-flags-form";

export const metadata: Metadata = {
  title: "Paramètres plateforme",
};

const ParametresPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/admin");

  const [settings, branding, sender, banner, seoDefaults, socialLinks, featureFlags] =
    await Promise.all([
      getPlatformSettings(),
      getEmailBranding(),
      getEmailSender(),
      getAnnouncementBanner(),
      getSeoDefaults(),
      getSocialLinks(),
      getFeatureFlags(),
    ]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Paramètres plateforme
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuration globale de la plateforme. Ces paramètres s&apos;appliquent à
          toutes les consultantes et tous les clients.
        </p>
      </div>

      <Tabs defaultValue="plateforme">
        <TabsList variant="line">
          <TabsTrigger value="plateforme">Plateforme</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="bandeau">Bandeau d&apos;annonce</TabsTrigger>
          <TabsTrigger value="contact">Contact &amp; réseaux</TabsTrigger>
          <TabsTrigger value="flags">Feature flags</TabsTrigger>
        </TabsList>

        <TabsContent value="plateforme" className="pt-6">
          <SettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="email" className="space-y-6 pt-6">
          <EmailSenderForm sender={sender} />
          <EmailBrandingForm branding={branding} />
        </TabsContent>

        <TabsContent value="bandeau" className="pt-6">
          <AnnouncementBannerForm banner={banner} />
        </TabsContent>

        <TabsContent value="contact" className="space-y-6 pt-6">
          <SeoDefaultsForm defaults={seoDefaults} />
          <SocialLinksForm links={socialLinks} />
        </TabsContent>

        <TabsContent value="flags" className="pt-6">
          <FeatureFlagsForm flags={featureFlags} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParametresPage;

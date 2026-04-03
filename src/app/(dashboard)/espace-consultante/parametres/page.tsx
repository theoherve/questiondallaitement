import { Metadata } from "next";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "./_components/profile-tab";
import { LocationsTab } from "./_components/locations-tab";
import { ConsultationTypesTab } from "./_components/consultation-types-tab";
import { AvailabilitiesTab } from "./_components/availabilities-tab";
import { ExceptionsTab } from "./_components/exceptions-tab";
import { IntegrationsTab } from "./_components/integrations-tab";
import {
  getLocations,
  getConsultationTypes,
  getAvailabilities,
  getExceptions,
} from "./actions";
import { getLocationConfigs } from "@/app/(dashboard)/admin/reservation/actions";
import { getAuthorizationUrl } from "@/lib/zoom/client";

export const metadata: Metadata = {
  title: "Paramètres consultante",
};

const ConsultantSettingsPage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const [profileRes, consultantRes, locations, consultationTypes, availabilities, exceptions, locationConfigs] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("consultants").select("*").eq("id", user.id).single(),
      getLocations(),
      getConsultationTypes(),
      getAvailabilities(),
      getExceptions(),
      getLocationConfigs(),
    ]);

  const profile = profileRes.data;
  const consultant = consultantRes.data;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Paramètres
      </h1>

      <Tabs defaultValue="profil">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="lieux">Lieux</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
          <TabsTrigger value="disponibilites">Disponibilités</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
          <TabsTrigger value="integrations">Intégrations</TabsTrigger>
        </TabsList>

        <TabsContent value="profil" className="mt-6">
          <ProfileTab profile={profile} consultant={consultant} />
        </TabsContent>

        <TabsContent value="lieux" className="mt-6">
          <LocationsTab locations={locations} locationConfigs={locationConfigs} />
        </TabsContent>

        <TabsContent value="consultations" className="mt-6">
          <ConsultationTypesTab types={consultationTypes} />
        </TabsContent>

        <TabsContent value="disponibilites" className="mt-6">
          <AvailabilitiesTab availabilities={availabilities} />
        </TabsContent>

        <TabsContent value="exceptions" className="mt-6">
          <ExceptionsTab exceptions={exceptions} />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsTab
            stripeStatus={consultant?.stripe_account_status ?? "pending"}
            zoomConnected={!!consultant?.zoom_access_token}
            zoomAuthUrl={getAuthorizationUrl(user.id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsultantSettingsPage;

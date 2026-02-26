import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { CampaignForm } from "../../../_components/campaign-form";
import {
  getCampaign,
  getBrevoLists,
  updateCampaign,
  sendCampaign,
  deleteCampaign,
  scheduleCampaign,
} from "../../../actions";

export const metadata: Metadata = {
  title: "Modifier la campagne",
};

const EditCampaignPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");

  const { id } = await params;

  const [campaign, brevoLists] = await Promise.all([
    getCampaign(id),
    getBrevoLists(),
  ]);

  if (!campaign) notFound();

  const availableLists = brevoLists.map((l) => ({
    brevo_list_id: l.id,
    list_name: `${l.name} (${l.totalSubscribers} contacts)`,
  }));

  return (
    <CampaignForm
      campaign={campaign}
      availableLists={availableLists}
      backHref="/admin/marketing"
      onSave={async (data) => {
        "use server";
        const result = await updateCampaign(id, data);
        return { ...result, data: undefined };
      }}
      onSend={async () => {
        "use server";
        return sendCampaign(id);
      }}
      onDelete={async () => {
        "use server";
        return deleteCampaign(id);
      }}
      onSchedule={async (_id, scheduledAt) => {
        "use server";
        return scheduleCampaign(id, scheduledAt);
      }}
    />
  );
};

export default EditCampaignPage;

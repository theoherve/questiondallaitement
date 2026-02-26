import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CampaignForm } from "../../_components/campaign-form";
import { getBrevoLists } from "../../actions";
import { createCampaign } from "../../actions";

export const metadata: Metadata = {
  title: "Nouvelle campagne",
};

const NewCampaignPage = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");

  const brevoLists = await getBrevoLists();

  // Map Brevo lists to the format expected by the form
  const availableLists = brevoLists.map((l) => ({
    brevo_list_id: l.id,
    list_name: `${l.name} (${l.totalSubscribers} contacts)`,
  }));

  return (
    <CampaignForm
      availableLists={availableLists}
      backHref="/admin/marketing"
      onSave={async (data) => {
        "use server";
        return createCampaign(data);
      }}
    />
  );
};

export default NewCampaignPage;

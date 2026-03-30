import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CampaignForm } from "@/app/(dashboard)/admin/marketing/_components/campaign-form";
import { createMyCampaign } from "../actions";

export const metadata: Metadata = {
  title: "Nouvelle campagne",
};

const NewConsultantCampaignPage = async () => {
  const user = await getSessionUser();
  if (!user || (!user.roles.includes("consultant") && !user.roles.includes("admin"))) {
    redirect("/connexion");
  }

  const supabase = createAdminClient();
  const { data: lists } = await supabase
    .from("consultant_brevo_lists")
    .select("*")
    .eq("consultant_id", user.id)
    .order("created_at", { ascending: true });

  if (!lists || lists.length === 0) {
    redirect("/espace-consultante/emails");
  }

  return (
    <CampaignForm
      availableLists={lists}
      backHref="/espace-consultante/emails"
      onSave={async (data) => {
        "use server";
        return createMyCampaign(data);
      }}
    />
  );
};

export default NewConsultantCampaignPage;

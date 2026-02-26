import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { CampaignForm } from "@/app/(dashboard)/admin/marketing/_components/campaign-form";
import {
  updateMyCampaign,
  sendMyCampaign,
  deleteMyCampaign,
} from "../../actions";

export const metadata: Metadata = {
  title: "Modifier la campagne",
};

const EditConsultantCampaignPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const user = await getSessionUser();
  if (!user || (user.role !== "consultant" && user.role !== "admin")) {
    redirect("/connexion");
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const [campaignRes, listsRes] = await Promise.all([
    supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .eq("consultant_id", user.id)
      .single(),
    supabase
      .from("consultant_brevo_lists")
      .select("*")
      .eq("consultant_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!campaignRes.data) notFound();

  return (
    <CampaignForm
      campaign={campaignRes.data}
      availableLists={listsRes.data ?? []}
      backHref="/espace-consultante/emails"
      onSave={async (data) => {
        "use server";
        const result = await updateMyCampaign(id, data);
        return { ...result, data: undefined };
      }}
      onSend={async () => {
        "use server";
        return sendMyCampaign(id);
      }}
      onDelete={async () => {
        "use server";
        return deleteMyCampaign(id);
      }}
    />
  );
};

export default EditConsultantCampaignPage;

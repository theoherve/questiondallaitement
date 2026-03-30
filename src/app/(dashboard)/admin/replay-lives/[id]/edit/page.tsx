import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReplayLiveForm } from "../../_components/replay-live-form";

export const metadata: Metadata = {
  title: "Modifier le replay",
};

type Props = {
  params: Promise<{ id: string }>;
};

const EditReplayLivePage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: live } = await supabase
    .from("replay_lives")
    .select("*")
    .eq("id", id)
    .single();

  if (!live) notFound();

  return <ReplayLiveForm mode="edit" live={live} />;
};

export default EditReplayLivePage;

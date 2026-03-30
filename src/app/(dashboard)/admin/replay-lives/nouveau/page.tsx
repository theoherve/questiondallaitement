import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ReplayLiveForm } from "../_components/replay-live-form";

export const metadata: Metadata = {
  title: "Ajouter un replay",
};

const NewReplayLivePage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  return <ReplayLiveForm mode="create" />;
};

export default NewReplayLivePage;

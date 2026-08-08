import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BioLinkForm } from "../_components/bio-link-form";

export const metadata: Metadata = {
  title: "Nouvelle entrée",
};

const NouveauLienPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const supabase = createAdminClient();
  const { data: featured } = await supabase
    .from("bio_links")
    .select("title")
    .eq("is_featured", true)
    .limit(1)
    .maybeSingle();

  return (
    <BioLinkForm mode="create" currentFeaturedTitle={featured?.title ?? null} />
  );
};

export default NouveauLienPage;

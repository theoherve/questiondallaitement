import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BioLink } from "@/types/database";
import { BioLinkForm } from "../../_components/bio-link-form";

export const metadata: Metadata = {
  title: "Modifier l'entrée",
};

const EditLienPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: link }, { data: featured }] = await Promise.all([
    supabase.from("bio_links").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("bio_links")
      .select("title")
      .eq("is_featured", true)
      .neq("id", id)
      .limit(1)
      .maybeSingle(),
  ]);

  if (!link) notFound();

  return (
    <BioLinkForm
      mode="edit"
      link={link as BioLink}
      currentFeaturedTitle={featured?.title ?? null}
    />
  );
};

export default EditLienPage;

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormationEditor } from "../../_components/formation-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Modifier la formation",
};

const AdminEditFormationPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: formation } = await supabase
    .from("formations")
    .select(
      `
      *,
      formation_sections (
        id,
        title,
        position,
        formation_blocks (
          id,
          type,
          content,
          position
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!formation) notFound();

  const { data: consultants } = await supabase
    .from("consultants")
    .select("id, profiles!inner(first_name, last_name)")
    .eq("is_active", true)
    .order("profiles(last_name)");

  type ConsultantOption = {
    id: string;
    profiles: { first_name: string | null; last_name: string | null };
  };

  type SectionData = {
    id: string;
    title: string;
    position: number;
    formation_blocks: {
      id: string;
      type: string;
      content: Record<string, unknown>;
      position: number;
    }[];
  };

  const sections = (
    (formation.formation_sections ?? []) as unknown as SectionData[]
  )
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      ...s,
      formation_blocks: s.formation_blocks.sort(
        (a, b) => a.position - b.position
      ),
    }));

  return (
    <FormationEditor
      formation={{
        id: formation.id,
        title: formation.title,
        slug: formation.slug,
        description: formation.description,
        short_description: formation.short_description,
        long_description_html: (formation as Record<string, unknown>).long_description_html as string | null,
        thumbnail_url: formation.thumbnail_url,
        price_cents: formation.price_cents,
        status: formation.status,
        consultant_id: formation.consultant_id,
      }}
      sections={sections}
      consultants={(consultants ?? []) as unknown as ConsultantOption[]}
    />
  );
};

export default AdminEditFormationPage;

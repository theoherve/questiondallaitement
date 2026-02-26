import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormationEditor } from "@/app/(dashboard)/admin/formations/_components/formation-editor";
import { CollaboratorManager } from "@/app/(dashboard)/admin/formations/_components/collaborator-manager";
import { getFormationCollaborators } from "@/app/(dashboard)/admin/formations/actions";

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
    .select("id, profiles!consultants_id_fkey(first_name, last_name)")
    .eq("is_active", true);

  type ConsultantRow = {
    id: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  };

  const defaultProfile = {
    first_name: null as string | null,
    last_name: null as string | null,
  };

  const consultantOptions = (
    (consultants ?? []) as unknown as ConsultantRow[]
  )
    .map((c) => ({
      id: c.id,
      profiles: c.profiles ?? defaultProfile,
    }))
    .sort((a, b) => {
      const aName = `${a.profiles.last_name ?? ""} ${a.profiles.first_name ?? ""}`.trim();
      const bName = `${b.profiles.last_name ?? ""} ${b.profiles.first_name ?? ""}`.trim();
      return aName.localeCompare(bName);
    });

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

  const collaborators = await getFormationCollaborators(id);

  return (
    <>
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
        consultants={consultantOptions}
      />
      <div className="mx-auto mt-6 max-w-4xl">
        <CollaboratorManager
          formationId={formation.id}
          collaborators={collaborators}
          consultants={consultantOptions}
          mainConsultantId={formation.consultant_id}
        />
      </div>
    </>
  );
};

export default AdminEditFormationPage;

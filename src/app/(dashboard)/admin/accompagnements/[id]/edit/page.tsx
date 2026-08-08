import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccompagnementEditor } from "@/app/(dashboard)/admin/accompagnements/_components/accompagnement-editor";
import { CollaboratorManager } from "@/app/(dashboard)/admin/accompagnements/_components/collaborator-manager";
import {
  EnrollmentsSheet,
  type EnrollmentRow,
} from "@/app/(dashboard)/admin/accompagnements/_components/enrollments-sheet";
import { getAccompagnementCollaborators } from "@/app/(dashboard)/admin/accompagnements/actions";
import { listSnippets } from "@/lib/wysiwyg-snippets/actions";
import { WysiwygSnippetsProvider } from "@/lib/wysiwyg-snippets/context";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Modifier l'accompagnement",
};

const AdminEditAccompagnementPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: accompagnement } = await supabase
    .from("accompagnements")
    .select(
      `
      *,
      accompagnement_sections (
        id,
        title,
        position,
        sales_hook,
        accompagnement_blocks (
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

  if (!accompagnement) notFound();

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
    sales_hook: string | null;
    accompagnement_blocks: {
      id: string;
      type: string;
      content: Record<string, unknown>;
      position: number;
    }[];
  };

  const sections = (
    (accompagnement.accompagnement_sections ?? []) as unknown as SectionData[]
  )
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      ...s,
      accompagnement_blocks: s.accompagnement_blocks.sort(
        (a, b) => a.position - b.position
      ),
    }));

  const collaborators = await getAccompagnementCollaborators(id);
  const snippets = await listSnippets();

  const { data: enrollmentsRaw } = await supabase
    .from("accompagnement_enrollments")
    .select(
      `id, enrolled_at, source, client:profiles!accompagnement_enrollments_client_id_fkey (id, email, first_name, last_name)`,
    )
    .eq("accompagnement_id", id)
    .order("enrolled_at", { ascending: false });

  const enrollments: EnrollmentRow[] = (
    (enrollmentsRaw ?? []) as unknown as {
      id: string;
      enrolled_at: string;
      source: "stripe" | "manual" | null;
      client: {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
      } | null;
    }[]
  )
    .filter((e) => e.client !== null)
    .map((e) => ({
      id: e.id,
      enrolled_at: e.enrolled_at,
      source: (e.source ?? "stripe") as "stripe" | "manual",
      client: e.client!,
    }));

  return (
    <WysiwygSnippetsProvider initialSnippets={snippets}>
      <AccompagnementEditor
        accompagnement={{
          id: accompagnement.id,
          title: accompagnement.title,
          slug: accompagnement.slug,
          description: accompagnement.description,
          short_description: accompagnement.short_description,
          long_description_html: (accompagnement as Record<string, unknown>).long_description_html as string | null,
          thumbnail_url: accompagnement.thumbnail_url,
          price_cents: accompagnement.price_cents,
          status: accompagnement.status,
          consultant_id: accompagnement.consultant_id,
        }}
        sections={sections}
        consultants={consultantOptions}
        headerActions={
          <EnrollmentsSheet
            accompagnementId={accompagnement.id}
            accompagnementTitle={accompagnement.title}
            enrollments={enrollments}
          />
        }
      />
      <div className="mx-auto mt-6 max-w-4xl">
        <CollaboratorManager
          accompagnementId={accompagnement.id}
          collaborators={collaborators}
          consultants={consultantOptions}
          mainConsultantId={accompagnement.consultant_id}
        />
      </div>
    </WysiwygSnippetsProvider>
  );
};

export default AdminEditAccompagnementPage;

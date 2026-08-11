import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { isBookingEnabled } from "@/lib/settings/feature-flags/store";
import { AccompagnementReader } from "./_components/accompagnement-reader";

type Props = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { id } = await params;
  const { supabase } = await getSupabaseAndUser();
  const { data } = await supabase
    .from("accompagnements")
    .select("title")
    .eq("id", id)
    .single();

  return { title: data?.title ?? "Accompagnement" };
};

const AccompagnementReaderPage = async ({ params }: Props) => {
  const { id } = await params;
  const { supabase, user } = await getSupabaseAndUser();

  const { data: enrollment } = await supabase
    .from("accompagnement_enrollments")
    .select("id")
    .eq("client_id", user.id)
    .eq("accompagnement_id", id)
    .single();

  if (!enrollment) redirect("/espace-client/accompagnements");

  const { data: accompagnement } = await supabase
    .from("accompagnements")
    .select(
      `
      id,
      title,
      description,
      accompagnement_sections (
        id,
        title,
        position,
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
    .is("deleted_at", null)
    .single();

  if (!accompagnement) notFound();

  const bookingEnabled = await isBookingEnabled();

  const [progressResult, bookmarksResult] = await Promise.all([
    supabase
      .from("accompagnement_progress")
      .select("block_id, completed")
      .eq("enrollment_id", enrollment.id),
    supabase
      .from("accompagnement_bookmarks")
      .select("block_id")
      .eq("enrollment_id", enrollment.id),
  ]);

  const completedBlockIds = new Set(
    (progressResult.data ?? [])
      .filter((p) => p.completed)
      .map((p) => p.block_id)
  );
  const bookmarkedBlockIds = (bookmarksResult.data ?? []).map(
    (b) => b.block_id
  );

  const sections = (accompagnement.accompagnement_sections ?? [])
    .sort(
      (a: { position: number }, b: { position: number }) =>
        a.position - b.position
    )
    .map((section: { id: string; title: string; position: number; accompagnement_blocks?: { id: string; type: string; content: unknown; position: number }[] }) => ({
      ...section,
      accompagnement_blocks: (section.accompagnement_blocks ?? []).sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position
      ),
    }));

  const totalBlocks = sections.reduce(
    (acc: number, s: { accompagnement_blocks?: unknown[] }) =>
      acc + (s.accompagnement_blocks?.length ?? 0),
    0
  );
  const completedCount = completedBlockIds.size;

  type DownloadContent = {
    url?: string;
    filename?: string;
    size_bytes?: number;
  };
  const resources = sections.flatMap(
    (section: {
      id: string;
      title: string;
      accompagnement_blocks: { id: string; type: string; content: unknown }[];
    }) =>
      section.accompagnement_blocks
        .filter((b) => b.type === "download")
        .map((b) => {
          const c = (b.content ?? {}) as DownloadContent;
          return {
            blockId: b.id,
            sectionId: section.id,
            sectionTitle: section.title,
            url: c.url ?? "",
            filename: c.filename ?? "Fichier",
            sizeBytes: c.size_bytes ?? 0,
          };
        })
        .filter((r) => r.url)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AccompagnementReader
        accompagnement={{
          id: accompagnement.id,
          title: accompagnement.title,
          description: accompagnement.description,
        }}
        sections={sections}
        enrollmentId={enrollment.id}
        completedBlockIds={Array.from(completedBlockIds)}
        bookmarkedBlockIds={bookmarkedBlockIds}
        resources={resources}
        totalBlocks={totalBlocks}
        completedCount={completedCount}
        bookingEnabled={bookingEnabled}
      />
    </div>
  );
};

export default AccompagnementReaderPage;

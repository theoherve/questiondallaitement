import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fetchVimeoThumbnail } from "@/lib/vimeo";
import { ReplayHero } from "./_components/replay-hero";
import { ReplayCarousel } from "./_components/replay-carousel";
import type { ReplayLive } from "@/types/database";

export const metadata: Metadata = {
  title: "Replay Ateliers Mensuels",
  description:
    "Retrouvez les replays des ateliers mensuels de Carole Hervé, consultante en lactation IBCLC.",
  robots: { index: false, follow: false },
};

export type ReplayLiveWithThumbnail = ReplayLive & {
  thumbnailUrl: string | null;
};

const ReplayLivesPage = async () => {
  const supabase = await createClient();

  const { data: lives } = await supabase
    .from("replay_lives")
    .select("*")
    .order("live_date", { ascending: false });

  if (!lives || lives.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background-beige px-4">
        <div className="text-center">
          <p className="font-serif text-2xl font-medium text-primary-green">
            Bientôt disponible
          </p>
          <p className="mt-2 font-sans text-sm text-muted-foreground">
            Le premier replay sera disponible après l&apos;atelier mensuel.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all thumbnails in parallel (cached 1h by Next.js)
  const thumbnails = await Promise.all(
    lives.map((live) => fetchVimeoThumbnail(live.vimeo_url)),
  );

  const livesWithThumbnails: ReplayLiveWithThumbnail[] = lives.map(
    (live, i) => ({ ...live, thumbnailUrl: thumbnails[i] }),
  );

  const [featured, ...archives] = livesWithThumbnails;

  return (
    <div className="min-h-screen bg-background-beige">
      <ReplayHero live={featured} />
      <ReplayCarousel lives={archives} />
    </div>
  );
};

export default ReplayLivesPage;

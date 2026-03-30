import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { getVimeoEmbedUrl } from "@/lib/vimeo";
import type { ReplayLive } from "@/types/database";

type ReplayHeroProps = {
  live: ReplayLive;
};

export const ReplayHero = ({ live }: ReplayHeroProps) => {
  const embedUrl = getVimeoEmbedUrl(live.vimeo_url);
  const formattedDate = format(new Date(live.live_date), "d MMMM yyyy", {
    locale: fr,
  });

  return (
    <section className="bg-background-beige-dark py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Label */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-red/20 bg-primary-red/5 px-4 py-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary-red" aria-hidden />
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
              Dernier atelier
            </p>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-center font-serif text-3xl font-medium text-primary-green md:text-4xl">
          {live.title}
        </h1>

        {/* Date */}
        <p className="mb-8 text-center font-sans text-sm text-muted-foreground">
          {formattedDate}
        </p>

        {/* Video */}
        {embedUrl ? (
          <div className="relative aspect-video overflow-hidden rounded-2xl shadow-lg">
            <iframe
              src={embedUrl}
              title={live.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
              loading="eager"
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-2xl bg-secondary text-sm text-muted-foreground">
            Vidéo non disponible
          </div>
        )}

        {/* Description */}
        {live.description && (
          <div
            className="prose prose-sm mx-auto mt-6 max-w-2xl font-sans text-primary-green/80 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_em]:italic [&_a]:text-primary-red [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary-red/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:font-serif [&_h2]:font-medium [&_h3]:font-serif [&_h3]:font-medium"
            dangerouslySetInnerHTML={{ __html: live.description }}
          />
        )}
      </div>
    </section>
  );
};

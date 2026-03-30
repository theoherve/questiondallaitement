"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getVimeoEmbedUrl } from "@/lib/vimeo";
import type { ReplayLiveWithThumbnail } from "../page";

type ReplayCardProps = {
  live: ReplayLiveWithThumbnail;
};

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export const ReplayCard = ({ live }: ReplayCardProps) => {
  const [open, setOpen] = useState(false);

  const formattedDate = format(new Date(live.live_date), "MMMM yyyy", {
    locale: fr,
  });
  const formattedDateFull = format(new Date(live.live_date), "d MMMM yyyy", {
    locale: fr,
  });
  const embedUrl = getVimeoEmbedUrl(live.vimeo_url);
  const plainDescription = live.description ? stripHtml(live.description) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
        aria-label={`Regarder le replay : ${live.title}`}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-secondary">
          {live.thumbnailUrl ? (
            <Image
              src={live.thumbnailUrl}
              alt={`Miniature — ${live.title}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 30vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary-green to-primary-green-light">
              <Play className="h-10 w-10 text-white/60" aria-hidden />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play className="h-5 w-5 fill-primary-red text-primary-red" aria-hidden />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          {/* Date badge */}
          <span className="mb-3 inline-block self-start rounded-full bg-primary-red px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wider text-white">
            {formattedDate}
          </span>

          {/* Title */}
          <h3 className="mb-2 font-serif text-base font-medium leading-snug text-primary-green">
            {live.title}
          </h3>

          {/* Description preview */}
          {plainDescription && (
            <p className="line-clamp-2 font-sans text-xs leading-relaxed text-muted-foreground">
              {plainDescription}
            </p>
          )}
        </div>
      </button>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-medium text-primary-green">
              {live.title}
            </DialogTitle>
            <p className="font-sans text-sm text-muted-foreground">
              {formattedDateFull}
            </p>
          </DialogHeader>

          {embedUrl ? (
            <div className="relative aspect-video overflow-hidden rounded-lg">
              <iframe
                src={embedUrl}
                title={live.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg bg-secondary text-sm text-muted-foreground">
              Vidéo non disponible
            </div>
          )}

          {live.description && (
            <div
              className="prose prose-sm font-sans text-primary-green/80 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_em]:italic [&_a]:text-primary-red [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary-red/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:font-serif [&_h2]:font-medium [&_h3]:font-serif [&_h3]:font-medium"
              dangerouslySetInnerHTML={{ __html: live.description }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

"use client";

import { ArrowUpRight } from "lucide-react";
import type { BioLink } from "@/types/database";
import { BioThumbnail } from "./bio-thumbnail";
import { isExternal } from "./is-external";
import { trackBioLinkClick } from "./track-click";

type BioLinkCardProps = {
  link: BioLink;
};

export const BioLinkCard = ({ link }: BioLinkCardProps) => (
  <a
    href={link.url ?? "#"}
    // Nos propres pages s'ouvrent dans le même onglet : la page de liens est
    // une porte d'entrée, pas un annuaire à garder ouvert derrière soi. Les
    // destinations externes, elles, la préservent.
    {...(isExternal(link.url)
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {})}
    onClick={() => trackBioLinkClick(link.id)}
    className="group flex min-h-15 items-center gap-3 rounded-2xl border border-primary-green/10 bg-accent-cream px-3 py-3 transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary-red/40 hover:shadow-[0_2px_16px_-6px_rgba(160,40,62,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red motion-safe:hover:-translate-y-px"
  >
    {link.thumbnail_url && (
      <BioThumbnail
        src={link.thumbnail_url}
        size={48}
        className="h-12 w-12 shrink-0 rounded-xl object-cover"
      />
    )}

    <span className="min-w-0 flex-1">
      <span className="block text-[0.9375rem] font-medium leading-snug text-primary-green">
        {link.title}
      </span>
      {link.subtitle && (
        <span className="mt-0.5 block text-xs leading-snug text-primary-green/60">
          {link.subtitle}
        </span>
      )}
    </span>

    <ArrowUpRight
      className="h-4 w-4 shrink-0 text-primary-green/30 transition-colors group-hover:text-primary-red"
      aria-hidden="true"
    />
  </a>
);

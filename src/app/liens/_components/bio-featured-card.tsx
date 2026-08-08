"use client";

import { ArrowUpRight } from "lucide-react";
import type { BioLink } from "@/types/database";
import { BioThumbnail } from "./bio-thumbnail";
import { isExternal } from "./is-external";
import { trackBioLinkClick } from "./track-click";

type BioFeaturedCardProps = {
  link: BioLink;
};

/**
 * La seule carte pleine largeur de la page : vignette en fond, voile pêche,
 * titre en serif. Toute la hiérarchie de la page repose sur le fait qu'elle
 * reste unique, d'où l'avertissement affiché en administration quand une
 * deuxième mise en avant est activée.
 */
export const BioFeaturedCard = ({ link }: BioFeaturedCardProps) => (
  <a
    href={link.url ?? "#"}
    {...(isExternal(link.url)
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {})}
    onClick={() => trackBioLinkClick(link.id)}
    className="group relative flex min-h-38 flex-col justify-end overflow-hidden rounded-2xl bg-primary-green px-4 pb-4 pt-16 transition-shadow duration-200 hover:shadow-[0_6px_28px_-10px_rgba(32,54,52,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red"
  >
    {link.thumbnail_url && (
      <BioThumbnail
        src={link.thumbnail_url}
        size={640}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
      />
    )}

    {/*
      Voile volontairement dense, pas seulement pour le contraste : les
      vignettes de Carole sont souvent des affiches qui portent déjà leur propre
      titre. Sans un fond franc, deux textes se superposent et aucun des deux ne
      se lit.
    */}
    <span
      aria-hidden="true"
      className="absolute inset-0 bg-linear-to-t from-primary-green-dark via-primary-green-dark/92 to-primary-green-dark/55"
    />

    <span className="relative flex items-end gap-3">
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-lg leading-snug text-white">
          {link.title}
        </span>
        {link.subtitle && (
          <span className="mt-1 block text-xs leading-snug text-accent-peach-soft">
            {link.subtitle}
          </span>
        )}
      </span>
      <ArrowUpRight
        className="h-5 w-5 shrink-0 text-accent-peach"
        aria-hidden="true"
      />
    </span>
  </a>
);

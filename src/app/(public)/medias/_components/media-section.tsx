"use client";

import { useState } from "react";
import {
  Headphones,
  Play,
  ExternalLink,
  Clock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PODCASTS, VIDEOS, type MediaItem } from "../_data/media-items";

type MediaTab = "podcasts" | "videos";

const INITIAL_VISIBLE = 6;

export function MediaSection() {
  const [activeTab, setActiveTab] = useState<MediaTab>("podcasts");
  const [expanded, setExpanded] = useState(false);

  const items = activeTab === "podcasts" ? PODCASTS : VIDEOS;
  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);
  const hasMore = items.length > INITIAL_VISIBLE;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 rounded-full border border-background-beige/15 bg-background-beige/5 p-1 sm:inline-flex">
        <button
          onClick={() => {
            setActiveTab("podcasts");
            setExpanded(false);
          }}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 font-sans text-sm font-medium transition-all duration-200",
            activeTab === "podcasts"
              ? "bg-background-beige text-primary-green"
              : "text-background-beige/60 hover:text-background-beige/80"
          )}
        >
          <Headphones className="h-4 w-4" />
          Podcasts
          <span className="text-xs opacity-60">{PODCASTS.length}</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("videos");
            setExpanded(false);
          }}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 font-sans text-sm font-medium transition-all duration-200",
            activeTab === "videos"
              ? "bg-background-beige text-primary-green"
              : "text-background-beige/60 hover:text-background-beige/80"
          )}
        >
          <Play className="h-4 w-4" />
          Vidéos
          <span className="text-xs opacity-60">{VIDEOS.length}</span>
        </button>
      </div>

      {/* Grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item, i) => (
          <MediaCard key={`${item.title}-${i}`} item={item} />
        ))}
      </div>

      {/* Show more */}
      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-8 flex cursor-pointer items-center gap-2 font-sans text-sm font-medium text-background-beige/70 transition-colors hover:text-background-beige"
        >
          <ChevronDown className="h-4 w-4" />
          Voir les {items.length - INITIAL_VISIBLE} autres{" "}
          {activeTab === "podcasts" ? "podcasts" : "vidéos"}
        </button>
      )}

      {expanded && hasMore && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-8 flex cursor-pointer items-center gap-2 font-sans text-sm font-medium text-background-beige/40 transition-colors hover:text-background-beige/60"
        >
          <ChevronDown className="h-4 w-4 rotate-180" />
          Réduire
        </button>
      )}
    </div>
  );
}

function MediaCard({ item }: { item: MediaItem }) {
  const icon =
    item.type === "podcast" ? (
      <Headphones className="h-5 w-5 text-primary-red" aria-hidden />
    ) : (
      <Play className="h-5 w-5 text-primary-red" aria-hidden />
    );

  const card = (
    <div className="group flex h-full flex-col justify-between border border-background-beige/10 bg-background-beige/5 p-6 transition-all duration-200 hover:border-background-beige/20 hover:bg-background-beige/8">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-red/10">
            {icon}
          </div>
          {item.href && (
            <ExternalLink
              className="mt-1 h-3.5 w-3.5 shrink-0 text-background-beige/30 transition-colors group-hover:text-background-beige/60"
              aria-hidden
            />
          )}
        </div>

        <h3 className="mt-4 font-serif text-base font-semibold leading-snug text-background-beige">
          {item.title}
        </h3>

        <p className="mt-2 font-sans text-sm text-background-beige/50">
          {item.show}
        </p>
      </div>

      {item.duration && (
        <div className="mt-4 flex items-center gap-1.5 text-background-beige/40">
          <Clock className="h-3 w-3" aria-hidden />
          <span className="font-sans text-xs">{item.duration}</span>
        </div>
      )}
    </div>
  );

  if (item.href) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }

  return card;
}

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReplayCard } from "./replay-card";
import type { ReplayLiveWithThumbnail } from "../page";

type ReplayCarouselProps = {
  lives: ReplayLiveWithThumbnail[];
};

export const ReplayCarousel = ({ lives }: ReplayCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by ~1 card width (320px) + gap (24px)
    el.scrollBy({ left: direction === "left" ? -344 : 344, behavior: "smooth" });
  };

  if (lives.length === 0) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-8 flex items-center gap-4">
          <h2 className="font-serif text-2xl font-medium text-primary-green md:text-3xl">
            Replays précédents
          </h2>
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-2">
            <span className="font-sans text-sm text-muted-foreground">
              {lives.length} atelier{lives.length > 1 ? "s" : ""}
            </span>
            {/* Nav arrows */}
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition-all hover:border-primary-red/30 hover:bg-primary-red/5 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Replays précédents"
            >
              <ChevronLeft className="h-4 w-4 text-primary-green" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition-all hover:border-primary-red/30 hover:bg-primary-red/5 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Replays suivants"
            >
              <ChevronRight className="h-4 w-4 text-primary-green" />
            </button>
          </div>
        </div>

        {/* Carousel track */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [scroll-snap-type:x_mandatory] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        >
          {lives.map((live) => (
            <div
              key={live.id}
              className="w-[85vw] flex-none [scroll-snap-align:start] sm:w-[45vw] lg:w-[calc((100%-48px)/3)]"
            >
              <ReplayCard live={live} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

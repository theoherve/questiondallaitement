"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormationCard } from "@/components/formations/formation-card";

type Formation = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
  consultants?: {
    slug: string;
    profiles?: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
};

export const AccompagnementsCarousel = ({
  formations,
}: {
  formations: Formation[];
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("[data-card]")?.clientWidth ?? 300;
    el.scrollBy({
      left: direction === "left" ? -cardWidth - 24 : cardWidth + 24,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="-mx-5 flex gap-6 overflow-x-auto px-5 pb-4 scrollbar-none sm:-mx-8 sm:px-8 lg:-mx-0 lg:px-0"
      >
        {formations.map((formation) => (
          <div
            key={formation.id}
            data-card
            className="w-72 shrink-0 sm:w-80"
          >
            <FormationCard formation={formation} />
          </div>
        ))}
      </div>

      {/* Navigation arrows — desktop only */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll("left")}
          className="absolute -left-4 top-1/2 hidden -translate-y-1/2 bg-white/80 text-primary-green shadow-md backdrop-blur-sm hover:bg-white lg:flex"
          aria-label="Défiler vers la gauche"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll("right")}
          className="absolute -right-4 top-1/2 hidden -translate-y-1/2 bg-white/80 text-primary-green shadow-md backdrop-blur-sm hover:bg-white lg:flex"
          aria-label="Défiler vers la droite"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

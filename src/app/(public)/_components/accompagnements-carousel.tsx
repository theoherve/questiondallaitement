"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccompagnementCard } from "@/components/accompagnements/accompagnement-card";

type Accompagnement = {
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
  accompagnements,
  label = "Tous les accompagnements",
}: {
  accompagnements: Accompagnement[];
  label?: string;
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
      left: direction === "left" ? -(cardWidth + 24) : cardWidth + 24,
      behavior: "smooth",
    });
  };

  return (
    <div>
      {/* Label */}
      <p className="mb-6 font-sans text-xs font-medium uppercase tracking-widest text-primary-green/40">
        {label}
      </p>

      {/* Scroll container + floating arrows */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="-mx-5 flex gap-6 overflow-x-auto px-5 pb-4 scrollbar-none sm:-mx-8 sm:px-8 lg:-mx-0 lg:px-0"
        >
          {accompagnements.map((accompagnement) => (
            <div key={accompagnement.id} data-card className="w-72 shrink-0 sm:w-80">
              <AccompagnementCard accompagnement={accompagnement} />
            </div>
          ))}
        </div>

        {/* Floating arrows — desktop only */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          aria-label="Défiler vers la gauche"
          className="absolute left-0 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 bg-white shadow-md hover:shadow-lg disabled:opacity-0 lg:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          aria-label="Défiler vers la droite"
          className="absolute right-0 top-1/2 hidden translate-x-1/2 -translate-y-1/2 bg-white shadow-md hover:shadow-lg disabled:opacity-0 lg:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Testimonial } from "@/data/testimonials";
import { TestimonialCard } from "./testimonial-card";

const PER_PAGE = 3;

export const TestimonialCarousel = ({
  testimonials,
}: {
  testimonials: readonly Testimonial[];
}) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(testimonials.length / PER_PAGE));

  const next = useCallback(
    () => setPage((p) => (p + 1) % totalPages),
    [totalPages]
  );
  const prev = useCallback(
    () => setPage((p) => (p - 1 + totalPages) % totalPages),
    [totalPages]
  );

  // Défilement automatique, seulement s'il y a plusieurs pages.
  useEffect(() => {
    if (totalPages < 2) return;
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [next, totalPages]);

  if (testimonials.length === 0) return null;

  const visible = testimonials.slice(
    page * PER_PAGE,
    page * PER_PAGE + PER_PAGE
  );

  return (
    <div className="py-12 lg:py-16">
      <div className="grid gap-5 md:grid-cols-3">
        {visible.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            className="text-primary-green/60 hover:bg-primary-green/5 hover:text-primary-green"
            aria-label="Témoignages précédents"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-2 transition-all ${
                  i === page
                    ? "w-6 bg-primary-red"
                    : "w-2 bg-primary-green/20 hover:bg-primary-green/40"
                }`}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            className="text-primary-green/60 hover:bg-primary-green/5 hover:text-primary-green"
            aria-label="Témoignages suivants"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
};

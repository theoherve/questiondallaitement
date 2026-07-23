"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PACK_CONTENT } from "./pack-content";

export function PackFaq() {
  const [open, setOpen] = useState<number | null>(0);
  const { title, items } = PACK_CONTENT.faq;

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center font-serif text-3xl font-bold text-primary-green sm:text-4xl">
        {title}
      </h2>
      <div className="mt-8 space-y-3">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="overflow-hidden rounded-lg border border-primary-green/10 bg-white"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-primary-green">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-primary-red transition-transform duration-300",
                    isOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-primary-green/70">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

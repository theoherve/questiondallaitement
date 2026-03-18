"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type BookNavProps = {
  items: { id: string; title: string }[];
};

export function BookNav({ items }: BookNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className="sticky top-24 h-fit"
      aria-label="Navigation entre les livres"
    >
      <div className="flex flex-col gap-1">
        <div className="mb-3 flex items-center gap-2 px-2">
          <BookOpen className="h-3.5 w-3.5 text-primary-red" />
          <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-primary-green/40">
            Sommaire
          </span>
        </div>

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={cn(
              "cursor-pointer border-l-2 px-4 py-2 text-left text-sm transition-all duration-200",
              activeId === item.id
                ? "border-primary-red bg-primary-red/5 font-semibold text-primary-red"
                : "border-transparent text-primary-green/45 hover:border-primary-green/20 hover:text-primary-green/70"
            )}
          >
            {item.title}
          </button>
        ))}
      </div>
    </nav>
  );
}

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = { title: string; priceLabel: string };

const ANCHORS = [
  { href: "#programme", label: "Programme" },
  { href: "#temoignages", label: "Témoignages" },
  { href: "#faq", label: "FAQ" },
];

export function PackStickyHeader({ title, priceLabel }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b border-primary-green/10 bg-background-beige/80 backdrop-blur-md transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <span className="hidden truncate font-serif text-sm font-semibold text-primary-green sm:block">
          {title}
        </span>
        <nav className="hidden items-center gap-6 text-sm text-primary-green/70 md:flex">
          {ANCHORS.map((a) => (
            <a key={a.href} href={a.href} className="hover:text-primary-green">
              {a.label}
            </a>
          ))}
        </nav>
        <a
          href="#tarif"
          className="inline-flex shrink-0 items-center rounded-md bg-primary-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-red-dark"
        >
          Rejoindre le pack — {priceLabel}
        </a>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = { title: string; priceLabel: string };

const ANCHORS = [
  { href: "#programme", label: "Programme" },
  { href: "#temoignages", label: "Témoignages" },
  { href: "#faq", label: "FAQ" },
];

/**
 * CTA fixe au scroll : carte verticale a droite sur desktop, barre en bas sur
 * mobile. Apparait apres le hero pour ne pas surcharger le haut de page.
 */
export function PackSideCta({ title, priceLabel }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Desktop — carte verticale fixe a droite */}
      <aside
        aria-label="Rejoindre le pack"
        className={cn(
          "fixed right-4 top-1/2 z-40 hidden w-56 -translate-y-1/2 transition-all duration-300 xl:block",
          visible
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-6 opacity-0"
        )}
      >
        <div className="rounded-xl border border-primary-green/10 bg-white/95 p-5 shadow-lg backdrop-blur-md">
          <p className="font-serif text-sm font-semibold text-primary-green">
            {title}
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-primary-red">
            {priceLabel}
          </p>
          <a
            href="#tarif"
            className="mt-3 block rounded-md bg-primary-red px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary-red-dark"
          >
            Rejoindre le pack
          </a>
          <nav className="mt-4 space-y-2 border-t border-primary-green/10 pt-3">
            {ANCHORS.map((a) => (
              <a
                key={a.href}
                href={a.href}
                className="flex items-center gap-2 text-sm text-primary-green/70 transition-colors hover:text-primary-green"
              >
                <span
                  className="h-1 w-1 rounded-full bg-primary-red"
                  aria-hidden
                />
                {a.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile / tablette — barre CTA fixe en bas */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-primary-green/10 bg-background-beige/90 backdrop-blur-md transition-all duration-300 xl:hidden",
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-serif text-sm font-semibold text-primary-green">
              {title}
            </p>
            <p className="font-serif text-base font-bold text-primary-red">
              {priceLabel}
            </p>
          </div>
          <a
            href="#tarif"
            className="shrink-0 rounded-md bg-primary-red px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-red-dark"
          >
            Rejoindre le pack
          </a>
        </div>
      </div>
    </>
  );
}

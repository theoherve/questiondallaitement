"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookOpen, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  priceLabel: string;
  imageUrl: string | null;
  sectionsCount: number;
  lessonsCount: number;
  instructorName: string;
};

/**
 * CTA fixe au scroll : carte-produit verticale a droite sur desktop
 * (image + prix + meta + achat), barre compacte en bas sur mobile. Apparait
 * apres le hero pour ne pas surcharger le haut de page.
 */
export function PackSideCta({
  title,
  priceLabel,
  imageUrl,
  sectionsCount,
  lessonsCount,
  instructorName,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const meta = [
    {
      icon: BookOpen,
      text:
        `${sectionsCount} section${sectionsCount > 1 ? "s" : ""}` +
        ` · ${lessonsCount} leçon${lessonsCount > 1 ? "s" : ""}`,
      show: sectionsCount > 0 || lessonsCount > 0,
    },
    { icon: Clock, text: "Accès illimité", show: true },
    { icon: User, text: `Par ${instructorName}`, show: true },
  ].filter((m) => m.show);

  return (
    <>
      {/* Desktop — carte-produit fixe a droite */}
      <aside
        aria-label="Rejoindre le pack"
        className={cn(
          "fixed right-5 top-1/2 z-40 hidden w-64 -translate-y-1/2 transition-all duration-500 xl:block",
          visible
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-8 opacity-0"
        )}
      >
        <div className="overflow-hidden rounded-2xl border border-primary-green/10 bg-white shadow-xl">
          {imageUrl && (
            <div className="relative aspect-4/3 w-full bg-background-beige-dark">
              <Image
                src={imageUrl}
                alt=""
                fill
                sizes="256px"
                className="object-cover"
              />
            </div>
          )}
          <div className="p-5">
            <p className="font-serif text-3xl font-bold text-primary-red">
              {priceLabel}
            </p>
            <ul className="mt-4 space-y-2.5">
              {meta.map((m) => (
                <li
                  key={m.text}
                  className="flex items-center gap-2.5 text-sm text-primary-green/70"
                >
                  <m.icon className="h-4 w-4 shrink-0 text-primary-green/50" aria-hidden />
                  <span>{m.text}</span>
                </li>
              ))}
            </ul>
            <a
              href="#tarif"
              className="mt-5 block rounded-md bg-primary-red px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-primary-red-dark"
            >
              Rejoindre le pack
            </a>
            <p className="mt-2 text-center text-xs text-primary-green/45">
              Paiement en 3x ou 4x sans frais
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile / tablette — barre CTA fixe en bas */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-primary-green/10 bg-background-beige/95 backdrop-blur-md transition-all duration-300 xl:hidden",
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

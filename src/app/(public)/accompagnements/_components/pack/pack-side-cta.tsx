"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookOpen, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { PurchaseButton } from "../purchase-button";

type Props = {
  title: string;
  priceLabel: string;
  imageUrl: string | null;
  sectionsCount: number;
  lessonsCount: number;
  instructorName: string;
  formationId: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
};

const ANCHORS = [
  { href: "#programme", label: "Programme" },
  { href: "#temoignages", label: "Témoignages" },
  { href: "#tarif", label: "Tarif" },
  { href: "#faq", label: "FAQ" },
];

/**
 * CTA fixe au scroll : carte-produit verticale a droite sur desktop
 * (image + prix + meta + ancres + achat), barre compacte en bas sur mobile.
 * Apparait apres le hero pour ne pas surcharger le haut de page. Le bouton
 * d'achat est le meme composant que la section tarif (gere connexion / achat /
 * acces si deja inscrite).
 */
export function PackSideCta({
  title,
  priceLabel,
  imageUrl,
  sectionsCount,
  lessonsCount,
  instructorName,
  formationId,
  isLoggedIn,
  isEnrolled,
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
          "fixed right-5 top-1/2 z-40 hidden w-72 -translate-y-1/2 transition-all duration-500 2xl:block",
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
                sizes="320px"
                className="object-cover"
              />
            </div>
          )}
          <div className="p-6">
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

            <div className="mt-5">
              <PurchaseButton
                formationId={formationId}
                isLoggedIn={isLoggedIn}
                isEnrolled={isEnrolled}
              />
            </div>

            <nav className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-primary-green/10 pt-4">
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
        </div>
      </aside>

      {/* Mobile / tablette — barre CTA fixe en bas */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-primary-green/10 bg-background-beige/95 backdrop-blur-md transition-all duration-300 2xl:hidden",
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 shrink-0">
            <p className="truncate font-serif text-xs font-semibold text-primary-green">
              {title}
            </p>
            <p className="font-serif text-base font-bold text-primary-red">
              {priceLabel}
            </p>
          </div>
          <div className="flex-1">
            <PurchaseButton
              formationId={formationId}
              isLoggedIn={isLoggedIn}
              isEnrolled={isEnrolled}
            />
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookOpen, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { PurchaseButton } from "../purchase-button";
import { ctaLabelFor } from "@/config/accompagnement-cta";
import { PACK_SLUG } from "@/config/accompagnements";

type Props = {
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
 * Carte-produit flottante (fixed) par-dessus le contenu, a droite. Apparait au
 * scroll apres le hero. Affichee sur desktop (lg+), masquee sur mobile/tablette
 * ou la section Tarif inline sert de CTA. Le bouton d'achat est le meme
 * composant que la section tarif (connexion / achat / acces si deja inscrite).
 */
export function PackSideCta({
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
    <aside
      aria-label="Rejoindre le pack"
      className={cn(
        "fixed right-4 top-1/2 z-40 hidden w-60 -translate-y-1/2 transition-all duration-500 lg:block",
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
              sizes="240px"
              className="object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <p className="font-serif text-2xl font-bold text-primary-red">
            {priceLabel}
          </p>
          <ul className="mt-3 space-y-1.5">
            {meta.map((m) => (
              <li
                key={m.text}
                className="flex items-center gap-2 text-xs text-primary-green/70"
              >
                <m.icon className="h-3.5 w-3.5 shrink-0 text-primary-green/50" aria-hidden />
                <span>{m.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <PurchaseButton
              formationId={formationId}
              isLoggedIn={isLoggedIn}
              isEnrolled={isEnrolled}
              ctaLabel={ctaLabelFor(PACK_SLUG)}
            />
          </div>

          <nav className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-primary-green/10 pt-3">
            {ANCHORS.map((a) => (
              <a
                key={a.href}
                href={a.href}
                className="flex items-center gap-1.5 text-xs text-primary-green/70 transition-colors hover:text-primary-green"
              >
                <span className="h-1 w-1 rounded-full bg-primary-red" aria-hidden />
                {a.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}

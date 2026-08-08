"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookOpen, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { PurchaseButton } from "../purchase-button";

export type SideCtaAnchor = { href: string; label: string };

type Props = {
  ariaLabel: string;
  priceLabel: string;
  imageUrl: string | null;
  /** Ligne de contenu, deja composee ; masquee si null. */
  metaLabel: string | null;
  instructorName: string;
  anchors: readonly SideCtaAnchor[];
  ctaLabel: string | undefined;
  accompagnementId: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  priceCents: number;
  currency: string;
};

/**
 * Carte-produit flottante (fixed) par-dessus le contenu, a droite. Apparait au
 * scroll apres le hero. Affichee sur desktop (lg+), masquee sur mobile/tablette
 * ou la section Tarif inline sert de CTA. Le bouton d'achat est le meme
 * composant que la section tarif (connexion / achat / acces si deja inscrite).
 */
export function SalesSideCta({
  ariaLabel,
  priceLabel,
  imageUrl,
  metaLabel,
  instructorName,
  anchors,
  ctaLabel,
  accompagnementId,
  isLoggedIn,
  isEnrolled,
  priceCents,
  currency,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const meta = [
    { icon: BookOpen, text: metaLabel, show: metaLabel !== null },
    { icon: Clock, text: "Accès illimité", show: true },
    { icon: User, text: `Par ${instructorName}`, show: true },
  ].filter((m) => m.show);

  return (
    <aside
      aria-label={ariaLabel}
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
            <Image src={imageUrl} alt="" fill sizes="240px" className="object-cover" />
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
                <m.icon
                  className="h-3.5 w-3.5 shrink-0 text-primary-green/50"
                  aria-hidden
                />
                <span>{m.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <PurchaseButton
              accompagnementId={accompagnementId}
              isLoggedIn={isLoggedIn}
              isEnrolled={isEnrolled}
              priceCents={priceCents}
              currency={currency}
              ctaLabel={ctaLabel}
            />
          </div>

          <nav className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-primary-green/10 pt-3">
            {anchors.map((a) => (
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

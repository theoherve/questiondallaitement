"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, ChevronRight, Clock, User } from "lucide-react";
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
  /**
   * Quand la prise de RDV est desactivee (feature flag), on n'a pas encore de
   * questionnaire d'orientation ("quel accompagnement pour moi ?") : le lien
   * retombe sur la page de contact plutot que vers /reserver, qui serait
   * casse ou trompeur.
   */
  bookingEnabled: boolean;
};

/**
 * Carte-produit flottante (fixed) par-dessus le contenu, a droite. Apparait au
 * scroll apres le hero. Affichee sur desktop (lg+), masquee sur mobile/tablette
 * ou la section Tarif inline sert de CTA. Le bouton d'achat est le meme
 * composant que la section tarif (connexion / achat / acces si deja inscrite).
 * Repliable via l'onglet fleche : la carte glisse hors champ en laissant
 * l'onglet visible pour la rouvrir (cf. QS du 2026-08-21).
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
  bookingEnabled,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
    <>
      <aside
        aria-label={ariaLabel}
        className={cn(
          "fixed right-4 top-1/2 z-40 hidden w-60 -translate-y-1/2 transition-all duration-500 lg:block",
          !visible && "pointer-events-none opacity-0",
          visible && "opacity-100",
          collapsed
            ? "translate-x-[calc(100%-1.75rem)]"
            : visible
              ? "translate-x-0"
              : "translate-x-8"
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Afficher le résumé" : "Masquer le résumé"}
          className="absolute -left-7 top-1/2 flex h-14 w-7 -translate-y-1/2 items-center justify-center rounded-l-lg border border-primary-green/10 bg-white shadow-lg"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 text-primary-green/60 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </button>

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

            <Link
              href={bookingEnabled ? "/reserver" : "/contact"}
              className="mt-3 block border-t border-primary-green/10 pt-3 text-center text-xs text-primary-green/60 underline-offset-2 transition-colors hover:text-primary-green hover:underline"
            >
              Besoin d&apos;aide pour choisir ?
            </Link>
          </div>
        </div>
      </aside>

      {/* Barre persistante mobile/tablette : le sidebar flottant est reserve
          au desktop (lg+). Elle renvoie vers la section Tarif plutot que de
          dupliquer PurchaseButton (promo code + Klarna + data-testid uniques
          rendus une seule fois, dans #tarif). */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-primary-green/10 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-transform duration-300 lg:hidden",
          "pb-[env(safe-area-inset-bottom)]",
          visible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <a
          href="#tarif"
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <span className="font-serif text-lg font-bold text-primary-red">
            {priceLabel}
          </span>
          <span className="rounded-md bg-primary-red px-5 py-2.5 text-sm font-medium text-white">
            {isEnrolled ? "Accéder" : ctaLabel ?? "Voir l'offre"}
          </span>
        </a>
      </div>
    </>
  );
}

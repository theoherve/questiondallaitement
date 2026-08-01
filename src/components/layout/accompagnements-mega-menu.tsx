"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPrice,
  MODULE_ACCENTS,
  DEFAULT_MODULE_ACCENT,
} from "@/config/accompagnements";
import type {
  AccompagnementPreview,
  AccompagnementsNavPreview,
} from "@/lib/accompagnements/nav-preview";

const ACCOMPAGNEMENTS_HREF = "/accompagnements";

const accentFor = (slug: string) => MODULE_ACCENTS[slug] ?? DEFAULT_MODULE_ACCENT;

/** Vignette : image si disponible, sinon aplat dégradé de marque (sans picto). */
const Thumb = ({
  item,
  size,
}: {
  item: AccompagnementPreview;
  size: number;
}) => {
  if (item.thumbnailUrl) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-lg"
        style={{ width: size, height: size }}
      >
        <Image
          src={item.thumbnailUrl}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </div>
    );
  }
  const accent = accentFor(item.slug);
  return (
    <div
      className="shrink-0 rounded-lg"
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
      }}
      aria-hidden
    />
  );
};

type Props = {
  data: AccompagnementsNavPreview;
  /** Classe du lien déclencheur, pour matcher les autres liens du nav. */
  triggerClassName?: string;
};

export const AccompagnementsMegaMenu = ({ data, triggerClassName }: Props) => {
  const { pack, modules } = data;
  const [open, setOpen] = useState(false);
  // Monté au 1er survol puis conservé : les images ne se décodent qu'une fois,
  // les survols suivants ne font qu'un fondu CSS (compositeur), sans jank.
  const [mounted, setMounted] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  const doOpen = () => {
    setMounted(true);
    setOpen(true);
  };
  const close = () => setOpen(false);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleOpen = () => {
    clearTimers();
    openTimer.current = setTimeout(doOpen, 80);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => () => clearTimers(), []);

  // Rien à prévisualiser → simple lien (dégradation gracieuse).
  if (!pack && modules.length === 0) {
    return (
      <Link href={ACCOMPAGNEMENTS_HREF} className={triggerClassName}>
        Accompagnements en ligne
      </Link>
    );
  }

  const panelId = "accompagnements-mega-menu";

  return (
    <div
      className="relative"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        clearTimers();
        doOpen();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          scheduleClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <Link
        ref={triggerRef}
        href={ACCOMPAGNEMENTS_HREF}
        className={cn(
          "inline-flex items-center gap-1",
          triggerClassName,
          open && "text-primary-red"
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={close}
      >
        Accompagnements en ligne
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </Link>

      {mounted && (
        <div
          id={panelId}
          aria-label="Aperçu des accompagnements en ligne"
          aria-hidden={!open}
          className={cn(
            "absolute left-0 top-full z-50 mt-3 w-[min(64rem,calc(100vw-2rem))] origin-top overflow-hidden rounded-2xl border border-border bg-background-beige shadow-[0_24px_60px_-20px_rgba(32,54,52,0.32),0_4px_14px_-6px_rgba(32,54,52,0.18)]",
            "transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform] motion-reduce:transition-none",
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none invisible -translate-y-2 opacity-0"
          )}
        >
          <div
            className={cn(
              "grid grid-cols-1",
              pack && "sm:grid-cols-[22rem_1fr]"
            )}
          >
            {/* Vedette — le pack */}
            {pack && (
              <Link
                href={`${ACCOMPAGNEMENTS_HREF}/${pack.slug}`}
                onClick={close}
                tabIndex={open ? undefined : -1}
                className="group/feature flex flex-col gap-4 bg-linear-to-br from-primary-green to-primary-green-dark p-7 text-background-beige"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-honey">
                  Le plus choisi
                </span>
                <div className="relative h-36 overflow-hidden rounded-xl bg-linear-to-br from-accent-peach to-accent-honey">
                  {pack.thumbnailUrl && (
                    <Image
                      src={pack.thumbnailUrl}
                      alt=""
                      fill
                      sizes="22rem"
                      className="object-cover"
                    />
                  )}
                </div>
                <h3 className="font-serif text-xl font-semibold leading-tight text-background-beige">
                  {pack.title}
                </h3>
                {pack.shortDescription && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-background-beige/80">
                    {pack.shortDescription}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-1">
                  <span className="font-serif text-2xl">
                    {formatPrice(pack.priceCents, pack.currency)}
                  </span>
                  <span className="rounded-full bg-background-beige px-4 py-2 text-sm font-semibold text-primary-green transition-transform group-hover/feature:translate-x-0.5">
                    Découvrir
                  </span>
                </div>
              </Link>
            )}

            {/* Grille des modules */}
            <div className="grid grid-cols-1 gap-1.5 p-5 sm:grid-cols-2">
              {modules.map((m) => (
                <Link
                  key={m.slug}
                  href={`${ACCOMPAGNEMENTS_HREF}/${m.slug}`}
                  onClick={close}
                  tabIndex={open ? undefined : -1}
                  className="flex items-center gap-3.5 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-accent-cream"
                >
                  <Thumb item={m} size={52} />
                  <span className="min-w-0">
                    <span className="block font-serif text-sm font-medium leading-tight text-primary-green">
                      {m.title}
                    </span>
                    <span className="mt-1 block text-[13px] font-medium tabular-nums text-primary-red">
                      {formatPrice(m.priceCents, m.currency)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Pied */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-accent-cream px-7 py-4">
            <Link
              href={ACCOMPAGNEMENTS_HREF}
              onClick={close}
              tabIndex={open ? undefined : -1}
              className="text-sm font-semibold text-primary-red hover:underline"
            >
              Voir tous les accompagnements
            </Link>
            <span className="text-[13px] text-primary-green/50">
              Certifié IBCLC · accès à vie
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

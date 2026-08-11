"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOOKS } from "@/config/books";

const LIVRES_HREF = "/livres";

type Props = {
  /** Classe du lien déclencheur, pour matcher les autres liens du nav. */
  triggerClassName?: string;
};

export const BooksMegaMenu = ({ triggerClassName }: Props) => {
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
  if (BOOKS.length === 0) {
    return (
      <Link href={LIVRES_HREF} className={triggerClassName}>
        Livres
      </Link>
    );
  }

  const panelId = "livres-mega-menu";

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
        href={LIVRES_HREF}
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
        Livres
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
          aria-label="Aperçu des livres"
          aria-hidden={!open}
          className={cn(
            "absolute left-0 top-full z-50 mt-3 w-[min(52rem,calc(100vw-2rem))] origin-top overflow-hidden rounded-2xl border border-border bg-background-beige shadow-[0_24px_60px_-20px_rgba(32,54,52,0.32),0_4px_14px_-6px_rgba(32,54,52,0.18)]",
            "transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform] motion-reduce:transition-none",
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none invisible -translate-y-2 opacity-0"
          )}
        >
          <div className="grid grid-cols-3 gap-4 p-6">
            {BOOKS.map((book) => (
              <Link
                key={book.id}
                href={`${LIVRES_HREF}#${book.id}`}
                onClick={close}
                tabIndex={open ? undefined : -1}
                className="group/book flex flex-col gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-accent-cream"
              >
                <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg bg-accent-cream">
                  <Image
                    src={book.coverImage}
                    alt=""
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-200 group-hover/book:scale-[1.03]"
                  />
                </div>
                <span className="min-w-0">
                  <span className="block font-serif text-sm font-medium leading-tight text-primary-green">
                    {book.shortTitle}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-primary-green/70">
                    {book.subtitle}
                  </span>
                  <span className="mt-1.5 block text-[13px] font-medium tabular-nums text-primary-red">
                    {book.price}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {/* Pied */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-accent-cream px-6 py-4">
            <Link
              href={LIVRES_HREF}
              onClick={close}
              tabIndex={open ? undefined : -1}
              className="text-sm font-semibold text-primary-red hover:underline"
            >
              Voir tous les livres
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

# Mega menu "Livres" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hover mega menu for "Livres" in the main header, showing all 3 books (cover, title, subtitle, price) each linking to its anchor on `/livres`.

**Architecture:** New client component `BooksMegaMenu`, modeled directly on the existing `AccompagnementsMegaMenu` (same hover/focus/Escape/ARIA mechanics), reading the static `BOOKS` array directly (no server data layer needed). Wired into `header.tsx` desktop nav by swapping the plain `Link` for `/livres` the same way `/accompagnements` is already swapped for its mega menu. Mobile overlay is untouched — it already renders `publicNav` as plain links regardless of the desktop swap.

**Tech Stack:** Next.js App Router, React (client component), TypeScript, Tailwind CSS v4, `next/image`, `next/link`, `lucide-react`.

## Global Constraints

- Desktop only — no mobile dropdown; mobile "Livres" stays the existing plain link in the overlay nav (per spec Scope section).
- All 3 books shown, no featured/highlighted distinction (per spec).
- Reuse `BOOKS` from `src/config/books.ts` as-is — no new data, no new fields.
- Links target `/livres#${book.id}` — anchors already exist on `livres/page.tsx` (`id={book.id}` at the book `<section>`).
- No existing test convention for header/nav presentational components in this codebase (no `.test.tsx` under `src/`, no `@testing-library/react` dependency) — verify via `npx tsc --noEmit`/`pnpm build` and a manual browser check instead of unit tests, consistent with how `AccompagnementsMegaMenu` shipped.
- No `typecheck` script in `package.json` (only `dev`/`build`) — use `npx tsc --noEmit` directly for type verification steps below.

---

### Task 1: `BooksMegaMenu` component

**Files:**
- Create: `src/components/layout/books-mega-menu.tsx`
- Reference (read-only, do not modify): `src/components/layout/accompagnements-mega-menu.tsx`, `src/config/books.ts`

**Interfaces:**
- Consumes: `BOOKS` (`Book[]`) from `src/config/books.ts` — fields used: `id`, `shortTitle`, `subtitle`, `price`, `coverImage`.
- Produces: `BooksMegaMenu` — React component, props `{ triggerClassName?: string }`. Default export is named export `BooksMegaMenu` (matches `AccompagnementsMegaMenu`'s export style). Consumed by Task 2 in `header.tsx`.

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to `books-mega-menu.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/books-mega-menu.tsx
git commit -m "feat(header): add BooksMegaMenu component"
```

---

### Task 2: Wire `BooksMegaMenu` into the header

**Files:**
- Modify: `src/components/layout/header.tsx:1-100` (imports + desktop nav map)

**Interfaces:**
- Consumes: `BooksMegaMenu` from `src/components/layout/books-mega-menu.tsx` (Task 1), signature `({ triggerClassName?: string })`.

- [ ] **Step 1: Import the new component**

In `src/components/layout/header.tsx`, next to the existing `AccompagnementsMegaMenu` import (line 8):

```tsx
import { AccompagnementsMegaMenu } from "@/components/layout/accompagnements-mega-menu";
import { BooksMegaMenu } from "@/components/layout/books-mega-menu";
```

- [ ] **Step 2: Add the `/livres` href constant**

Next to `ACCOMPAGNEMENTS_HREF` (line 35):

```tsx
const ACCOMPAGNEMENTS_HREF = "/accompagnements";
const LIVRES_HREF = "/livres";
```

- [ ] **Step 3: Swap the desktop nav link for the mega menu**

Replace the desktop nav map (`header.tsx:84-100`):

```tsx
{publicNav.map((link) =>
  link.href === ACCOMPAGNEMENTS_HREF ? (
    <AccompagnementsMegaMenu
      key={link.href}
      data={accompagnements}
      triggerClassName="nav-link text-[15px] font-medium text-primary-green transition-colors hover:text-primary-red"
    />
  ) : link.href === LIVRES_HREF ? (
    <BooksMegaMenu
      key={link.href}
      triggerClassName="nav-link text-[15px] font-medium text-primary-green transition-colors hover:text-primary-red"
    />
  ) : (
    <Link
      key={link.href}
      href={link.href}
      className="nav-link relative text-[15px] font-medium text-primary-green transition-colors hover:text-primary-red"
    >
      {link.title}
    </Link>
  )
)}
```

Leave the mobile overlay nav (`header.tsx:270-283`, mapping `publicNav` to plain `Link`s) untouched — it must keep rendering "Livres" as a plain link.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: build succeeds, no errors from `header.tsx` or `books-mega-menu.tsx`

- [ ] **Step 6: Manual browser verification**

Start dev server (`pnpm dev`), open the site, and check:
- Desktop (≥1024px viewport): hovering "Livres" opens a panel with 3 book covers, titles, subtitles, prices; clicking a book navigates to `/livres#<id>` and scrolls to that book's section; "Voir tous les livres" navigates to `/livres`; `Escape` closes the panel and returns focus to the trigger.
- Mobile (<1024px viewport, hamburger menu): "Livres" appears as a plain link, no dropdown, tapping navigates straight to `/livres`.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat(header): wire BooksMegaMenu into desktop nav"
```

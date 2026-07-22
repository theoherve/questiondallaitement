# Booking Feature Flag (formations-only mode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an env-driven feature flag that switches the public site to "formations en ligne only" mode by cleanly hiding the appointment-booking flow.

**Architecture:** A single config module reads `NEXT_PUBLIC_BOOKING_ENABLED` and exposes `features.bookingEnabled`. Consumers (booking route, header, home page) import it to redirect, hide links, filter cards, and swap CTAs. No DB, no middleware change.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Vitest.

## Global Constraints

- Flag name: `NEXT_PUBLIC_BOOKING_ENABLED` (must keep `NEXT_PUBLIC_` prefix — read in a `"use client"` component).
- Semantics: booking **enabled** unless the env value is exactly the string `"false"`. Absent var → enabled (no regression).
- Single source of truth: `src/config/features.ts`. No raw `process.env` reads in components.
- Site is mono-locale French. All copy in French.
- Scope: **front only**. Do not touch `src/middleware.ts`, admin `(dashboard)`, API routes, or Stripe.

---

### Task 1: Feature flag config module

**Files:**
- Create: `src/config/features.ts`
- Test: `src/config/features.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export const features: { readonly bookingEnabled: boolean }`. `features.bookingEnabled` is `false` only when `process.env.NEXT_PUBLIC_BOOKING_ENABLED === "false"`, otherwise `true`.

- [ ] **Step 1: Write the failing test**

```ts
// src/config/features.spec.ts
import { afterEach, describe, expect, it, vi } from "vitest";

describe("features.bookingEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const load = async () => (await import("./features")).features;

  it("is true when the env var is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_ENABLED", "");
    expect((await load()).bookingEnabled).toBe(true);
  });

  it('is false only when the env var is exactly "false"', async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_ENABLED", "false");
    expect((await load()).bookingEnabled).toBe(false);
  });

  it('is true for "true"', async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_ENABLED", "true");
    expect((await load()).bookingEnabled).toBe(true);
  });

  it('is true for arbitrary values like "0"', async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_ENABLED", "0");
    expect((await load()).bookingEnabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/features.spec.ts`
Expected: FAIL — `Failed to resolve import "./features"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/config/features.ts
export const features = {
  bookingEnabled: process.env.NEXT_PUBLIC_BOOKING_ENABLED !== "false",
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/config/features.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/config/features.ts src/config/features.spec.ts
git commit -m "feat(booking): add NEXT_PUBLIC_BOOKING_ENABLED feature flag"
```

---

### Task 2: Redirect the `/reserver` route when disabled

**Files:**
- Modify: `src/app/(public)/reserver/page.tsx` (imports at top; guard right after `export const dynamic = "force-dynamic";` on line 13)

**Interfaces:**
- Consumes: `features.bookingEnabled` from Task 1.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Add the `redirect` + `features` imports**

At the top of the file, after the existing imports (after line 5), add:

```ts
import { redirect } from "next/navigation";
import { features } from "@/config/features";
```

- [ ] **Step 2: Add the guard as the first statement inside the component**

Immediately after `const ReserverPage = async () => {` (line 15), before the `type ConsultationTypeRow` declaration, insert:

```ts
  if (!features.bookingEnabled) {
    redirect("/accompagnements");
  }
```

- [ ] **Step 3: Verify the build type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/reserver/page.tsx"
git commit -m "feat(booking): redirect /reserver to /accompagnements when flag off"
```

---

### Task 3: Hide booking CTAs in the header

**Files:**
- Modify: `src/components/layout/header.tsx` (import at top; three `/reserver` links at lines 227-232 desktop, 237-243 mobile, 362-372 mobile menu)

**Interfaces:**
- Consumes: `features.bookingEnabled` from Task 1.

- [ ] **Step 1: Add the import**

After the existing config import (line 16, `import { publicNav, clientNav } from "@/config/navigation";`), add:

```ts
import { features } from "@/config/features";
```

- [ ] **Step 2: Wrap the desktop "Prendre RDV" button**

Replace the desktop button block (lines 227-232):

```tsx
            <Button
              asChild
              className="bg-primary-red px-6 hover:bg-primary-red-dark"
            >
              <Link href="/reserver">Prendre RDV</Link>
            </Button>
```

with:

```tsx
            {features.bookingEnabled && (
              <Button
                asChild
                className="bg-primary-red px-6 hover:bg-primary-red-dark"
              >
                <Link href="/reserver">Prendre RDV</Link>
              </Button>
            )}
```

- [ ] **Step 3: Wrap the mobile "RDV" button**

Replace the mobile button block (lines 237-243):

```tsx
            <Button
              asChild
              size="sm"
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              <Link href="/reserver">RDV</Link>
            </Button>
```

with:

```tsx
            {features.bookingEnabled && (
              <Button
                asChild
                size="sm"
                className="bg-primary-red hover:bg-primary-red-dark"
              >
                <Link href="/reserver">RDV</Link>
              </Button>
            )}
```

- [ ] **Step 4: Wrap the mobile-menu "Prendre rendez-vous" button**

Replace the mobile-menu button block (lines 362-372):

```tsx
                  <Button
                    asChild
                    className="w-full bg-primary-red hover:bg-primary-red-dark"
                  >
                    <Link
                      href="/reserver"
                      onClick={() => setMenuOpen(false)}
                    >
                      Prendre rendez-vous
                    </Link>
                  </Button>
```

with:

```tsx
                  {features.bookingEnabled && (
                    <Button
                      asChild
                      className="w-full bg-primary-red hover:bg-primary-red-dark"
                    >
                      <Link
                        href="/reserver"
                        onClick={() => setMenuOpen(false)}
                      >
                        Prendre rendez-vous
                      </Link>
                    </Button>
                  )}
```

- [ ] **Step 5: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat(booking): hide RDV CTAs in header when flag off"
```

---

### Task 4: Filter booking service cards + swap home CTAs

**Files:**
- Modify: `src/app/(public)/page.tsx` (import at top; `SERVICES` array lines 97-142; hero secondary CTA lines 226-233; bottom CTA section lines 798-820)

**Interfaces:**
- Consumes: `features.bookingEnabled` from Task 1.

- [ ] **Step 1: Add the import**

After the existing component imports (after line 11), add:

```ts
import { features } from "@/config/features";
```

- [ ] **Step 2: Filter out booking cards from the rendered services**

The `SERVICES` array (lines 97-142) keeps all four entries. Right after its closing `];` (line 142), add a derived list that drops the `/reserver` cards when booking is off:

```ts
  const visibleServices = features.bookingEnabled
    ? SERVICES
    : SERVICES.filter((s) => s.href !== "/reserver");
```

Then change the render map (line 293) from `{SERVICES.map((service, i) => {` to:

```tsx
            {visibleServices.map((service, i) => {
```

- [ ] **Step 3: Hide the hero secondary "Prendre rendez-vous" button**

Replace the hero secondary button block (lines 226-233):

```tsx
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/reserver">Prendre rendez-vous</Link>
              </Button>
```

with:

```tsx
              {features.bookingEnabled && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/reserver">Prendre rendez-vous</Link>
                </Button>
              )}
```

(The primary hero CTA on line 221 already points to `/accompagnements` and stays.)

- [ ] **Step 4: Swap the bottom CTA section**

Replace the bottom CTA paragraph + button group (lines 798-820):

```tsx
            <p className="mx-auto mt-6 max-w-xl text-lg text-background-beige/70">
              Prenez rendez-vous pour une consultation personnalisée, ou
              explorez nos accompagnements à votre rythme.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="bg-primary-red px-8 hover:bg-primary-red-dark"
              >
                <Link href="/reserver">Prendre rendez-vous</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-background-beige/30 bg-transparent text-background-beige hover:bg-background-beige/10 hover:text-background-beige"
              >
                <Link href="/accompagnements">
                  Découvrir les accompagnements
                </Link>
              </Button>
            </div>
```

with:

```tsx
            <p className="mx-auto mt-6 max-w-xl text-lg text-background-beige/70">
              {features.bookingEnabled
                ? "Prenez rendez-vous pour une consultation personnalisée, ou explorez nos accompagnements à votre rythme."
                : "Explorez nos accompagnements et formations en ligne, à votre rythme."}
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {features.bookingEnabled && (
                <Button
                  asChild
                  size="lg"
                  className="bg-primary-red px-8 hover:bg-primary-red-dark"
                >
                  <Link href="/reserver">Prendre rendez-vous</Link>
                </Button>
              )}
              <Button
                asChild
                size="lg"
                variant={features.bookingEnabled ? "outline" : "default"}
                className={
                  features.bookingEnabled
                    ? "border-2 border-background-beige/30 bg-transparent text-background-beige hover:bg-background-beige/10 hover:text-background-beige"
                    : "bg-primary-red px-8 hover:bg-primary-red-dark"
                }
              >
                <Link href="/accompagnements">
                  Découvrir les accompagnements
                </Link>
              </Button>
            </div>
```

(When off: the RDV button disappears and the accompagnements button becomes the primary red CTA, so the section never looks empty.)

- [ ] **Step 5: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/page.tsx"
git commit -m "feat(booking): filter booking cards and swap home CTAs when flag off"
```

---

### Task 5: Document the env var

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Consumes: nothing. Documents the flag from Task 1.

- [ ] **Step 1: Append the flag to `.env.example`**

Add at the end of the file:

```bash
# "false" = mode formations en ligne uniquement (désactive la réservation de RDV côté front).
# Absent ou toute autre valeur = réservation activée.
NEXT_PUBLIC_BOOKING_ENABLED=true
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(booking): document NEXT_PUBLIC_BOOKING_ENABLED in .env.example"
```

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the test suite**

Run: `npm test`
Expected: PASS, including `src/config/features.spec.ts`.

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: no errors.

- [ ] **Step 3: Manual dev smoke test (both modes)**

Run with flag off:
`NEXT_PUBLIC_BOOKING_ENABLED=false npm run dev`
Check: no "Prendre RDV" in header, `/reserver` redirects to `/accompagnements`, home shows no Cabinet/Téléconsultation cards, bottom CTA shows only the accompagnements button. Then restart without the var and confirm booking is back.

---

## Self-Review

- **Spec coverage:** flag module (T1), `/reserver` redirect (T2, spec #1), 3 header links (T3, spec #2-4), hero CTA (T4 spec #5), bottom CTA (T4 spec #6), service cards filter (T4 spec #7), `.env.example` doc (T5), tests (T1), verification (T6). All spec sections mapped.
- **Placeholder scan:** none — every code step shows full code.
- **Type consistency:** `features.bookingEnabled` (boolean) used identically across T1-T4; import path `@/config/features` consistent.
- **Note:** header/page line numbers are current-state anchors; if earlier tasks shift lines within a file, match on the shown code block, not the number.

# Visibilité de l'agenda formations pour les mamans — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a maman visiting `/formations` recognize that webinaires and ateliers mensuels for her sit alongside the pro trainings, via an explicit audience field, a toggle filter, a neutral hero, and a direct link from her dashboard.

**Architecture:** New `audience_group` enum column on `formations` (`maman` / `pro` / `both`), surfaced as a select in the admin form and as a three-state toggle (`Tout voir` / `Pour les mamans` / `Pour les pros de santé`) on the public listing, backed by a pure filter function. The toggle's state lives in the `?audience=` URL search param so it's deep-linkable from a new CTA card on the client dashboard.

**Tech Stack:** Next.js App Router (Server + Client Components), Supabase/Postgres, Zod, Vitest.

## Global Constraints

- Backfill every existing `formations` row to `audience_group = 'both'` — no heuristic guessing from title/category (spec: "Backfill des lignes existantes reste `'both'`").
- The category filter (`activeCategory`) stays local `useState`, not URL-driven — only the new audience filter goes through the URL.
- A session with `audience_group = 'both'` must remain visible under every toggle state, including `maman` and `pro`.
- Hero on `/formations` gets ONE neutral version for everyone — no per-toggle-state hero variants.
- No renaming/splitting of the "Formations" nav entry, no admin bulk-edit tooling, no changes to the single formation detail page (`[slug]/_components/formation-detail.tsx`).

---

### Task 1: Database migration — `audience_group` column

**Files:**
- Create: `supabase/migrations/00091_formation_audience_group.sql`

**Interfaces:**
- Produces: Postgres enum `formation_audience_group` ('maman' | 'pro' | 'both'), column `formations.audience_group` (NOT NULL, default `'both'`).

- [ ] **Step 1: Write the migration**

```sql
-- Migration 00091: audience visee par une session de formation
--
-- `category` decrit un FORMAT (webinaire, atelier mensuel...), pas un
-- PUBLIC : un webinaire peut viser des pros comme des mamans. Sans donnee
-- explicite, la page /formations ne peut pas distinguer les deux, et son
-- hero actuel ("Formations professionnelles") fait fuir les mamans avant
-- meme qu'elles ne voient la liste.

CREATE TYPE formation_audience_group AS ENUM ('maman', 'pro', 'both');

ALTER TABLE formations
  ADD COLUMN audience_group formation_audience_group NOT NULL DEFAULT 'both';

COMMENT ON COLUMN formations.audience_group IS
  'Public cible de la session, pilote le toggle sur /formations. '
  'maman = mamans uniquement, pro = professionnels de sante uniquement, '
  'both = les deux. Toutes les lignes existantes valent ''both'' au '
  'backfill : aucune session existante ne doit disparaitre d''une vue '
  'sans revue manuelle par Carole dans l''admin.';
```

- [ ] **Step 2: Validate against the linked remote schema (dry run only)**

Run: `npm run db:push:dry`
Expected: the dry run lists this migration as pending and reports no SQL error. Do NOT run `npm run db:push` as part of this task — applying to the shared remote database needs an explicit go-ahead outside this plan.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00091_formation_audience_group.sql
git commit -m "feat(db): add formations.audience_group column"
```

---

### Task 2: Audience config — pure filter function (TDD)

**Files:**
- Create: `src/config/formation-audience.ts`
- Create: `src/lib/formations/audience.ts`
- Test: `src/lib/formations/audience.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `FORMATION_AUDIENCE_GROUPS: readonly ["maman", "pro", "both"]`
  - `type FormationAudienceGroup = "maman" | "pro" | "both"`
  - `FORMATION_AUDIENCE_GROUP_LABELS: Record<FormationAudienceGroup, string>`
  - `type AudienceFilter = "all" | "maman" | "pro"`
  - `AUDIENCE_FILTERS: { value: AudienceFilter; label: string }[]`
  - `matchesAudienceFilter(audienceGroup: FormationAudienceGroup, filter: AudienceFilter): boolean`

- [ ] **Step 1: Write the config file**

```typescript
// src/config/formation-audience.ts

/**
 * Public vise par une session, distinct de la categorie (qui decrit un
 * format). Miroir de l'enum `formation_audience_group` (migration 00091).
 */
export const FORMATION_AUDIENCE_GROUPS = ["maman", "pro", "both"] as const;

export type FormationAudienceGroup = (typeof FORMATION_AUDIENCE_GROUPS)[number];

export const FORMATION_AUDIENCE_GROUP_LABELS: Record<FormationAudienceGroup, string> = {
  maman: "Mamans",
  pro: "Professionnels de santé",
  both: "Mamans et professionnels",
};

/** Etat du toggle public sur /formations. */
export type AudienceFilter = "all" | "maman" | "pro";

export const AUDIENCE_FILTERS: { value: AudienceFilter; label: string }[] = [
  { value: "all", label: "Tout voir" },
  { value: "maman", label: "Pour les mamans" },
  { value: "pro", label: "Pour les pros de santé" },
];
```

- [ ] **Step 2: Write the failing test for the filter function**

```typescript
// src/lib/formations/audience.spec.ts
import { describe, it, expect } from "vitest";
import { matchesAudienceFilter } from "./audience";

describe("matchesAudienceFilter", () => {
  it("laisse tout passer sur le filtre 'all'", () => {
    expect(matchesAudienceFilter("maman", "all")).toBe(true);
    expect(matchesAudienceFilter("pro", "all")).toBe(true);
    expect(matchesAudienceFilter("both", "all")).toBe(true);
  });

  it("une session 'both' reste visible quel que soit le filtre", () => {
    expect(matchesAudienceFilter("both", "maman")).toBe(true);
    expect(matchesAudienceFilter("both", "pro")).toBe(true);
  });

  it("filtre une session dont l'audience ne correspond pas au filtre", () => {
    expect(matchesAudienceFilter("maman", "pro")).toBe(false);
    expect(matchesAudienceFilter("pro", "maman")).toBe(false);
  });

  it("garde une session dont l'audience correspond au filtre", () => {
    expect(matchesAudienceFilter("maman", "maman")).toBe(true);
    expect(matchesAudienceFilter("pro", "pro")).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/formations/audience.spec.ts`
Expected: FAIL — `./audience` has no exported member `matchesAudienceFilter` (module doesn't exist yet).

- [ ] **Step 4: Write the implementation**

```typescript
// src/lib/formations/audience.ts
import type { AudienceFilter, FormationAudienceGroup } from "@/config/formation-audience";

/**
 * Une session `both` reste toujours visible : elle vise les deux publics,
 * la masquer sous un filtre precis reviendrait a la retirer d'une vue ou
 * elle a sa place.
 */
export const matchesAudienceFilter = (
  audienceGroup: FormationAudienceGroup,
  filter: AudienceFilter,
): boolean => {
  if (filter === "all") return true;
  if (audienceGroup === "both") return true;
  return audienceGroup === filter;
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/formations/audience.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/config/formation-audience.ts src/lib/formations/audience.ts src/lib/formations/audience.spec.ts
git commit -m "feat(formations): add audience filter config and pure matcher"
```

---

### Task 3: `Formation` type — add `audience_group`

**Files:**
- Modify: `src/types/database.ts:308` (right after the `category` field)

**Interfaces:**
- Consumes: `FormationAudienceGroup` from `src/config/formation-audience.ts` (Task 2).
- Produces: `Formation.audience_group: FormationAudienceGroup`, importable via `@/types`.

- [ ] **Step 1: Add the import at the top of the file**

```typescript
import type { FormationAudienceGroup } from "@/config/formation-audience";
```

- [ ] **Step 2: Add the field to `Formation`**

In `src/types/database.ts`, right after the existing `category: FormationCategory;` line (database.ts:308):

```typescript
  // Public vise (maman, pro, ou les deux). Pilote le toggle sur
  // /formations. Migration 00091.
  audience_group: FormationAudienceGroup;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `src/types/database.ts` (other files that construct a `Formation` literal without `audience_group` will start failing here — that's expected, they get fixed in Tasks 4-6).

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat(types): add audience_group to Formation"
```

---

### Task 4: Admin — validation schema and server actions

**Files:**
- Modify: `src/validations/formations.ts`
- Modify: `src/app/(dashboard)/admin/formations/actions.ts:102,169` (the `createFormation`/`updateFormation` insert/update payloads)

**Interfaces:**
- Consumes: `FORMATION_AUDIENCE_GROUPS` from `src/config/formation-audience.ts` (Task 2).
- Produces: `formationSchema` accepts and defaults `audience_group`; `createFormation`/`updateFormation` persist it.

- [ ] **Step 1: Add the field to the Zod schema**

In `src/validations/formations.ts`, add the import:

```typescript
import { FORMATION_AUDIENCE_GROUPS } from "@/config/formation-audience";
```

Then, right after the existing `category: z.enum(FORMATION_CATEGORIES).default("formation"),` line:

```typescript
    // Public vise, distinct du format (category). Voir migration 00091.
    audience_group: z.enum(FORMATION_AUDIENCE_GROUPS).default("both"),
```

- [ ] **Step 2: Persist it in `createFormation`**

In `src/app/(dashboard)/admin/formations/actions.ts`, in the `.insert({...})` call (around line 102), right after `category: parsed.data.category,`:

```typescript
      audience_group: parsed.data.audience_group,
```

- [ ] **Step 3: Persist it in `updateFormation`**

Same file, in the `.update({...})` call (around line 169), right after `category: parsed.data.category,`:

```typescript
      audience_group: parsed.data.audience_group,
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `src/validations/formations.ts` or `src/app/(dashboard)/admin/formations/actions.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/validations/formations.ts "src/app/(dashboard)/admin/formations/actions.ts"
git commit -m "feat(formations): validate and persist audience_group"
```

---

### Task 5: Admin form UI — audience select

**Files:**
- Modify: `src/app/(dashboard)/admin/formations/_components/formation-form.tsx`

**Interfaces:**
- Consumes: `FORMATION_AUDIENCE_GROUPS`, `FORMATION_AUDIENCE_GROUP_LABELS` from `src/config/formation-audience.ts` (Task 2); `FormationAudienceGroup` from `@/types` (Task 3).
- Produces: form submits `audience_group` as part of the existing `payload` spread (no extra wiring needed there — `payload = { ...formData, ... }` already carries any key added to `formData`).

- [ ] **Step 1: Import the config and type**

Add to the existing imports in `formation-form.tsx`:

```typescript
import {
  FORMATION_AUDIENCE_GROUPS,
  FORMATION_AUDIENCE_GROUP_LABELS,
} from "@/config/formation-audience";
```

Extend the existing type import (line 36):

```typescript
import type { Formation, FormationCategory, FormationAudienceGroup } from "@/types";
```

- [ ] **Step 2: Seed the field in `formData`**

In the `useState(...)` call that builds `formData` (around line 112-143), right after `category: formation?.category ?? "formation",`:

```typescript
    audience_group: formation?.audience_group ?? "both",
```

- [ ] **Step 3: Add the select control**

In the "Classement" tab card, right after the closing `</div>` of the existing category `<div className="space-y-2">...</div>` block (around line 608), add:

```tsx
              <div className="space-y-2">
                <Label htmlFor="audience_group">Public</Label>
                <select
                  id="audience_group"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.audience_group}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      audience_group: e.target.value as FormationAudienceGroup,
                    }))
                  }
                >
                  {FORMATION_AUDIENCE_GROUPS.map((key) => (
                    <option key={key} value={key}>
                      {FORMATION_AUDIENCE_GROUP_LABELS[key]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Pilote le toggle « Pour les mamans / Pour les pros » de la
                  page publique.
                </p>
              </div>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `formation-form.tsx`.

- [ ] **Step 5: Manual check**

Run the dev server (`npm run dev`), open `/admin/formations/nouvelle` (or edit an existing formation), confirm the "Public" select appears in the "Classement" tab with the three options, defaults to "Mamans et professionnels" on create, and that saving doesn't error.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/formations/_components/formation-form.tsx"
git commit -m "feat(admin): add audience select to formation form"
```

---

### Task 6: Public listing — query, type, toggle, filtering

**Files:**
- Modify: `src/app/(public)/formations/page.tsx` (select clause only — hero copy is Task 7)
- Modify: `src/app/(public)/formations/_components/formations-list.tsx`

**Interfaces:**
- Consumes: `matchesAudienceFilter` (Task 2), `AUDIENCE_FILTERS`, `type AudienceFilter` from `src/config/formation-audience.ts` (Task 2).
- Produces: `FormationData.audience_group: FormationAudienceGroup`; toggle synced to `?audience=` URL param.

- [ ] **Step 1: Select the new column server-side**

In `src/app/(public)/formations/page.tsx`, in the Supabase `.select(...)` template string, add `audience_group,` right after the existing `category,` line.

- [ ] **Step 2: Add the field to `FormationData`**

In `formations-list.tsx`, add the import:

```typescript
import {
  AUDIENCE_FILTERS,
  type AudienceFilter,
  type FormationAudienceGroup,
} from "@/config/formation-audience";
import { matchesAudienceFilter } from "@/lib/formations/audience";
```

In the `FormationData` type (around line 42-68), right after `category: string;`:

```typescript
  audience_group: FormationAudienceGroup;
```

- [ ] **Step 3: Read/write the toggle state via the URL**

Add imports:

```typescript
import { useRouter, useSearchParams } from "next/navigation";
```

Inside `FormationsList`, right after the existing `useState` declarations (after `const [showAllPast, setShowAllPast] = useState(false);`):

```typescript
  const router = useRouter();
  const searchParams = useSearchParams();
  const audienceParam = searchParams.get("audience");
  const audienceFilter: AudienceFilter =
    audienceParam === "maman" || audienceParam === "pro" ? audienceParam : "all";

  const handleAudienceChange = useCallback(
    (value: AudienceFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") params.delete("audience");
      else params.set("audience", value);
      const query = params.toString();
      router.replace(query ? `/formations?${query}` : "/formations", { scroll: false });
    },
    [router, searchParams],
  );
```

- [ ] **Step 4: Apply the audience filter alongside category/date**

In `filteredUpcoming`, `filteredPast`, and `filteredEvergreen` (`useMemo` blocks), add the audience check. For `filteredUpcoming` (mirror the same addition in the other two):

```typescript
  const filteredUpcoming = useMemo(() => {
    let result = upcomingFormations;
    if (activeCategory !== "all") {
      result = result.filter((e) => e.category === activeCategory);
    }
    result = result.filter((e) => matchesAudienceFilter(e.audience_group, audienceFilter));
    if (selectedDate) {
      const day = format(selectedDate, "yyyy-MM-dd");
      result = result.filter((e) => parisDayKey(e.starts_at) === day);
    }
    return result;
  }, [upcomingFormations, activeCategory, audienceFilter, selectedDate]);
```

Apply the same `result = result.filter((e) => matchesAudienceFilter(e.audience_group, audienceFilter));` line (with `audienceFilter` added to the dependency array) to `filteredPast` and `filteredEvergreen`.

- [ ] **Step 5: Render the toggle**

In the sidebar (`<aside>`), right before the existing category filter pills block (`{availableCategories.length > 2 && (...)}`, around line 225), add:

```tsx
        {/* Toggle audience : dimension separee de la categorie (public vise
            vs format). Pilote par l'URL pour permettre un lien profond
            depuis le tableau de bord espace-client. */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_FILTERS.map((filter) => {
              const isActive = audienceFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => handleAudienceChange(filter.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary-red text-white shadow-sm"
                      : "bg-background-beige-dark text-primary-green/70 hover:bg-primary-green/10 hover:text-primary-green"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `formations-list.tsx` or `page.tsx`.

- [ ] **Step 7: Manual check**

Run `npm run dev`, open `/formations`. Confirm: the audience toggle renders above the category pills; switching to "Pour les mamans" updates the URL to `?audience=maman` and hides pro-only sessions (any formation you set to `pro` via the admin in Task 5's manual check); opening `/formations?audience=maman` directly preselects that toggle state; a `both`-audience session stays visible under every toggle state.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(public)/formations/page.tsx" "src/app/(public)/formations/_components/formations-list.tsx"
git commit -m "feat(formations): add audience toggle to public listing"
```

---

### Task 7: Neutralize the `/formations` hero

**Files:**
- Modify: `src/app/(public)/formations/page.tsx:25-29` (metadata) and `:107-124` (hero markup)

**Interfaces:**
- Consumes: nothing new.
- Produces: no more pro-only framing in title/meta/h1/intro.

- [ ] **Step 1: Update the metadata**

Replace:

```typescript
export const metadata: Metadata = {
  title: "Formations professionnelles",
  description:
    "Formations, ateliers et webinaires pour professionnels de santé en lactation et allaitement. Avec Carole Hervé, consultante IBCLC.",
};
```

with:

```typescript
export const metadata: Metadata = {
  title: "Formations, ateliers et webinaires",
  description:
    "L'agenda des ateliers et webinaires pour les mamans, et des formations pour les professionnels de la périnatalité, avec Carole Hervé, consultante IBCLC.",
};
```

- [ ] **Step 2: Update the hero heading and intro paragraph**

Replace this block (page.tsx:109-124):

```tsx
          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Formez-vous en aiguisant votre regard clinique
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-white/80">
            Professionnels de la périnatalité, thérapeutes manuels, thérapeutes
            psychologiques
            <sup className="ml-0.5">*</sup> : des formations construites sur
            l&apos;observation clinique et les données probantes, pour
            accompagner les familles avec rigueur et humanité.
          </p>
          {/* L'astérisque renvoie au détail de chaque session : la liste des
              métiers concernés varie d'un organisme à l'autre, l'écrire ici
              serait faux pour une partie du catalogue. */}
          <p className="mx-auto mt-2 max-w-3xl text-xs text-white/60">
            * liste des métiers spécifiée dans le détail des sessions
          </p>
```

with:

```tsx
          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Ateliers, webinaires et formations
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-white/80">
            Des sessions animées par Carole Hervé et son équipe de
            consultantes IBCLC : ateliers et webinaires pour les mamans,
            formations approfondies pour les professionnels de la
            périnatalité
            <sup className="ml-0.5">*</sup>.
          </p>
          {/* L'astérisque renvoie au détail de chaque session : la liste des
              métiers concernés varie d'un organisme à l'autre, l'écrire ici
              serait faux pour une partie du catalogue. */}
          <p className="mx-auto mt-2 max-w-3xl text-xs text-white/60">
            * liste des métiers spécifiée dans le détail des sessions
            professionnelles
          </p>
```

- [ ] **Step 3: Manual check**

Run `npm run dev`, open `/formations`. Confirm the hero no longer implies a pro-only audience, and the rest of the hero (stats row, category legend below) is unchanged.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/formations/page.tsx"
git commit -m "content: neutralize /formations hero copy for mixed audience"
```

---

### Task 8: Espace-client dashboard — CTA to the maman-filtered agenda

**Files:**
- Modify: `src/app/(public)/espace-client/page.tsx`

**Interfaces:**
- Consumes: `/formations?audience=maman` route from Task 6.
- Produces: a new card in the dashboard linking there.

- [ ] **Step 1: Add the `Sparkles`-adjacent icon import**

The file already imports `CalendarDays` from `lucide-react` (line 11) — reuse it, no new icon import needed.

- [ ] **Step 2: Insert the CTA card**

In `src/app/(public)/espace-client/page.tsx`, right after the closing `</section>` of the stats bento (around line 250, before the comment `{/* Bento — accompagnements + réservations */}`), add:

```tsx
      {/* CTA agenda maman : point d'entree direct vers /formations filtree,
          pour une cliente qui ne sait pas que l'agenda la concerne aussi. */}
      <section className="flex flex-col items-start gap-3 rounded-3xl border border-border/50 bg-accent-sage-soft p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-sage/30 text-primary-green">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-serif text-base font-semibold text-primary-green">
              Prochains ateliers et webinaires
            </p>
            <p className="text-sm text-muted-foreground">
              Consultez l&apos;agenda des sessions ouvertes aux mamans.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/formations?audience=maman" tabIndex={0}>
            Voir l&apos;agenda
          </Link>
        </Button>
      </section>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `espace-client/page.tsx`.

- [ ] **Step 4: Manual check**

Run `npm run dev`, log in as a client, open `/espace-client`. Confirm the new card appears between the stats row and "Mes accompagnements récents", and clicking "Voir l'agenda" lands on `/formations` with "Pour les mamans" preselected.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/espace-client/page.tsx"
git commit -m "feat(espace-client): add CTA to the maman-filtered formations agenda"
```

---

## Post-plan note

Task 1's migration is written and dry-run validated but **not applied** to the remote database (`npm run db:push` was intentionally not run). Applying it — and thus making `audience_group` selectable in Tasks 4-8 against real data — needs an explicit decision from the project owner before or after this plan's code lands, since it's a shared/production Postgres instance.

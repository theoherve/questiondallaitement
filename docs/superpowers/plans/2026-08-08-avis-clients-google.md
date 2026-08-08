# Avis clients et avis Google — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les témoignages inventés et éclatés du site par une source unique d'avis réels, dont les avis Google identifiés et vérifiables, affichés dans un rendu unique sur la page d'accueil, les pages de vente et une page `/avis` dédiée.

**Architecture:** Un fichier de données typé (`src/data/testimonials.ts`) alimente des fonctions de sélection pures (`src/lib/testimonials.ts`), consommées par un jeu de composants unique (`src/components/public/testimonials/`). Le texte des avis Google est recopié à la main ; seules la note globale et le nombre d'avis viennent de l'API Places, avec repli statique.

**Tech Stack:** Next.js 16 (App Router, React 19), TypeScript, Tailwind, Vitest (environnement `node`, `globals: true`), lucide-react.

**Spec source:** [docs/superpowers/specs/2026-08-08-avis-clients-google-design.md](../specs/2026-08-08-avis-clients-google-design.md)

## Global Constraints

- **Typographie côté visiteur** : aucun tiret cadratin (`—`) dans un texte lu par un visiteur. Les guillemets d'un avis sont les guillemets français `«` `»`, jamais `&ldquo;`. Cette règle ne s'applique pas aux commentaires de code ni à la documentation.
- **Aucun placeholder de contenu** : si le fichier de données ne contient pas d'avis, les sections concernées ne sont pas rendues. Aucun témoignage inventé ne doit subsister ni réapparaître.
- **Aucun balisage JSON-LD de notation** (`AggregateRating`, `Review`) n'est ajouté dans ce plan.
- **Le texte des avis n'est jamais demandé à l'API Places** : seuls les champs `rating` et `userRatingCount` sont récupérés.
- Les tests unitaires du projet sont co-localisés et suffixés `.spec.ts` (voir `src/lib/rate-limit.spec.ts`). Commande : `pnpm test`.
- Les commentaires de code du projet sont en français et expliquent le pourquoi, pas le quoi. Suivre ce ton.

## Structure de fichiers

**Créés :**
- `src/data/testimonials.ts` — types et données des avis, valeurs de repli Google
- `src/lib/testimonials.ts` — sélection pure (module, mise en avant, filtres)
- `src/lib/testimonials.spec.ts` — tests de la sélection
- `src/lib/google-reviews.ts` — récupération de la note globale Google
- `src/components/public/testimonials/testimonial-card.tsx` — carte unique
- `src/components/public/testimonials/testimonial-grid.tsx` — grille 3 colonnes
- `src/components/public/testimonials/testimonial-carousel.tsx` — carrousel (déplacé)
- `src/components/public/testimonials/google-rating-badge.tsx` — badge de note
- `src/app/(public)/avis/page.tsx` — page dédiée

**Modifiés :**
- `src/app/(public)/page.tsx` — badge sous le hero, carrousel alimenté par la sélection
- `src/app/(public)/accompagnements/_components/sales/sales-testimonials.tsx` — prend un `topic`
- `src/app/(public)/accompagnements/_components/module/module-sales-page.tsx` — appel et ancre
- `src/app/(public)/accompagnements/_components/pack/pack-sales-page.tsx` — appel
- `src/app/(public)/accompagnements/_components/module/content/types.ts` — champ `testimonials` retiré
- les 8 fichiers `src/app/(public)/accompagnements/_components/module/content/*.ts` — bloc `testimonials` retiré
- `src/app/(public)/accompagnements/_components/pack/pack-content.ts` — bloc `testimonials` retiré
- `src/app/sitemap.ts` — entrée `/avis`
- `.env.example` — clés Google

**Supprimés :**
- `src/app/(public)/_components/testimonial-carousel.tsx` — remplacé par la version déplacée

---

### Task 1: Données et sélection des avis

**Files:**
- Create: `src/data/testimonials.ts`
- Create: `src/lib/testimonials.ts`
- Test: `src/lib/testimonials.spec.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type TestimonialTopic` (union de `MODULE_ORDER` + `PACK_SLUG`, tous deux de `@/config/accompagnements`)
  - `type Testimonial` (union discriminée sur `source`)
  - `const TESTIMONIALS: readonly Testimonial[]`
  - `const GOOGLE_PROFILE: { url: string; ratingFallback: number; reviewCountFallback: number }`
  - `getTestimonialsForModule(topic: TestimonialTopic, n?: number): Testimonial[]`
  - `getFeaturedTestimonials(n?: number): Testimonial[]`
  - `getAllTestimonials(filters?: { topic?: TestimonialTopic; source?: Testimonial["source"] }): Testimonial[]`

- [ ] **Step 1: Créer le fichier de données**

Créer `src/data/testimonials.ts`. Le tableau `TESTIMONIALS` est **volontairement vide** : les avis réels viendront de Carole. Ne rien y inventer.

```ts
/**
 * Source unique des avis affichés côté visiteur. Les avis Google sont recopiés
 * à la main : l'API Places interdit la mise en cache du texte des avis et n'en
 * renvoie que cinq, choisis par Google. Seuls la note globale et le nombre
 * d'avis sont récupérés en direct (voir src/lib/google-reviews.ts).
 */

import { MODULE_ORDER, PACK_SLUG } from "@/config/accompagnements";

/**
 * Cibles possibles d'un avis : un slug de module, ou le pack. Dérivé de
 * MODULE_ORDER (déclaré `as const`) et non des clés de MODULE_CONTENT, qui sont
 * typées `string` et ne contraindraient rien. Un slug mal orthographié devient
 * ainsi une erreur de compilation.
 */
export type TestimonialTopic =
  | (typeof MODULE_ORDER)[number]
  | typeof PACK_SLUG;

type TestimonialBase = {
  /** Slug stable : clé de rendu et cible de déduplication. */
  id: string;
  author: string;
  /** Contexte affiché sous le nom, par exemple « Maman de Morgan, 3 mois ». */
  detail: string;
  quote: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Vide = avis générique, éligible au repli des pages de vente. */
  topics: readonly TestimonialTopic[];
  /** Éligible à la page d'accueil et au repli des pages de vente. */
  featured?: boolean;
  /** Date ISO (AAAA-MM-JJ). Sert uniquement à l'ordre d'affichage. */
  date?: string;
};

export type Testimonial =
  | (TestimonialBase & { source: "direct" })
  | (TestimonialBase & { source: "google"; reviewUrl: string });

/**
 * Vide tant que Carole n'a pas fourni les avis réels et les autorisations de
 * publication. Les sections concernées ne s'affichent pas : c'est voulu, aucun
 * témoignage d'exemple ne doit être ajouté ici.
 */
export const TESTIMONIALS: readonly Testimonial[] = [];

/**
 * Fiche Google. Les valeurs de repli servent quand l'API est indisponible ou
 * non configurée ; les tenir à jour à la main reste sans conséquence, elles ne
 * sont affichées que dans ce cas.
 */
export const GOOGLE_PROFILE = {
  url: "https://www.google.com/maps",
  ratingFallback: 5,
  reviewCountFallback: 0,
} as const;
```

- [ ] **Step 2: Écrire les tests de sélection**

Créer `src/lib/testimonials.spec.ts`. Les tests injectent leur propre jeu d'avis : la sélection ne doit pas dépendre du contenu réel, qui changera.

```ts
import { describe, it, expect } from "vitest";
import { PACK_SLUG } from "@/config/accompagnements";
import type { Testimonial } from "@/data/testimonials";
import {
  selectForTopic,
  selectFeatured,
  selectAll,
} from "@/lib/testimonials";

const make = (
  id: string,
  overrides: Partial<Testimonial> = {}
): Testimonial => ({
  id,
  author: `Auteur ${id}`,
  detail: "Maman",
  quote: "Un avis.",
  rating: 5,
  topics: [],
  source: "direct",
  ...overrides,
} as Testimonial);

describe("selectForTopic", () => {
  it("ne complète pas quand le sujet a assez d'avis dédiés", () => {
    const pool = [
      make("a", { topics: [PACK_SLUG] }),
      make("b", { topics: [PACK_SLUG] }),
      make("c", { topics: [PACK_SLUG] }),
      make("z", { featured: true }),
    ];

    const result = selectForTopic(pool, PACK_SLUG, 3);

    expect(result.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("complète avec les avis génériques mis en avant", () => {
    const pool = [
      make("a", { topics: [PACK_SLUG] }),
      make("g1", { featured: true }),
      make("g2", { featured: true }),
      make("non-mis-en-avant"),
    ];

    const result = selectForTopic(pool, PACK_SLUG, 3);

    expect(result.map((t) => t.id)).toEqual(["a", "g1", "g2"]);
  });

  it("ne renvoie jamais deux fois le même avis", () => {
    const pool = [
      make("a", { topics: [PACK_SLUG], featured: true }),
      make("g1", { featured: true }),
    ];

    const result = selectForTopic(pool, PACK_SLUG, 3);

    expect(result.map((t) => t.id)).toEqual(["a", "g1"]);
  });

  it("renvoie ce qui existe quand le vivier est trop petit", () => {
    const result = selectForTopic([make("a", { topics: [PACK_SLUG] })], PACK_SLUG, 3);

    expect(result).toHaveLength(1);
  });

  it("renvoie un tableau vide sans avis", () => {
    expect(selectForTopic([], PACK_SLUG, 3)).toEqual([]);
  });

  it("classe du plus récent au plus ancien, à défaut par identifiant", () => {
    const pool = [
      make("b", { topics: [PACK_SLUG] }),
      make("a", { topics: [PACK_SLUG] }),
      make("recent", { topics: [PACK_SLUG], date: "2026-01-01" }),
    ];

    const result = selectForTopic(pool, PACK_SLUG, 3);

    expect(result.map((t) => t.id)).toEqual(["recent", "a", "b"]);
  });
});

describe("selectFeatured", () => {
  it("ne retient que les avis mis en avant, dans la limite demandée", () => {
    const pool = [
      make("f1", { featured: true }),
      make("f2", { featured: true, topics: [PACK_SLUG] }),
      make("autre"),
    ];

    const result = selectFeatured(pool, 6);

    expect(result.map((t) => t.id)).toEqual(["f1", "f2"]);
  });
});

describe("selectAll", () => {
  it("filtre par sujet", () => {
    const pool = [make("a", { topics: [PACK_SLUG] }), make("b")];

    expect(selectAll(pool, { topic: PACK_SLUG }).map((t) => t.id)).toEqual(["a"]);
  });

  it("filtre par source", () => {
    const pool = [
      make("g", { source: "google", reviewUrl: "https://exemple.test/avis" }),
      make("d"),
    ];

    expect(selectAll(pool, { source: "google" }).map((t) => t.id)).toEqual(["g"]);
  });

  it("renvoie tout sans filtre", () => {
    expect(selectAll([make("a"), make("b")])).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Lancer les tests pour les voir échouer**

Run: `pnpm vitest run src/lib/testimonials.spec.ts`
Expected: FAIL, `Failed to resolve import "@/lib/testimonials"`.

- [ ] **Step 4: Écrire la sélection**

Créer `src/lib/testimonials.ts`. Les fonctions `select*` prennent le vivier en paramètre pour rester testables ; les `get*` sont les points d'entrée applicatifs qui y injectent `TESTIMONIALS`.

```ts
import { TESTIMONIALS } from "@/data/testimonials";
import type { Testimonial, TestimonialTopic } from "@/data/testimonials";

/**
 * Ordre déterministe : le plus récent d'abord, l'identifiant départageant les
 * avis sans date. Sans cela, deux builds pourraient rendre un ordre différent.
 */
const byRecency = (a: Testimonial, b: Testimonial) => {
  const dateDiff = (b.date ?? "").localeCompare(a.date ?? "");
  return dateDiff !== 0 ? dateDiff : a.id.localeCompare(b.id);
};

const isGeneric = (t: Testimonial) => t.topics.length === 0;

export function selectForTopic(
  pool: readonly Testimonial[],
  topic: TestimonialTopic,
  n = 3
): Testimonial[] {
  const targeted = pool.filter((t) => t.topics.includes(topic)).sort(byRecency);
  if (targeted.length >= n) return targeted.slice(0, n);

  const alreadyPicked = new Set(targeted.map((t) => t.id));
  const filler = pool
    .filter((t) => t.featured && isGeneric(t) && !alreadyPicked.has(t.id))
    .sort(byRecency);

  return [...targeted, ...filler].slice(0, n);
}

export function selectFeatured(
  pool: readonly Testimonial[],
  n = 6
): Testimonial[] {
  return pool.filter((t) => t.featured).sort(byRecency).slice(0, n);
}

export function selectAll(
  pool: readonly Testimonial[],
  filters: { topic?: TestimonialTopic; source?: Testimonial["source"] } = {}
): Testimonial[] {
  return pool
    .filter((t) => !filters.topic || t.topics.includes(filters.topic))
    .filter((t) => !filters.source || t.source === filters.source)
    .sort(byRecency);
}

export const getTestimonialsForModule = (topic: TestimonialTopic, n = 3) =>
  selectForTopic(TESTIMONIALS, topic, n);

export const getFeaturedTestimonials = (n = 6) =>
  selectFeatured(TESTIMONIALS, n);

export const getAllTestimonials = (
  filters: { topic?: TestimonialTopic; source?: Testimonial["source"] } = {}
) => selectAll(TESTIMONIALS, filters);
```

- [ ] **Step 5: Lancer les tests pour les voir passer**

Run: `pnpm vitest run src/lib/testimonials.spec.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add src/data/testimonials.ts src/lib/testimonials.ts src/lib/testimonials.spec.ts
git commit -m "feat(avis): source unique et sélection des témoignages"
```

---

### Task 2: Note globale Google

**Files:**
- Create: `src/lib/google-reviews.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `GOOGLE_PROFILE` de `src/data/testimonials.ts` (Task 1).
- Produces: `getGoogleRating(): Promise<{ rating: number; reviewCount: number; isLive: boolean }>`

- [ ] **Step 1: Écrire la récupération de la note**

Créer `src/lib/google-reviews.ts`.

```ts
import { GOOGLE_PROFILE } from "@/data/testimonials";

export type GoogleRating = {
  rating: number;
  reviewCount: number;
  /** false quand la valeur vient du repli statique. */
  isLive: boolean;
};

const FALLBACK: GoogleRating = {
  rating: GOOGLE_PROFILE.ratingFallback,
  reviewCount: GOOGLE_PROFILE.reviewCountFallback,
  isLive: false,
};

/**
 * Note globale et nombre d'avis de la fiche Google. Seuls ces deux champs sont
 * demandés : le texte des avis ne peut pas être mis en cache selon les
 * conditions de l'API Places, la note et le compte n'ont pas cette contrainte.
 *
 * Ne lève jamais. Une fiche Google indisponible ne doit pas faire tomber une
 * page de vente.
 */
export async function getGoogleRating(): Promise<GoogleRating> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) return FALLBACK;

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=rating,userRatingCount`,
      {
        headers: { "X-Goog-Api-Key": apiKey },
        next: { revalidate: 86400 },
      }
    );
    if (!response.ok) return FALLBACK;

    const data: unknown = await response.json();
    const rating = (data as { rating?: unknown }).rating;
    const count = (data as { userRatingCount?: unknown }).userRatingCount;
    if (typeof rating !== "number" || typeof count !== "number") return FALLBACK;

    return { rating, reviewCount: count, isLive: true };
  } catch {
    return FALLBACK;
  }
}
```

- [ ] **Step 2: Documenter les variables d'environnement**

Ajouter à la fin de `.env.example` :

```bash
# Google Places (note globale de la fiche de Carole)
# Sans ces deux variables, le badge de note retombe sur les valeurs statiques
# de src/data/testimonials.ts. Le texte des avis n'est jamais récupéré par API.
GOOGLE_PLACES_API_KEY=
GOOGLE_PLACE_ID=
```

- [ ] **Step 3: Vérifier la compilation**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add src/lib/google-reviews.ts .env.example
git commit -m "feat(avis): note globale Google avec repli statique"
```

---

### Task 3: Composants d'affichage

**Files:**
- Create: `src/components/public/testimonials/testimonial-card.tsx`
- Create: `src/components/public/testimonials/testimonial-grid.tsx`
- Create: `src/components/public/testimonials/testimonial-carousel.tsx`
- Create: `src/components/public/testimonials/google-rating-badge.tsx`

**Interfaces:**
- Consumes: `Testimonial` (Task 1), `getGoogleRating` (Task 2), `GOOGLE_PROFILE` (Task 1), `ScrollReveal` de `@/components/public/scroll-reveal`, `Button` de `@/components/ui/button`.
- Produces:
  - `<TestimonialCard testimonial={t} />`
  - `<TestimonialGrid items={t[]} />`
  - `<TestimonialCarousel testimonials={t[]} />` (client)
  - `<GoogleRatingBadge />` (async server component)

Aucun test unitaire ici : ces composants n'ont pas de logique, la vérification passe par le rendu réel en Task 4.

- [ ] **Step 1: Créer la carte**

Créer `src/components/public/testimonials/testimonial-card.tsx`. Le badge Google n'apparaît que pour `source: "google"`, où TypeScript garantit la présence de `reviewUrl`.

```tsx
import { Star } from "lucide-react";
import type { Testimonial } from "@/data/testimonials";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <blockquote className="flex h-full flex-col rounded-lg border border-primary-green/10 bg-white p-7 shadow-sm">
      <div
        className="flex gap-0.5"
        aria-label={`${testimonial.rating} étoiles sur 5`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={
              i < testimonial.rating
                ? "h-4 w-4 fill-primary-red text-primary-red"
                : "h-4 w-4 text-primary-green/20"
            }
            aria-hidden
          />
        ))}
      </div>

      <p className="mt-4 flex-1 font-serif text-base leading-relaxed text-primary-green/90 italic">
        « {testimonial.quote} »
      </p>

      <footer className="mt-6 border-t border-primary-green/10 pt-4">
        <p className="font-sans text-sm font-semibold text-primary-green">
          {testimonial.author}
        </p>
        <p className="mt-0.5 font-sans text-xs text-primary-green/50">
          {testimonial.detail}
        </p>

        {testimonial.source === "google" && (
          <a
            href={testimonial.reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-sans text-xs text-primary-green/60 underline-offset-2 hover:text-primary-green hover:underline"
          >
            <GoogleGlyph />
            Avis Google
          </a>
        )}
      </footer>
    </blockquote>
  );
}

/** Le « G » de Google, aux couleurs de la marque. */
function GoogleGlyph() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#4285F4"
        d="M45 24c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.9-1.5 4.7-4.4 6.6l6.7 5.2C42.2 35.5 45 30.3 45 24z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.3 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.6C2.9 17 2 20.4 2 24s.9 7 2.4 10l7.1-5.6z"
      />
      <path
        fill="#EA4335"
        d="M24 10.4c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.2 29.9 2 24 2 15.4 2 8 6.7 4.4 14l7.1 5.6c1.8-5.3 6.7-9.2 12.5-9.2z"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Créer la grille**

Créer `src/components/public/testimonials/testimonial-grid.tsx`.

```tsx
import { ScrollReveal } from "@/components/public/scroll-reveal";
import type { Testimonial } from "@/data/testimonials";
import { TestimonialCard } from "./testimonial-card";

export function TestimonialGrid({ items }: { items: readonly Testimonial[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map((testimonial, i) => (
        <ScrollReveal key={testimonial.id} delay={i * 80}>
          <TestimonialCard testimonial={testimonial} />
        </ScrollReveal>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Créer le carrousel**

Créer `src/components/public/testimonials/testimonial-carousel.tsx`. Reprend le comportement du carrousel actuel (3 par page, défilement automatique toutes les 6 secondes), sans données en dur, et délègue le rendu d'un avis à `TestimonialCard`.

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Testimonial } from "@/data/testimonials";
import { TestimonialCard } from "./testimonial-card";

const PER_PAGE = 3;

export const TestimonialCarousel = ({
  testimonials,
}: {
  testimonials: readonly Testimonial[];
}) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(testimonials.length / PER_PAGE));

  const next = useCallback(
    () => setPage((p) => (p + 1) % totalPages),
    [totalPages]
  );
  const prev = useCallback(
    () => setPage((p) => (p - 1 + totalPages) % totalPages),
    [totalPages]
  );

  // Défilement automatique, seulement s'il y a plusieurs pages.
  useEffect(() => {
    if (totalPages < 2) return;
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [next, totalPages]);

  if (testimonials.length === 0) return null;

  const visible = testimonials.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className="py-12 lg:py-16">
      <div className="grid gap-5 md:grid-cols-3">
        {visible.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            className="text-primary-green/60 hover:bg-primary-green/5 hover:text-primary-green"
            aria-label="Témoignages précédents"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-2 transition-all ${
                  i === page
                    ? "w-6 bg-primary-red"
                    : "w-2 bg-primary-green/20 hover:bg-primary-green/40"
                }`}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            className="text-primary-green/60 hover:bg-primary-green/5 hover:text-primary-green"
            aria-label="Témoignages suivants"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Créer le badge de note**

Créer `src/components/public/testimonials/google-rating-badge.tsx`. Il ne s'affiche pas tant qu'aucun avis n'est comptabilisé, pour éviter d'annoncer « 0 avis ».

```tsx
import { Star } from "lucide-react";
import { GOOGLE_PROFILE } from "@/data/testimonials";
import { getGoogleRating } from "@/lib/google-reviews";

export async function GoogleRatingBadge({
  className = "",
}: {
  className?: string;
}) {
  const { rating, reviewCount } = await getGoogleRating();
  if (reviewCount === 0) return null;

  const formattedRating = rating.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <a
      href={GOOGLE_PROFILE.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-primary-green/10 bg-white px-4 py-2 font-sans text-sm text-primary-green shadow-sm transition-colors hover:border-primary-green/25 ${className}`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-primary-red text-primary-red" />
        ))}
      </span>
      <span className="font-semibold">{formattedRating}</span>
      <span className="text-primary-green/60">
        sur {reviewCount} avis Google
      </span>
    </a>
  );
}
```

- [ ] **Step 5: Vérifier la compilation et le lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/testimonials
git commit -m "feat(avis): composants carte, grille, carrousel et badge Google"
```

---

### Task 4: Page d'accueil

**Files:**
- Modify: `src/app/(public)/page.tsx:8` (import), `src/app/(public)/page.tsx:529-547` (section témoignages)
- Delete: `src/app/(public)/_components/testimonial-carousel.tsx`

**Interfaces:**
- Consumes: `getFeaturedTestimonials` (Task 1), `TestimonialCarousel` et `GoogleRatingBadge` (Task 3).
- Produces: rien.

- [ ] **Step 1: Remplacer l'import**

Dans `src/app/(public)/page.tsx`, remplacer :

```tsx
import { TestimonialCarousel } from "./_components/testimonial-carousel";
```

par :

```tsx
import { TestimonialCarousel } from "@/components/public/testimonials/testimonial-carousel";
import { GoogleRatingBadge } from "@/components/public/testimonials/google-rating-badge";
import { getFeaturedTestimonials } from "@/lib/testimonials";
```

- [ ] **Step 2: Alimenter la section et la masquer si elle est vide**

Toujours dans `src/app/(public)/page.tsx`, calculer les avis en haut du composant de page (à côté des autres données déjà chargées, par exemple `consultants`) :

```tsx
const featuredTestimonials = getFeaturedTestimonials();
```

Puis remplacer tout le bloc `{/* ─── TÉMOIGNAGES ─── */}` (`<section>` comprise) par :

```tsx
{/* ─── TÉMOIGNAGES ─── */}
{featuredTestimonials.length > 0 && (
  <section className="bg-background-beige-dark section-padding">
    <div className="mx-auto max-w-6xl">
      <ScrollReveal>
        <div className="text-center">
          <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
            Témoignages
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
            Et la parentalité devient plus douce...
          </h2>
          <p className="mt-4 text-primary-green/60">
            Des mamans partagent leur expérience
          </p>
          <div className="mt-6 flex justify-center">
            <GoogleRatingBadge />
          </div>
        </div>
      </ScrollReveal>
      <TestimonialCarousel testimonials={featuredTestimonials} />
    </div>
  </section>
)}
```

- [ ] **Step 3: Supprimer l'ancien carrousel**

```bash
git rm "src/app/(public)/_components/testimonial-carousel.tsx"
```

- [ ] **Step 4: Vérifier qu'aucune référence ne subsiste**

Run: `grep -rn "_components/testimonial-carousel" src`
Expected: aucun résultat.

- [ ] **Step 5: Vérifier la compilation et le rendu**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: build réussi. La section témoignages de la page d'accueil ne s'affiche plus, le fichier de données étant vide : c'est le comportement attendu.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/page.tsx"
git commit -m "feat(avis): page d'accueil alimentée par la source unique"
```

---

### Task 5: Pages de vente module et pack

**Files:**
- Modify: `src/app/(public)/accompagnements/_components/sales/sales-testimonials.tsx`
- Modify: `src/app/(public)/accompagnements/_components/module/module-sales-page.tsx:158-164` (ancres), `:217-221` (rendu)
- Modify: `src/app/(public)/accompagnements/_components/pack/pack-sales-page.tsx:140-143`
- Modify: `src/app/(public)/accompagnements/_components/module/content/types.ts:1` (import), `:51-54` (champ)
- Modify: les 8 fichiers `src/app/(public)/accompagnements/_components/module/content/*.ts` (bloc `testimonials`)
- Modify: `src/app/(public)/accompagnements/_components/pack/pack-content.ts:96-118`

**Interfaces:**
- Consumes: `getTestimonialsForModule` (Task 1), `TestimonialGrid` (Task 3), `TestimonialTopic` (Task 1).
- Produces: `<SalesTestimonials topic={TestimonialTopic} title?={string} />`

- [ ] **Step 1: Réécrire SalesTestimonials**

Remplacer intégralement le contenu de `src/app/(public)/accompagnements/_components/sales/sales-testimonials.tsx`. Le type `Testimonial` qui y était exporté disparaît : il vit désormais dans `src/data/testimonials.ts`.

```tsx
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { TestimonialGrid } from "@/components/public/testimonials/testimonial-grid";
import type { TestimonialTopic } from "@/data/testimonials";
import { getTestimonialsForModule } from "@/lib/testimonials";
import { Section } from "./section";

const DEFAULT_TITLE = "Elles en parlent mieux que moi";

export function SalesTestimonials({
  topic,
  title = DEFAULT_TITLE,
}: {
  topic: TestimonialTopic;
  title?: string;
}) {
  const items = getTestimonialsForModule(topic);
  if (items.length === 0) return null;

  return (
    <Section id="temoignages" className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
      </ScrollReveal>
      <div className="mt-10">
        <TestimonialGrid items={items} />
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Adapter la page de vente module**

Dans `src/app/(public)/accompagnements/_components/module/module-sales-page.tsx` :

Ajouter les imports :

```tsx
import type { TestimonialTopic } from "@/data/testimonials";
import { getTestimonialsForModule } from "@/lib/testimonials";
```

Calculer le sujet et la présence d'avis, juste après `const faqItems: FaqItem[] = ...` :

```tsx
// Le slug sert de sujet d'avis. Le transtypage est sûr : la page appelante a
// déjà validé que le slug appartient à MODULE_CONTENT.
const testimonialTopic = accompagnement.slug as TestimonialTopic;
const hasTestimonials = getTestimonialsForModule(testimonialTopic).length > 0;
```

Remplacer l'entrée d'ancre conditionnelle :

```tsx
    ...(content.testimonials
      ? [{ href: "#temoignages", label: "Témoignages" }]
      : []),
```

par :

```tsx
    ...(hasTestimonials
      ? [{ href: "#temoignages", label: "Témoignages" }]
      : []),
```

Remplacer le rendu :

```tsx
      {content.testimonials && (
        <SalesTestimonials
          title={content.testimonials.title}
          items={content.testimonials.items}
        />
      )}
```

par :

```tsx
      <SalesTestimonials topic={testimonialTopic} />
```

- [ ] **Step 3: Adapter la page de vente pack**

Dans `src/app/(public)/accompagnements/_components/pack/pack-sales-page.tsx`, remplacer :

```tsx
      <SalesTestimonials
        title={PACK_CONTENT.testimonials.title}
        items={PACK_CONTENT.testimonials.items}
      />
```

par :

```tsx
      <SalesTestimonials topic={PACK_SLUG} />
```

`PACK_SLUG` y est déjà importé (ligne 2), aucun import à ajouter.

- [ ] **Step 4: Retirer le champ des types de contenu**

Dans `src/app/(public)/accompagnements/_components/module/content/types.ts` :

Supprimer la première ligne d'import :

```ts
import type { Testimonial } from "../../sales/sales-testimonials";
```

Supprimer le champ :

```ts
  testimonials?: {
    title: string;
    items: Testimonial[];
  };
```

- [ ] **Step 5: Retirer les blocs de données inventées**

Supprimer le bloc `testimonials: { ... }` complet dans chacun des 9 fichiers :

- `content/je-me-prepare-a-allaiter.ts`
- `content/mon-allaitement-des-premiers-jours.ts`
- `content/mon-allaitement-au-fil-des-mois.ts`
- `content/je-reprends-une-activite-professionnelle.ts`
- `content/la-diversification-de-mon-bebe-allaite.ts`
- `content/je-souhaite-sevrer-mon-bebe.ts`
- `content/mon-bebe-ne-fait-pas-ses-nuits.ts`
- `content/les-urgences-allaitement.ts`
- `pack/pack-content.ts`

Certains modules peuvent ne pas avoir de bloc `testimonials` : ne rien y faire.

- [ ] **Step 6: Vérifier qu'aucune donnée inventée ne subsiste**

Run: `grep -rn "testimonials" "src/app/(public)/accompagnements"`
Expected: uniquement les occurrences de `sales-testimonials.tsx`, l'import et l'appel dans `module-sales-page.tsx` et `pack-sales-page.tsx`. Aucun tableau `items`.

- [ ] **Step 7: Vérifier la compilation, le lint et les tests**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: aucune erreur.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(public)/accompagnements"
git commit -m "feat(avis): pages de vente branchées sur la sélection par sujet"
```

---

### Task 6: Page /avis

**Files:**
- Create: `src/app/(public)/avis/page.tsx`
- Modify: `src/app/sitemap.ts`

**Interfaces:**
- Consumes: `getAllTestimonials` (Task 1), `TestimonialGrid` et `GoogleRatingBadge` (Task 3), `TestimonialTopic` (Task 1).
- Produces: la route `/avis`, filtrable par `?sujet=<slug>`.

- [ ] **Step 1: Créer la page**

Créer `src/app/(public)/avis/page.tsx`. Le filtre passe par l'URL et non par un état client : la page reste rendue côté serveur et chaque sujet est une URL indexable.

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { GoogleRatingBadge } from "@/components/public/testimonials/google-rating-badge";
import { TestimonialGrid } from "@/components/public/testimonials/testimonial-grid";
import { PACK_SLUG } from "@/config/accompagnements";
import type { TestimonialTopic } from "@/data/testimonials";
import { getAllTestimonials } from "@/lib/testimonials";

export const metadata: Metadata = {
  title: "Avis",
  description:
    "Les retours des mamans accompagnées par Carole Hervé, consultante en lactation IBCLC, et les avis publiés sur sa fiche Google.",
};

const FILTERS: { label: string; topic?: TestimonialTopic }[] = [
  { label: "Tous les avis" },
  { label: "Se préparer", topic: "je-me-prepare-a-allaiter" },
  { label: "Premiers jours", topic: "mon-allaitement-des-premiers-jours" },
  { label: "Au fil des mois", topic: "mon-allaitement-au-fil-des-mois" },
  { label: "Reprise du travail", topic: "je-reprends-une-activite-professionnelle" },
  { label: "Diversification", topic: "la-diversification-de-mon-bebe-allaite" },
  { label: "Sevrage", topic: "je-souhaite-sevrer-mon-bebe" },
  { label: "Sommeil", topic: "mon-bebe-ne-fait-pas-ses-nuits" },
  { label: "Urgences", topic: "les-urgences-allaitement" },
  { label: "Le pack", topic: PACK_SLUG },
];

export default async function AvisPage({
  searchParams,
}: {
  searchParams: Promise<{ sujet?: string }>;
}) {
  const { sujet } = await searchParams;
  // Un sujet inconnu dans l'URL est ignoré plutôt que traité en 404 : la page
  // reste utile, seul le filtre retombe sur « tous les avis ».
  const active = FILTERS.find((f) => f.topic === sujet)?.topic;
  const testimonials = getAllTestimonials({ topic: active });

  return (
    <div className="section-padding">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center">
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
              Avis
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold text-primary-green lg:text-5xl">
              Ce qu'elles en disent
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-primary-green/60">
              Les retours des mamans accompagnées, et les avis publiés sur la
              fiche Google du cabinet.
            </p>
            <div className="mt-6 flex justify-center">
              <GoogleRatingBadge />
            </div>
          </div>
        </ScrollReveal>

        <nav
          className="mt-10 flex flex-wrap justify-center gap-2"
          aria-label="Filtrer les avis par sujet"
        >
          {FILTERS.map((filter) => {
            const isActive = filter.topic === active;
            return (
              <Link
                key={filter.label}
                href={filter.topic ? `/avis?sujet=${filter.topic}` : "/avis"}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full border px-4 py-1.5 font-sans text-sm transition-colors ${
                  isActive
                    ? "border-primary-green bg-primary-green text-white"
                    : "border-primary-green/15 text-primary-green/70 hover:border-primary-green/40 hover:text-primary-green"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10">
          {testimonials.length > 0 ? (
            <TestimonialGrid items={testimonials} />
          ) : (
            <p className="py-16 text-center text-primary-green/50">
              Aucun avis sur ce sujet pour le moment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Référencer la page dans le sitemap**

Dans `src/app/sitemap.ts`, ajouter cette entrée juste après celle de `/medias` :

```ts
    {
      url: `${BASE_URL}/avis`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
```

- [ ] **Step 3: Vérifier**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm build`
Expected: build réussi, route `/avis` présente dans la sortie.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/avis" src/app/sitemap.ts
git commit -m "feat(avis): page dédiée filtrable par sujet"
```

---

## Après le plan

Le code est complet mais le site n'affiche encore aucun avis : `TESTIMONIALS` est vide, par construction. La mise en ligne demande à Carole :

- le Place ID de sa fiche et une clé API Places (`GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID`), plus l'URL publique de la fiche à reporter dans `GOOGLE_PROFILE.url` ;
- les avis Google à mettre en avant, chacun avec son URL ;
- les avis directs, avec l'autorisation de publication et le nommage souhaité.

Le remplissage de `src/data/testimonials.ts` est un travail de contenu, hors de ce plan.

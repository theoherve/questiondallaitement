# Page de vente du pack (structure Ascend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer la page du pack `pack-essentiel-allaitement` en une page de vente long-form (structure « Ascend »), sans changer l'architecture ni la charte.

**Architecture:** Special-case dans `accompagnements/[slug]/page.tsx` : quand `slug === PACK_SLUG`, on rend un composant dédié `<PackSalesPage>` (arbre de sections modulaires) au lieu de la fiche produit générique. Les autres accompagnements sont inchangés. Le paiement réutilise `PurchaseButton` (redirection Stripe Checkout). Les animations réutilisent le composant existant `ScrollReveal`.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Tailwind v4, lucide-react, Supabase, Vitest (env `node`).

## Global Constraints

- **Ne pas changer l'architecture technique.** Pas de nouvelle route, pas de Stripe Elements, pas de nouveau CRM.
- **Charte existante uniquement.** Tokens autorisés : `primary-green` `#203634`, `primary-red` `#a0283e` (+ `-light`/`-dark`), `background-beige` `#fff8f6`, `background-beige-dark`, `accent-peach`/`-soft`, `accent-sage`/`-soft`, `accent-honey`/`-soft`, `accent-cream`. Titres = `font-serif` (Noto Serif). **Aucun** token marron/rose du doc source.
- **Route réelle :** `/accompagnements/[slug]`, table `formations`, filtres `status = "published"` + `deleted_at IS NULL`. `PACK_SLUG = "pack-essentiel-allaitement"` (importé de `@/config/accompagnements`).
- **Paiement inchangé :** composant `PurchaseButton` (`src/app/(public)/accompagnements/_components/purchase-button.tsx`), props `{ formationId: string; isLoggedIn: boolean; isEnrolled: boolean }`.
- **Contenu :** les 8 modules affichés sont **réels** (DB). Toute la copie narrative est du **placeholder** isolé dans `pack-content.ts`.
- **Env de test :** Vitest `environment: "node"` — pas de jsdom/RTL. On teste uniquement la logique pure. Les composants présentiels sont vérifiés par `tsc`/lint/build + contrôle visuel.
- **Commandes :** typecheck `pnpm exec tsc --noEmit` · lint `pnpm lint` · test `pnpm exec vitest run <file>` · build `pnpm build`.
- **Répertoire cible des nouveaux composants :** `src/app/(public)/accompagnements/_components/pack/`.

---

## File Structure

Créés :
- `src/app/(public)/accompagnements/_components/pack/pack-content.ts` — copie placeholder (data pure).
- `src/app/(public)/accompagnements/_components/pack/pack-modules-data.ts` — view-model modules (logique pure).
- `src/app/(public)/accompagnements/_components/pack/pack-modules-data.spec.ts` — test unitaire.
- `src/app/(public)/accompagnements/_components/pack/pack-faq.tsx` — accordéon FAQ (client).
- `src/app/(public)/accompagnements/_components/pack/pack-sticky-header.tsx` — header sticky + ancres (client).
- `src/app/(public)/accompagnements/_components/pack/pack-sections.tsx` — sections présentielles (server).
- `src/app/(public)/accompagnements/_components/pack/pack-sales-page.tsx` — orchestrateur (server).

Modifié :
- `src/app/(public)/accompagnements/[slug]/page.tsx` — branche `PACK_SLUG` + fetch modules.

Réutilisés tels quels : `ScrollReveal` (`@/components/public/scroll-reveal`), `PurchaseButton`, `MODULE_ORDER`/`MODULE_ACCENTS`/`sortByModuleOrder`/`formatPrice` (`@/config/accompagnements`).

---

## Task 1: Contenu placeholder + view-model modules (avec test)

**Files:**
- Create: `src/app/(public)/accompagnements/_components/pack/pack-content.ts`
- Create: `src/app/(public)/accompagnements/_components/pack/pack-modules-data.ts`
- Test: `src/app/(public)/accompagnements/_components/pack/pack-modules-data.spec.ts`

**Interfaces:**
- Produces:
  - `PACK_CONTENT` (objet gelé, voir code) — consommé par les sections.
  - `type ModuleRow = { id: string; title: string; slug: string; short_description: string | null; thumbnail_url: string | null; price_cents: number; currency: string }`
  - `type ModuleCard = ModuleRow & { accent: ModuleAccent | null }`
  - `buildModuleCards(rows: ModuleRow[]): ModuleCard[]` — trie via `sortByModuleOrder`, attache l'accent depuis `MODULE_ACCENTS`.

- [ ] **Step 1: Écrire le test qui échoue**

`src/app/(public)/accompagnements/_components/pack/pack-modules-data.spec.ts` :

```ts
import { describe, it, expect } from "vitest";
import { buildModuleCards, type ModuleRow } from "./pack-modules-data";

const row = (slug: string): ModuleRow => ({
  id: slug,
  title: slug,
  slug,
  short_description: null,
  thumbnail_url: null,
  price_cents: 2900,
  currency: "EUR",
});

describe("buildModuleCards", () => {
  it("ordonne les modules selon MODULE_ORDER (pas l'ordre d'entrée)", () => {
    const cards = buildModuleCards([
      row("je-souhaite-sevrer-mon-bebe"),
      row("je-me-prepare-a-allaiter"),
    ]);
    expect(cards.map((c) => c.slug)).toEqual([
      "je-me-prepare-a-allaiter",
      "je-souhaite-sevrer-mon-bebe",
    ]);
  });

  it("attache l'accent connu et null pour un slug inconnu", () => {
    const cards = buildModuleCards([
      row("je-me-prepare-a-allaiter"),
      row("slug-inconnu"),
    ]);
    const known = cards.find((c) => c.slug === "je-me-prepare-a-allaiter");
    const unknown = cards.find((c) => c.slug === "slug-inconnu");
    expect(known?.accent?.iconKey).toBe("Sprout");
    expect(unknown?.accent).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer le test → échec attendu**

Run: `pnpm exec vitest run src/app/\(public\)/accompagnements/_components/pack/pack-modules-data.spec.ts`
Expected: FAIL — `Cannot find module './pack-modules-data'`.

- [ ] **Step 3: Implémenter `pack-modules-data.ts`**

```ts
import {
  MODULE_ACCENTS,
  sortByModuleOrder,
  type ModuleAccent,
} from "@/config/accompagnements";

export type ModuleRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
};

export type ModuleCard = ModuleRow & { accent: ModuleAccent | null };

/** Trie les modules (MODULE_ORDER) et attache leur accent visuel. */
export function buildModuleCards(rows: ModuleRow[]): ModuleCard[] {
  return sortByModuleOrder(rows).map((row) => ({
    ...row,
    accent: MODULE_ACCENTS[row.slug] ?? null,
  }));
}
```

- [ ] **Step 4: Lancer le test → succès attendu**

Run: `pnpm exec vitest run src/app/\(public\)/accompagnements/_components/pack/pack-modules-data.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Créer `pack-content.ts`**

```ts
/**
 * Copie PLACEHOLDER de la page de vente du pack.
 * 100 % sérialisable — remplacer par les vrais textes sans toucher à la structure.
 * Les 8 modules affichés viennent de la DB, pas d'ici.
 */
export const PACK_CONTENT = {
  hero: {
    eyebrow: "Pack essentiel allaitement",
    subtitle:
      "Le programme complet pour vivre un allaitement serein, de la préparation au sevrage — à votre rythme, où que vous soyez.",
    reassurances: [
      "Accès immédiat après paiement",
      "Accès illimité, à vie",
      "Par une consultante IBCLC",
    ],
    ctaLabel: "Rejoindre le pack",
  },
  problem: {
    title: "L'allaitement, ça ne devrait pas être un parcours du combattant",
    intro:
      "Vous vous êtes préparée à accueillir votre bébé, mais personne ne vous a vraiment préparée à l'allaitement.",
    points: [
      "Des douleurs qui s'installent sans que vous sachiez pourquoi.",
      "Des conseils contradictoires à chaque personne consultée.",
      "La peur de « ne pas avoir assez de lait ».",
      "Des nuits hachées et le sentiment d'être seule face aux difficultés.",
      "Le retour au travail qui approche, sans plan clair.",
      "L'impression que tout repose sur vous, en permanence.",
    ],
  },
  promise: {
    title: "Et si vous aviez enfin les bonnes réponses, au bon moment ?",
    paragraphs: [
      "Le pack essentiel réunit tout ce dont vous avez besoin pour comprendre, anticiper et surmonter chaque étape de votre allaitement.",
      "Des contenus clairs, fondés sur les preuves, accessibles à toute heure — parce qu'un bébé ne pleure pas aux heures d'ouverture.",
    ],
    bullets: [
      "Comprendre ce qui se passe et pourquoi.",
      "Savoir quoi faire, concrètement, à chaque étape.",
      "Reprendre confiance en vous et en votre corps.",
    ],
  },
  modules: {
    title: "Tout ce que contient le pack",
    subtitle:
      "Huit parcours complets qui couvrent l'allaitement de la préparation au sevrage.",
  },
  howItWorks: {
    title: "Comment ça se passe",
    steps: [
      {
        title: "Vous rejoignez le pack",
        text: "Paiement sécurisé, puis accès immédiat à l'ensemble des modules.",
      },
      {
        title: "Vous avancez à votre rythme",
        text: "Chaque module est disponible à vie : vous piochez selon votre besoin du moment.",
      },
      {
        title: "Vous appliquez, sereinement",
        text: "Des contenus concrets et fondés sur les preuves, pour agir en confiance.",
      },
    ],
  },
  forWho: {
    title: "Vous allez vous reconnaître",
    scenarios: [
      "Vous êtes enceinte et vous voulez mettre toutes les chances de votre côté.",
      "Votre bébé vient de naître et les premiers jours sont plus durs que prévu.",
      "Vous reprenez le travail et vous ne savez pas comment organiser la suite.",
      "Vous vous posez mille questions sur la diversification.",
      "Vous envisagez le sevrage et vous voulez le faire en douceur.",
    ],
  },
  instructor: {
    title: "Votre formatrice",
    fallbackName: "Votre consultante IBCLC",
    fallbackBio:
      "Consultante en lactation certifiée IBCLC, elle accompagne les familles avec une approche fondée sur les preuves et bienveillante.",
    credentials: [
      "Consultante certifiée IBCLC",
      "Approche fondée sur les preuves",
      "Des milliers de familles accompagnées",
    ],
  },
  testimonials: {
    title: "Elles ont retrouvé un allaitement serein",
    items: [
      {
        quote:
          "J'étais à deux doigts d'arrêter à cause des douleurs. Les modules m'ont tout expliqué, aujourd'hui j'allaite sans douleur.",
        author: "Marie",
        detail: "Maman de Léa, 3 mois",
      },
      {
        quote:
          "Enfin des réponses claires et non culpabilisantes. J'ai repris confiance en moi.",
        author: "Sarah",
        detail: "Maman de Adam, 5 mois",
      },
      {
        quote:
          "La reprise du travail m'angoissait. Le module dédié a tout changé.",
        author: "Camille",
        detail: "Maman de Jules, 7 mois",
      },
    ],
  },
  pricing: {
    title: "Rejoignez le pack essentiel",
    subtitle: "Un accès unique à l'ensemble des modules, à vie.",
    includes: [
      "Les 8 modules complets",
      "Accès immédiat et illimité",
      "Mises à jour incluses",
      "Paiement sécurisé, en 1x, 3x ou 4x sans frais",
    ],
    guarantee: "Paiement 100 % sécurisé — contenu accessible immédiatement.",
  },
  faq: {
    title: "Questions fréquentes",
    items: [
      {
        q: "Quand ai-je accès au contenu ?",
        a: "Immédiatement après votre paiement. Vous recevez vos accès et pouvez commencer tout de suite.",
      },
      {
        q: "Pendant combien de temps ai-je accès ?",
        a: "À vie. Vous revenez sur les modules autant de fois que vous le souhaitez, à votre rythme.",
      },
      {
        q: "Puis-je payer en plusieurs fois ?",
        a: "Oui, le paiement en 3x ou 4x sans frais est proposé au moment du règlement.",
      },
      {
        q: "Le contenu est-il fiable ?",
        a: "Oui. Tous les contenus sont conçus par une consultante en lactation IBCLC, selon une approche fondée sur les preuves.",
      },
      {
        q: "Et si je débute tout juste ma grossesse ?",
        a: "Le pack couvre la préparation à l'allaitement : c'est le moment idéal pour prendre de l'avance sereinement.",
      },
    ],
  },
  finalCta: {
    title: "Offrez-vous un allaitement serein",
    subtitle:
      "Rejoignez le pack essentiel et avancez avec les bonnes réponses, à chaque étape.",
    ctaLabel: "Rejoindre le pack",
  },
} as const;
```

- [ ] **Step 6: Typecheck + commit**

```bash
pnpm exec tsc --noEmit
git add "src/app/(public)/accompagnements/_components/pack/pack-content.ts" \
        "src/app/(public)/accompagnements/_components/pack/pack-modules-data.ts" \
        "src/app/(public)/accompagnements/_components/pack/pack-modules-data.spec.ts"
git commit -m "feat(pack): contenu placeholder + view-model modules (testé)"
```
Expected: `tsc` sans erreur, test vert.

---

## Task 2: Accordéon FAQ (client)

**Files:**
- Create: `src/app/(public)/accompagnements/_components/pack/pack-faq.tsx`

**Interfaces:**
- Consumes: `PACK_CONTENT.faq` (Task 1).
- Produces: `export function PackFaq(): JSX.Element` — auto-suffisant, lit `PACK_CONTENT.faq`.

Accordéon maison (pas de dépendance radix nécessaire), ouverture animée via `grid-template-rows`.

- [ ] **Step 1: Implémenter `pack-faq.tsx`**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PACK_CONTENT } from "./pack-content";

export function PackFaq() {
  const [open, setOpen] = useState<number | null>(0);
  const { title, items } = PACK_CONTENT.faq;

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center font-serif text-3xl font-bold text-primary-green sm:text-4xl">
        {title}
      </h2>
      <div className="mt-8 space-y-3">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="overflow-hidden rounded-lg border border-primary-green/10 bg-white"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-primary-green">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-primary-red transition-transform duration-300",
                    isOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-primary-green/70">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add "src/app/(public)/accompagnements/_components/pack/pack-faq.tsx"
git commit -m "feat(pack): accordéon FAQ animé"
```
Expected: aucune erreur.

---

## Task 3: Header sticky + ancres (client)

**Files:**
- Create: `src/app/(public)/accompagnements/_components/pack/pack-sticky-header.tsx`

**Interfaces:**
- Produces: `export function PackStickyHeader(props: { title: string; priceLabel: string }): JSX.Element`
- Consumes: rien d'externe (ancres = `#programme`, `#temoignages`, `#faq`, `#tarif` posées par les sections en Task 4/5).

Barre apparaissant après ~500px de scroll (blur), CTA `<a href="#tarif">` + ancres.

- [ ] **Step 1: Implémenter `pack-sticky-header.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = { title: string; priceLabel: string };

const ANCHORS = [
  { href: "#programme", label: "Programme" },
  { href: "#temoignages", label: "Témoignages" },
  { href: "#faq", label: "FAQ" },
];

export function PackStickyHeader({ title, priceLabel }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b border-primary-green/10 bg-background-beige/80 backdrop-blur-md transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <span className="hidden truncate font-serif text-sm font-semibold text-primary-green sm:block">
          {title}
        </span>
        <nav className="hidden items-center gap-6 text-sm text-primary-green/70 md:flex">
          {ANCHORS.map((a) => (
            <a key={a.href} href={a.href} className="hover:text-primary-green">
              {a.label}
            </a>
          ))}
        </nav>
        <a
          href="#tarif"
          className="inline-flex shrink-0 items-center rounded-md bg-primary-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-red-dark"
        >
          Rejoindre le pack — {priceLabel}
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add "src/app/(public)/accompagnements/_components/pack/pack-sticky-header.tsx"
git commit -m "feat(pack): header sticky + ancres au scroll"
```
Expected: aucune erreur.

---

## Task 4: Sections présentielles (`pack-sections.tsx`)

**Files:**
- Create: `src/app/(public)/accompagnements/_components/pack/pack-sections.tsx`

**Interfaces:**
- Consumes: `PACK_CONTENT` (Task 1), `ModuleCard`/`buildModuleCards` (Task 1), `ScrollReveal` (`@/components/public/scroll-reveal`), `PurchaseButton` (`../purchase-button`), `formatPrice` (`@/config/accompagnements`).
- Produces (tous des server components, sauf mention) :
  - `PackHero(props: { title: string; priceLabel: string })`
  - `PackProblem()`
  - `PackPromise()`
  - `PackModules(props: { modules: ModuleCard[] })`
  - `PackHowItWorks()`
  - `PackForWho()`
  - `PackInstructor(props: { name: string; bio: string | null; avatarUrl: string | null })`
  - `PackTestimonials()`
  - `PackPricing(props: { priceLabel: string; formationId: string; isLoggedIn: boolean; isEnrolled: boolean })`
  - `PackFinalCta()`

Note icônes : `PACK_CONTENT` ne référence pas de composant ; les icônes lucide utilisées dans les modules viennent de `MODULE_ACCENTS[].iconKey`. On résout `iconKey → composant` via une map locale.

- [ ] **Step 1: Implémenter `pack-sections.tsx`**

```tsx
import Image from "next/image";
import {
  CheckCircle,
  Sprout,
  Sunrise,
  CalendarHeart,
  Briefcase,
  UtensilsCrossed,
  Leaf,
  Moon,
  ShieldPlus,
  Quote,
  type LucideIcon,
} from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { formatPrice } from "@/config/accompagnements";
import { PurchaseButton } from "../purchase-button";
import { PACK_CONTENT } from "./pack-content";
import type { ModuleCard } from "./pack-modules-data";

const MODULE_ICONS: Record<string, LucideIcon> = {
  Sprout,
  Sunrise,
  CalendarHeart,
  Briefcase,
  UtensilsCrossed,
  Leaf,
  Moon,
  ShieldPlus,
};

const Section = ({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <section id={id} className={`px-4 py-16 sm:px-6 sm:py-20 ${className}`}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </section>
);

/* ---------------------------------------------------------------- Hero */
export function PackHero({
  title,
  priceLabel,
}: {
  title: string;
  priceLabel: string;
}) {
  const { eyebrow, subtitle, reassurances, ctaLabel } = PACK_CONTENT.hero;
  return (
    <section className="bg-primary-green px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-red" aria-hidden />
          <span className="font-sans text-xs font-medium uppercase tracking-widest text-white/90">
            {eyebrow}
          </span>
        </div>
        <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
          {subtitle}
        </p>
        <a
          href="#tarif"
          className="mt-8 inline-flex items-center rounded-md bg-primary-red px-8 py-3.5 text-base font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-primary-red-dark"
        >
          {ctaLabel} — {priceLabel}
        </a>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {reassurances.map((r) => (
            <li
              key={r}
              className="flex items-center gap-2 text-sm text-white/80"
            >
              <CheckCircle
                className="h-4 w-4 text-accent-sage"
                aria-hidden
              />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Problem */
export function PackProblem() {
  const { title, intro, points } = PACK_CONTENT.problem;
  return (
    <Section className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-primary-green/70">{intro}</p>
      </ScrollReveal>
      <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
        {points.map((p, i) => (
          <ScrollReveal key={p} delay={i * 60}>
            <div className="flex items-start gap-3 rounded-lg border border-primary-green/10 bg-white p-4">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-red"
                aria-hidden
              />
              <span className="text-sm text-primary-green/80">{p}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- Promise */
export function PackPromise() {
  const { title, paragraphs, bullets } = PACK_CONTENT.promise;
  return (
    <Section className="bg-accent-cream">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        {paragraphs.map((p) => (
          <p key={p} className="mt-4 text-lg text-primary-green/70">
            {p}
          </p>
        ))}
      </ScrollReveal>
      <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3">
        {bullets.map((b, i) => (
          <ScrollReveal key={b} delay={i * 60}>
            <div className="flex items-center gap-3">
              <CheckCircle
                className="h-5 w-5 shrink-0 text-primary-green"
                aria-hidden
              />
              <span className="text-primary-green/80">{b}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- Modules */
export function PackModules({ modules }: { modules: ModuleCard[] }) {
  const { title, subtitle } = PACK_CONTENT.modules;
  return (
    <Section id="programme" className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-primary-green/70">{subtitle}</p>
      </ScrollReveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m, i) => {
          const Icon = m.accent ? MODULE_ICONS[m.accent.iconKey] : null;
          return (
            <ScrollReveal key={m.id} delay={(i % 4) * 60}>
              <div className="flex h-full flex-col overflow-hidden rounded-lg border border-primary-green/10 bg-white">
                <div className="relative aspect-video overflow-hidden bg-background-beige-dark">
                  {m.thumbnail_url ? (
                    <Image
                      src={m.thumbnail_url}
                      alt={m.title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    />
                  ) : (
                    <div
                      className="flex h-full items-center justify-center"
                      style={
                        m.accent
                          ? {
                              backgroundImage: `linear-gradient(135deg, ${m.accent.from}, ${m.accent.to})`,
                            }
                          : undefined
                      }
                    >
                      {Icon && (
                        <Icon className="h-10 w-10 text-primary-green/70" aria-hidden />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 font-serif text-base font-semibold text-primary-green">
                    {m.title}
                  </h3>
                  {m.short_description && (
                    <p className="mt-2 line-clamp-3 text-sm text-primary-green/70">
                      {m.short_description}
                    </p>
                  )}
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------- How it works */
export function PackHowItWorks() {
  const { title, steps } = PACK_CONTENT.howItWorks;
  return (
    <Section className="bg-accent-cream">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
      </ScrollReveal>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <ScrollReveal key={s.title} delay={i * 80}>
            <div className="h-full rounded-lg border border-primary-green/10 bg-white p-6 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-green text-lg font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-serif text-lg font-semibold text-primary-green">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-primary-green/70">{s.text}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- For who */
export function PackForWho() {
  const { title, scenarios } = PACK_CONTENT.forWho;
  return (
    <Section className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
      </ScrollReveal>
      <div className="mx-auto mt-10 grid max-w-3xl gap-3">
        {scenarios.map((s, i) => (
          <ScrollReveal key={s} delay={i * 50}>
            <div className="flex items-start gap-3 rounded-lg border border-primary-green/10 bg-white p-4">
              <CheckCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-accent-sage"
                aria-hidden
              />
              <span className="text-primary-green/80">{s}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------- Instructor */
export function PackInstructor({
  name,
  bio,
  avatarUrl,
}: {
  name: string;
  bio: string | null;
  avatarUrl: string | null;
}) {
  const { title, credentials } = PACK_CONTENT.instructor;
  const displayBio = bio ?? PACK_CONTENT.instructor.fallbackBio;
  return (
    <Section className="bg-accent-cream">
      <ScrollReveal className="mx-auto max-w-3xl">
        <h2 className="text-center font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={112}
              height={112}
              className="h-28 w-28 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="h-28 w-28 shrink-0 rounded-full bg-primary-green/10" />
          )}
          <div>
            <p className="font-serif text-xl font-semibold text-primary-green">
              {name}
            </p>
            <p className="mt-2 text-primary-green/70">{displayBio}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {credentials.map((c) => (
                <li
                  key={c}
                  className="rounded-full bg-primary-green/10 px-3 py-1 text-xs font-medium text-primary-green"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ScrollReveal>
    </Section>
  );
}

/* -------------------------------------------------------- Testimonials */
export function PackTestimonials() {
  const { title, items } = PACK_CONTENT.testimonials;
  return (
    <Section id="temoignages" className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
      </ScrollReveal>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <ScrollReveal key={t.author} delay={i * 80}>
            <figure className="flex h-full flex-col rounded-lg border border-primary-green/10 bg-white p-6">
              <Quote className="h-6 w-6 text-primary-red/40" aria-hidden />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-primary-green/80">
                « {t.quote} »
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-2">
                <CheckCircle
                  className="h-4 w-4 text-accent-sage"
                  aria-hidden
                />
                <span className="text-sm font-medium text-primary-green">
                  {t.author}
                </span>
                <span className="text-xs text-primary-green/50">
                  · {t.detail}
                </span>
              </figcaption>
            </figure>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- Pricing */
export function PackPricing({
  priceLabel,
  formationId,
  isLoggedIn,
  isEnrolled,
}: {
  priceLabel: string;
  formationId: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
}) {
  const { title, subtitle, includes, guarantee } = PACK_CONTENT.pricing;
  return (
    <Section id="tarif" className="bg-accent-cream">
      <div className="mx-auto max-w-lg rounded-2xl border border-primary-green/10 bg-white p-8 shadow-md">
        <h2 className="text-center font-serif text-2xl font-bold text-primary-green sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-primary-green/70">
          {subtitle}
        </p>
        <p className="mt-6 text-center font-serif text-5xl font-bold text-primary-red">
          {priceLabel}
        </p>
        <ul className="mt-6 space-y-2">
          {includes.map((it) => (
            <li key={it} className="flex items-start gap-2 text-sm text-primary-green/80">
              <CheckCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-accent-sage"
                aria-hidden
              />
              {it}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <PurchaseButton
            formationId={formationId}
            isLoggedIn={isLoggedIn}
            isEnrolled={isEnrolled}
          />
        </div>
        <p className="mt-4 text-center text-xs text-primary-green/50">
          {guarantee}
        </p>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------- Final CTA */
export function PackFinalCta() {
  const { title, subtitle, ctaLabel } = PACK_CONTENT.finalCta;
  return (
    <section className="bg-primary-green px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-white/80">{subtitle}</p>
        <a
          href="#tarif"
          className="mt-8 inline-flex items-center rounded-md bg-primary-red px-8 py-3.5 text-base font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-primary-red-dark"
        >
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: aucune erreur. (Si `formatPrice` non utilisé ici, il n'est pas importé — l'import ci-dessus ne l'inclut pas ; le label prix est calculé dans l'orchestrateur en Task 5.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/accompagnements/_components/pack/pack-sections.tsx"
git commit -m "feat(pack): sections présentielles (hero → CTA final)"
```

---

## Task 5: Orchestrateur `PackSalesPage` + câblage de la route

**Files:**
- Create: `src/app/(public)/accompagnements/_components/pack/pack-sales-page.tsx`
- Modify: `src/app/(public)/accompagnements/[slug]/page.tsx`

**Interfaces:**
- Consumes : toutes les sections (Task 4), `PackFaq` (Task 2), `PackStickyHeader` (Task 3), `buildModuleCards`/`ModuleRow` (Task 1), `formatPrice`/`MODULE_ORDER`/`PACK_SLUG` (`@/config/accompagnements`).
- Produces : `export async function PackSalesPage(props: PackSalesPageProps)` où
  ```ts
  type PackSalesPageProps = {
    formation: {
      id: string;
      title: string;
      price_cents: number;
      currency: string;
      consultants: {
        bio: string | null;
        profiles: {
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
        } | null;
      } | null;
    };
    moduleRows: ModuleRow[];
    isLoggedIn: boolean;
    isEnrolled: boolean;
  };
  ```

- [ ] **Step 1: Implémenter `pack-sales-page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import {
  MODULE_ORDER,
  PACK_SLUG,
  formatPrice,
} from "@/config/accompagnements";
import { buildModuleCards, type ModuleRow } from "./pack-modules-data";
import { PACK_CONTENT } from "./pack-content";
import { PackFaq } from "./pack-faq";
import { PackStickyHeader } from "./pack-sticky-header";
import {
  PackHero,
  PackProblem,
  PackPromise,
  PackModules,
  PackHowItWorks,
  PackForWho,
  PackInstructor,
  PackTestimonials,
  PackPricing,
  PackFinalCta,
} from "./pack-sections";

type PackSalesPageProps = {
  formation: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    consultants: {
      bio: string | null;
      profiles: {
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      } | null;
    } | null;
  };
  moduleRows: ModuleRow[];
  isLoggedIn: boolean;
  isEnrolled: boolean;
};

/** Charge les formations-modules (hors pack) pour la grille « programme ». */
export async function fetchPackModuleRows(): Promise<ModuleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("formations")
    .select(
      "id, title, slug, short_description, thumbnail_url, price_cents, currency"
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .in("slug", MODULE_ORDER as unknown as string[]);
  return (data ?? []) as ModuleRow[];
}

export function PackSalesPage({
  formation,
  moduleRows,
  isLoggedIn,
  isEnrolled,
}: PackSalesPageProps) {
  const priceLabel = formatPrice(formation.price_cents, formation.currency);
  const modules = buildModuleCards(moduleRows).filter(
    (m) => m.slug !== PACK_SLUG
  );

  const profile = formation.consultants?.profiles;
  const instructorName =
    profile && (profile.first_name || profile.last_name)
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : PACK_CONTENT.instructor.fallbackName;

  return (
    <>
      <PackStickyHeader title={formation.title} priceLabel={priceLabel} />
      <PackHero title={formation.title} priceLabel={priceLabel} />
      <PackProblem />
      <PackPromise />
      <PackModules modules={modules} />
      <PackHowItWorks />
      <PackForWho />
      <PackInstructor
        name={instructorName}
        bio={formation.consultants?.bio ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <PackTestimonials />
      <PackPricing
        priceLabel={priceLabel}
        formationId={formation.id}
        isLoggedIn={isLoggedIn}
        isEnrolled={isEnrolled}
      />
      <section id="faq" className="bg-background-beige px-4 py-16 sm:px-6 sm:py-20">
        <PackFaq />
      </section>
      <PackFinalCta />
    </>
  );
}
```

- [ ] **Step 2: Câbler la branche dans `accompagnements/[slug]/page.tsx`**

Ajouter les imports en tête de fichier (après les imports existants) :

```tsx
import { PACK_SLUG } from "@/config/accompagnements";
import {
  PackSalesPage,
  fetchPackModuleRows,
} from "../_components/pack/pack-sales-page";
```

Puis, juste **après** le bloc `if (!formation) notFound();` et le calcul de `isEnrolled` (avant le calcul de `sections`/`consultant` de la fiche générique), insérer :

```tsx
  if (slug === PACK_SLUG) {
    const moduleRows = await fetchPackModuleRows();
    return (
      <PackSalesPage
        formation={{
          id: formation.id,
          title: formation.title,
          price_cents: formation.price_cents,
          currency: formation.currency,
          consultants: formation.consultants as PackSalesPageConsultant,
        }}
        moduleRows={moduleRows}
        isLoggedIn={!!currentUser}
        isEnrolled={isEnrolled}
      />
    );
  }
```

Et ajouter ce type d'appoint près du haut du fichier (sous les imports) pour caster proprement la relation Supabase :

```tsx
type PackSalesPageConsultant = {
  bio: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
} | null;
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: aucune erreur. Si `isEnrolled` est déclaré avec `let` après le fetch, s'assurer que la branche pack est placée **après** son calcul.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: build réussi, route `/accompagnements/[slug]` compilée sans erreur.

- [ ] **Step 5: Vérification visuelle**

Lancer `pnpm dev`, ouvrir `http://localhost:3000/accompagnements/pack-essentiel-allaitement`. Vérifier :
- Les 11 sections s'affichent dans l'ordre ; header sticky apparaît après scroll (~500px) ; ancres Programme/Témoignages/FAQ défilent aux bonnes sections ; CTA `#tarif` scrolle jusqu'au bloc prix.
- La grille « programme » affiche les modules réels (8 si tous publiés).
- Le bouton d'achat = `PurchaseButton` habituel (case renonciation + Stripe).
- Une **autre** page accompagnement (module individuel) rend toujours la fiche générique inchangée.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/accompagnements/_components/pack/pack-sales-page.tsx" \
        "src/app/(public)/accompagnements/[slug]/page.tsx"
git commit -m "feat(pack): orchestrateur PackSalesPage + branche route pack"
```

---

## Self-Review (rempli par l'auteur du plan)

**Spec coverage :**
- Approche special-case route → Task 5. ✅
- 11 sections → Task 4 (+ FAQ Task 2, wrapper FAQ dans Task 5). ✅
- Header sticky + ancres → Task 3. ✅
- Animations scroll (ScrollReveal réutilisé) → Task 4. ✅
- Modules réels DB → Task 1 (helper) + Task 5 (`fetchPackModuleRows`). ✅
- Paiement inchangé (`PurchaseButton`) → Task 4 `PackPricing`. ✅
- Charte existante, aucun token nouveau → contrainte respectée dans tout le JSX. ✅
- Contenu placeholder isolé → Task 1 `pack-content.ts`. ✅
- Hors périmètre (exit-intent, tracking, palette marron) → non planifié, conforme au spec. ✅

**Placeholder scan :** aucun « TBD/TODO » ; toute la copie est du contenu placeholder assumé (exigence du spec), pas un trou de plan.

**Type consistency :** `ModuleRow`/`ModuleCard`/`buildModuleCards` cohérents entre Task 1, 4, 5. Props `PurchaseButton` `{formationId, isLoggedIn, isEnrolled}` identiques au composant réel. `PackSalesPageProps.formation` ne demande que les champs réellement lus. `fetchPackModuleRows` sélectionne exactement les colonnes de `ModuleRow`.

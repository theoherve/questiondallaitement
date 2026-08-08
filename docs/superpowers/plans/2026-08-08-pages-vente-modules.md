# Pages de vente des 8 accompagnements-modules — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la fiche produit générique des 8 accompagnements de `MODULE_ORDER` par une page de vente long-form, alimentée par un template partagé et un fichier de contenu par module.

**Architecture:** Les primitives visuelles de la page de vente du pack sont extraites vers `_components/sales/` et rendues pilotables par props. Un orchestrateur `ModuleSalesPage` (server component) compose les sections à partir d'un `ModuleContent` sérialisable par slug, du contenu réel lu en base (chapitres, blocs, nouvelle colonne `sales_hook`) et du catalogue (prix du pack pour l'upsell, titres des 8 modules pour le maillage interne). Le pack est refactoré à iso-rendu et sa copy n'est pas touchée.

**Tech Stack:** Next.js 16 App Router (server components par défaut), TypeScript, Tailwind v4, lucide-react, Supabase (SQL migrations versionnées dans `supabase/migrations/`), zod v4, Vitest (`pnpm test`), pnpm.

**Spec :** `docs/superpowers/specs/2026-08-08-pages-vente-modules-design.md`

## Global Constraints

- **Langue : français.** Tout texte visible est en français.
- **Pas de tiret cadratin (`—`) dans un texte visible par un visiteur.** Règle de projet. Utiliser une virgule, un deux-points ou une phrase séparée. Les tirets cadratins sont autorisés dans les commentaires de code et la documentation.
- **Guillemets français `«  »`** dans les textes visiteur, avec espace insécable comme le fait déjà `pack-sections.tsx` (`« {t.quote} »`).
- **Aucun token de marque nouveau.** Palette existante uniquement : `primary-green`, `primary-red`, `primary-red-dark`, `primary-rose`, `background-beige`, `background-beige-dark`, `accent-cream`, `accent-sage`, `accent-peach`, `accent-honey`, et leurs déclinaisons déjà présentes dans `src/config/accompagnements.ts`.
- **Mobile-first.** Classes de base pour mobile, `sm:` / `lg:` pour élargir.
- **Aucun changement du tunnel de paiement.** `PurchaseButton` → server action `purchaseAccompagnement` → Stripe Checkout. Ne pas y toucher.
- **URL inchangées :** `/accompagnements/<slug>`.
- **Tables :** `accompagnements`, `accompagnement_sections`, `accompagnement_blocks`, `accompagnement_enrollments`. Pas `formations` (renommage effectué en migration 00071).
- **Tests :** Vitest, fichiers `*.spec.ts` co-localisés à côté du code testé. Lancer avec `pnpm test <chemin>`. Environnement `node` : ne pas écrire de test de rendu React, uniquement du calcul pur.
- **Commits :** un par tâche, message en français, préfixe conventionnel (`feat:`, `refactor:`, `test:`, `chore:`).
- **Toute chaîne de copy marquée `// PLACEHOLDER`** doit rester repérable par `grep -rn "PLACEHOLDER" src/`.

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/00079_accompagnement_section_sales_hook.sql` | colonne `sales_hook` |
| `src/app/(public)/accompagnements/_components/sales/section.tsx` | wrapper de section (padding, largeur, ancre) |
| `src/app/(public)/accompagnements/_components/sales/sales-faq.tsx` | accordéon FAQ piloté par props (client) |
| `src/app/(public)/accompagnements/_components/sales/sales-hero.tsx` | hero piloté par props |
| `src/app/(public)/accompagnements/_components/sales/sales-instructor.tsx` | bloc consultante |
| `src/app/(public)/accompagnements/_components/sales/sales-testimonials.tsx` | grille de témoignages |
| `src/app/(public)/accompagnements/_components/sales/sales-pricing.tsx` | carte tarif + CTA |
| `src/app/(public)/accompagnements/_components/sales/sales-side-cta.tsx` | carte flottante desktop (client) |
| `src/app/(public)/accompagnements/_components/module/module-program-data.ts` | calcul pur : chapitres, compteurs de blocs |
| `src/app/(public)/accompagnements/_components/module/module-program-data.spec.ts` | tests du calcul ci-dessus |
| `src/app/(public)/accompagnements/_components/module/pack-upsell-data.ts` | calcul pur : delta de prix pack |
| `src/app/(public)/accompagnements/_components/module/pack-upsell-data.spec.ts` | tests du calcul ci-dessus |
| `src/app/(public)/accompagnements/_components/module/module-program.tsx` | rendu du programme (client, dépliage) |
| `src/app/(public)/accompagnements/_components/module/module-sections.tsx` | sections propres au module |
| `src/app/(public)/accompagnements/_components/module/pack-upsell.tsx` | bloc upsell |
| `src/app/(public)/accompagnements/_components/module/module-sales-page.tsx` | orchestrateur + fetch catalogue |
| `src/app/(public)/accompagnements/_components/module/content/types.ts` | type `ModuleContent` |
| `src/app/(public)/accompagnements/_components/module/content/shared.ts` | défauts communs aux 8 modules |
| `src/app/(public)/accompagnements/_components/module/content/<slug>.ts` × 8 | copy par module |
| `src/app/(public)/accompagnements/_components/module/content/index.ts` | `MODULE_CONTENT` |

**Modifiés :**

| Fichier | Modification |
|---|---|
| `src/app/(public)/accompagnements/_components/pack/pack-sections.tsx` | consomme `sales/*` |
| `src/app/(public)/accompagnements/_components/pack/pack-faq.tsx` | supprimé, remplacé par `sales/sales-faq.tsx` |
| `src/app/(public)/accompagnements/_components/pack/pack-side-cta.tsx` | supprimé, remplacé par `sales/sales-side-cta.tsx` |
| `src/app/(public)/accompagnements/_components/pack/pack-sales-page.tsx` | imports mis à jour |
| `src/app/(public)/accompagnements/[slug]/page.tsx` | routage vers `ModuleSalesPage`, `sales_hook` dans la requête |
| `src/validations/accompagnements.ts` | `sales_hook` dans `sectionSchema` |
| `src/app/(dashboard)/admin/accompagnements/_components/section-editor.tsx` | champ accroche |
| `src/app/(dashboard)/admin/accompagnements/[id]/edit/page.tsx` | `sales_hook` dans la requête |

---

## Task 1: Extraire `Section` et la FAQ vers `sales/`

Premier pas du refactor du pack, à iso-rendu. Aucune classe CSS ne change.

**Files:**
- Create: `src/app/(public)/accompagnements/_components/sales/section.tsx`
- Create: `src/app/(public)/accompagnements/_components/sales/sales-faq.tsx`
- Modify: `src/app/(public)/accompagnements/_components/pack/pack-sections.tsx`
- Modify: `src/app/(public)/accompagnements/_components/pack/pack-sales-page.tsx`
- Delete: `src/app/(public)/accompagnements/_components/pack/pack-faq.tsx`

**Interfaces:**
- Produces: `Section({ id?, className?, children })`, `SalesFaq({ title, items })` où `items: { q: string; a: string }[]`.

- [ ] **Step 1: Créer le wrapper de section**

`src/app/(public)/accompagnements/_components/sales/section.tsx` :

```tsx
/**
 * Enveloppe commune des sections de page de vente (pack et modules).
 * Extrait de pack-sections.tsx sans modification : padding, largeur maximale
 * et `scroll-mt` pour que les ancres ne passent pas sous le header.
 */
export const Section = ({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <section id={id} className={`scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 ${className}`}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </section>
);
```

- [ ] **Step 2: Créer la FAQ pilotée par props**

`src/app/(public)/accompagnements/_components/sales/sales-faq.tsx` — copie conforme de `pack-faq.tsx`, à ceci près que `title` et `items` arrivent en props au lieu d'être lus dans `PACK_CONTENT` :

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FaqItem = { q: string; a: string };

export function SalesFaq({
  title,
  items,
}: {
  title: string;
  items: readonly FaqItem[];
}) {
  const [open, setOpen] = useState<number | null>(0);

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

- [ ] **Step 3: Brancher le pack sur les nouveaux composants**

Dans `pack-sections.tsx`, supprimer la déclaration locale de `Section` (lignes 34-46) et ajouter en tête :

```tsx
import { Section } from "../sales/section";
```

Dans `pack-sales-page.tsx`, remplacer `import { PackFaq } from "./pack-faq";` par :

```tsx
import { SalesFaq } from "../sales/sales-faq";
```

et dans le JSX, remplacer `<PackFaq />` par :

```tsx
<SalesFaq title={PACK_CONTENT.faq.title} items={PACK_CONTENT.faq.items} />
```

Supprimer le fichier `pack-faq.tsx`.

- [ ] **Step 4: Vérifier que rien n'est cassé**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

Run: `pnpm lint`
Expected: aucune erreur nouvelle.

Run: `pnpm dev` puis ouvrir `/accompagnements/pack-mon-allaitement-sur-mesure`
Expected: page identique à avant, FAQ dépliable, premier item ouvert par défaut.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(public\)/accompagnements/_components/sales src/app/\(public\)/accompagnements/_components/pack
git commit -m "refactor: extraire Section et la FAQ de la page pack vers sales/"
```

---

## Task 2: Extraire hero, consultante, témoignages, tarif et carte flottante

Suite du refactor, toujours à iso-rendu pour le pack. Ces cinq composants deviennent pilotables par props pour servir aussi les modules.

**Files:**
- Create: `src/app/(public)/accompagnements/_components/sales/sales-hero.tsx`
- Create: `src/app/(public)/accompagnements/_components/sales/sales-instructor.tsx`
- Create: `src/app/(public)/accompagnements/_components/sales/sales-testimonials.tsx`
- Create: `src/app/(public)/accompagnements/_components/sales/sales-pricing.tsx`
- Create: `src/app/(public)/accompagnements/_components/sales/sales-side-cta.tsx`
- Modify: `src/app/(public)/accompagnements/_components/pack/pack-sections.tsx`
- Modify: `src/app/(public)/accompagnements/_components/pack/pack-sales-page.tsx`
- Delete: `src/app/(public)/accompagnements/_components/pack/pack-side-cta.tsx`

**Interfaces:**
- Consumes: `Section` (Task 1).
- Produces: `SalesHero`, `SalesInstructor`, `SalesTestimonials`, `SalesPricing`, `SalesSideCta`, et les types `Testimonial`, `SideCtaAnchor` (signatures exactes ci-dessous).

- [ ] **Step 1: Créer le hero**

`sales/sales-hero.tsx`. Identique au `PackHero` actuel, avec deux ajouts : le contenu vient des props, et un `accent` optionnel pose un halo de couleur et un badge d'icône. Le fond reste `bg-primary-green` : les accents de `MODULE_ACCENTS` sont clairs, un texte blanc dessus serait illisible.

```tsx
import Image from "next/image";
import { CheckCircle, type LucideIcon } from "lucide-react";

export function SalesHero({
  productName,
  eyebrow,
  titleOverride,
  subtitle,
  reassurances,
  ctaLabel,
  priceLabel,
  imageUrl,
  accent,
  Icon,
}: {
  /** Nom produit en base ; affiché sous le H1 quand celui-ci porte la promesse. */
  productName: string;
  eyebrow: string;
  titleOverride: string | null;
  subtitle: string;
  reassurances: readonly string[];
  ctaLabel: string;
  priceLabel: string;
  imageUrl: string | null;
  /** Dégradé d'ambiance du module ; absent pour le pack. */
  accent?: { from: string; to: string };
  /** Icône du module affichée en badge ; absente pour le pack. */
  Icon?: LucideIcon;
}) {
  return (
    <section className="relative overflow-hidden bg-primary-green">
      {accent && (
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ backgroundImage: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
        />
      )}
      <div
        className={`relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 ${
          imageUrl ? "lg:pr-[calc(38%+2rem)]" : "text-center"
        }`}
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5">
          {Icon ? (
            <Icon className="h-3.5 w-3.5 text-accent-sage" aria-hidden />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-primary-red" aria-hidden />
          )}
          <span className="font-sans text-xs font-medium uppercase tracking-widest text-white/90">
            {eyebrow}
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          {titleOverride ?? productName}
        </h1>
        {titleOverride && (
          <p className="mt-4 font-sans text-sm font-medium uppercase tracking-widest text-background-beige/85">
            {productName}
          </p>
        )}
        <p
          className={`mt-6 max-w-2xl text-lg leading-relaxed text-white/90 ${
            imageUrl ? "" : "mx-auto"
          }`}
        >
          {subtitle}
        </p>
        <a
          href="#tarif"
          className="mt-8 inline-flex items-center rounded-md bg-primary-red px-8 py-3.5 text-base font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-primary-red-dark"
        >
          {ctaLabel}, {priceLabel}
        </a>
        <ul
          className={`mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 ${
            imageUrl ? "" : "justify-center"
          }`}
        >
          {reassurances.map((r) => (
            <li key={r} className="flex items-center gap-2 text-sm text-white/90">
              <CheckCircle className="h-4 w-4 text-accent-sage" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {imageUrl && (
        <div className="relative h-56 w-full sm:h-72 lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[38%]">
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 38vw, 100vw"
            className="object-contain p-6 lg:p-10"
          />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Créer le bloc consultante**

`sales/sales-instructor.tsx` — corps identique à `PackInstructor` (lignes 315-365 de `pack-sections.tsx`), avec `title`, `credentials` et `fallbackBio` en props :

```tsx
import Image from "next/image";
import { CheckCircle } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Section } from "./section";

export function SalesInstructor({
  title,
  name,
  bio,
  fallbackBio,
  avatarUrl,
  credentials,
}: {
  title: string;
  name: string;
  bio: string | null;
  fallbackBio: string;
  avatarUrl: string | null;
  credentials: readonly string[];
}) {
  const displayBio = bio ?? fallbackBio;
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
            <p className="font-serif text-xl font-semibold text-primary-green">{name}</p>
            <p className="mt-2 text-primary-green/70">{displayBio}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {credentials.map((c) => (
                <li
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-green/10 px-3 py-1 text-xs font-medium text-primary-green"
                >
                  <CheckCircle className="h-3 w-3 shrink-0 text-accent-sage" aria-hidden />
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
```

- [ ] **Step 3: Créer la grille de témoignages**

`sales/sales-testimonials.tsx` — corps identique à `PackTestimonials` (lignes 368-403), `title` et `items` en props :

```tsx
import { CheckCircle, Quote } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Section } from "./section";

export type Testimonial = { quote: string; author: string; detail: string };

export function SalesTestimonials({
  title,
  items,
}: {
  title: string;
  items: readonly Testimonial[];
}) {
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
                <CheckCircle className="h-4 w-4 text-accent-sage" aria-hidden />
                <span className="text-sm font-medium text-primary-green">{t.author}</span>
                <span className="text-xs text-primary-green/50">· {t.detail}</span>
              </figcaption>
            </figure>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 4: Créer la carte tarif**

`sales/sales-pricing.tsx` — corps identique à `PackPricing` (lignes 406-470). Le `ctaLabelFor(PACK_SLUG)` codé en dur devient un `ctaLabel` en props :

```tsx
import { CheckCircle, ShieldCheck } from "lucide-react";
import { PurchaseButton } from "../purchase-button";
import { Section } from "./section";

export function SalesPricing({
  title,
  subtitle,
  priceLabel,
  anchorLabel,
  includes,
  guarantee,
  ctaLabel,
  accompagnementId,
  isLoggedIn,
  isEnrolled,
  priceCents,
  currency,
}: {
  title: string;
  subtitle: string;
  priceLabel: string;
  /** Ancrage de valeur dérivé de la DB ; masqué si null. */
  anchorLabel: string | null;
  includes: readonly string[];
  guarantee: string;
  ctaLabel: string | undefined;
  accompagnementId: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  priceCents: number;
  currency: string;
}) {
  return (
    <Section id="tarif" className="bg-accent-cream">
      <div className="mx-auto max-w-lg rounded-2xl border border-primary-green/10 bg-white p-8 shadow-md">
        <h2 className="text-center font-serif text-2xl font-bold text-primary-green sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-primary-green/70">{subtitle}</p>
        <p className="mt-6 text-center font-serif text-5xl font-bold text-primary-red">
          {priceLabel}
        </p>
        {anchorLabel && (
          <p className="mt-2 text-center text-sm font-medium text-accent-sage">{anchorLabel}</p>
        )}
        <ul className="mt-6 space-y-2">
          {includes.map((it) => (
            <li key={it} className="flex items-start gap-2 text-sm text-primary-green/80">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-sage" aria-hidden />
              {it}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <PurchaseButton
            accompagnementId={accompagnementId}
            isLoggedIn={isLoggedIn}
            isEnrolled={isEnrolled}
            priceCents={priceCents}
            currency={currency}
            ctaLabel={ctaLabel}
          />
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm font-medium text-primary-green/80">
          <ShieldCheck className="h-4 w-4 shrink-0 text-accent-sage" aria-hidden />
          {guarantee}
        </p>
      </div>
    </Section>
  );
}
```

- [ ] **Step 5: Créer la carte flottante**

`sales/sales-side-cta.tsx` — copie de `pack-side-cta.tsx` avec trois changements : `ctaLabel` en props (au lieu de `ctaLabelFor(PACK_SLUG)`), `anchors` en props (au lieu de la constante `ANCHORS`), et `metaLabel` en props (au lieu de la composition « X sections · Y leçons », pour que les modules puissent afficher « 15 chapitres · 210 vidéos ») :

```tsx
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
  /** Ligne de contenu, déjà composée ; masquée si null. */
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
 * ou la section Tarif inline sert de CTA.
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
          <p className="font-serif text-2xl font-bold text-primary-red">{priceLabel}</p>
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
```

- [ ] **Step 6: Brancher le pack**

Dans `pack-sections.tsx` : supprimer les fonctions `PackHero`, `PackInstructor`, `PackTestimonials`, `PackPricing` et les imports devenus inutiles (`Image`, `Quote`, `ShieldCheck`, `PurchaseButton`, `ctaLabelFor`, `PACK_SLUG` s'ils ne servent plus). Garder `PackProblem`, `PackPromise`, `PackModules`, `PackHowItWorks`, `PackForWho`, `PackFinalCta` inchangés.

Dans `pack-sales-page.tsx`, importer les composants `sales/*` et remplacer les appels. Le hero :

```tsx
<SalesHero
  productName={accompagnement.title}
  eyebrow={PACK_CONTENT.hero.eyebrow}
  titleOverride={PACK_CONTENT.hero.titleOverride}
  subtitle={PACK_CONTENT.hero.subtitle}
  reassurances={PACK_CONTENT.hero.reassurances}
  ctaLabel={PACK_CONTENT.hero.ctaLabel}
  priceLabel={priceLabel}
  imageUrl={accompagnement.thumbnail_url}
/>
```

La consultante :

```tsx
<SalesInstructor
  title={PACK_CONTENT.instructor.title}
  name={instructorName}
  bio={accompagnement.consultants?.bio ?? null}
  fallbackBio={PACK_CONTENT.instructor.fallbackBio}
  avatarUrl={profile?.avatar_url ?? null}
  credentials={PACK_CONTENT.instructor.credentials}
/>
```

Les témoignages :

```tsx
<SalesTestimonials
  title={PACK_CONTENT.testimonials.title}
  items={PACK_CONTENT.testimonials.items}
/>
```

Le tarif :

```tsx
<SalesPricing
  title={PACK_CONTENT.pricing.title}
  subtitle={PACK_CONTENT.pricing.subtitle}
  priceLabel={priceLabel}
  anchorLabel={anchorLabel}
  includes={PACK_CONTENT.pricing.includes}
  guarantee={PACK_CONTENT.pricing.guarantee}
  ctaLabel={ctaLabelFor(PACK_SLUG)}
  accompagnementId={accompagnement.id}
  isLoggedIn={isLoggedIn}
  isEnrolled={isEnrolled}
  priceCents={accompagnement.price_cents}
  currency={accompagnement.currency}
/>
```

La carte flottante, avec la ligne de contenu composée sur place pour préserver le rendu actuel :

```tsx
const packMetaLabel =
  sectionsCount > 0 || lessonsCount > 0
    ? `${sectionsCount} section${sectionsCount > 1 ? "s" : ""}` +
      ` · ${lessonsCount} leçon${lessonsCount > 1 ? "s" : ""}`
    : null;
```

```tsx
<SalesSideCta
  ariaLabel="Rejoindre le pack"
  priceLabel={priceLabel}
  imageUrl={accompagnement.thumbnail_url}
  metaLabel={packMetaLabel}
  instructorName={instructorName}
  anchors={[
    { href: "#programme", label: "Programme" },
    { href: "#temoignages", label: "Témoignages" },
    { href: "#tarif", label: "Tarif" },
    { href: "#faq", label: "FAQ" },
  ]}
  ctaLabel={ctaLabelFor(PACK_SLUG)}
  accompagnementId={accompagnement.id}
  isLoggedIn={isLoggedIn}
  isEnrolled={isEnrolled}
  priceCents={accompagnement.price_cents}
  currency={accompagnement.currency}
/>
```

Supprimer `pack-side-cta.tsx`.

- [ ] **Step 7: Vérifier l'iso-rendu**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

Run: `pnpm test`
Expected: toute la suite passe (`pack-modules-data.spec.ts` inclus).

Run: `pnpm dev` puis `/accompagnements/pack-mon-allaitement-sur-mesure`
Expected: page visuellement identique à avant le refactor. Vérifier le hero, la carte flottante qui apparaît après 400 px de scroll, les 4 ancres, la carte tarif, la FAQ.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(public\)/accompagnements/_components
git commit -m "refactor: rendre hero, consultante, temoignages, tarif et carte flottante pilotables par props"
```

---

## Task 3: Colonne `sales_hook` et édition en back-office

**Files:**
- Create: `supabase/migrations/00079_accompagnement_section_sales_hook.sql`
- Modify: `src/validations/accompagnements.ts:19-22`
- Modify: `src/app/(dashboard)/admin/accompagnements/_components/section-editor.tsx`
- Modify: `src/app/(dashboard)/admin/accompagnements/[id]/edit/page.tsx`

**Interfaces:**
- Produces: colonne `accompagnement_sections.sales_hook text`, champ `sales_hook?: string` accepté par `sectionSchema` et donc par `createSection` / `updateSection`.

- [ ] **Step 1: Écrire la migration**

`supabase/migrations/00079_accompagnement_section_sales_hook.sql` :

```sql
-- Migration 00079: accroche commerciale par chapitre d'accompagnement
--
-- Les pages de vente des modules affichent le programme lu en base. Un titre
-- de chapitre dit ce qu'il contient, pas ce qu'il change pour la lectrice.
-- `sales_hook` porte cette phrase de benefice, editable en back-office.
--
-- Nullable et sans backfill : la page de vente n'affiche rien quand la colonne
-- est vide. Le choix d'une colonne plutot que d'un fichier de contenu indexe
-- sur le titre est deliberé : le contenu pedagogique va etre refait, et une
-- accroche indexee sur le titre disparaitrait au premier renommage.

ALTER TABLE accompagnement_sections
  ADD COLUMN sales_hook text;

COMMENT ON COLUMN accompagnement_sections.sales_hook IS
  'Phrase de benefice affichee sous le titre du chapitre sur la page de vente publique. Nullable.';
```

- [ ] **Step 2: Appliquer la migration**

Run: `pnpm exec supabase db push` (ou la commande de migration du projet, cf. les scripts `db:*` de `package.json`)
Expected: migration 00079 appliquée sans erreur.

Vérifier :

Run: `pnpm exec supabase db diff` ou une requête `select column_name from information_schema.columns where table_name = 'accompagnement_sections'`
Expected: `sales_hook` présent.

- [ ] **Step 3: Étendre le schéma de validation**

Dans `src/validations/accompagnements.ts`, remplacer `sectionSchema` :

```ts
export const sectionSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  position: z.number().int().min(0),
  /** Phrase de bénéfice affichée sous le titre sur la page de vente publique. */
  sales_hook: z.string().max(200, "Max 200 caractères").nullish(),
});
```

`nullish()` accepte `null` (effacer l'accroche) et `undefined` (ne pas la toucher).

- [ ] **Step 4: Charger la colonne dans l'écran d'édition**

Dans `src/app/(dashboard)/admin/accompagnements/[id]/edit/page.tsx`, ajouter `sales_hook` à la liste des colonnes sélectionnées pour `accompagnement_sections`. La requête sélectionne aujourd'hui `id, title, position` : ajouter `sales_hook`.

- [ ] **Step 5: Ajouter le champ dans l'éditeur de section**

Dans `section-editor.tsx` :

Ajouter `sales_hook: string | null;` au type `SectionData`.

Ajouter l'état, à côté de `editTitle` :

```tsx
const [editHook, setEditHook] = useState(section.sales_hook ?? "");
```

Remplacer `handleRenameSection` par une fonction qui enregistre titre et accroche ensemble :

```tsx
const handleSaveSection = async () => {
  const title = editTitle.trim();
  const hook = editHook.trim();
  if (!title) {
    setIsEditing(false);
    setEditTitle(section.title);
    setEditHook(section.sales_hook ?? "");
    return;
  }
  if (title === section.title && hook === (section.sales_hook ?? "")) {
    setIsEditing(false);
    return;
  }

  const result = await updateSection(section.id, accompagnementId, {
    title,
    position: section.position,
    sales_hook: hook === "" ? null : hook,
  });

  setIsEditing(false);
  if (result.success) {
    toast.success("Section enregistrée");
    router.refresh();
  } else {
    toast.error(result.error ?? "Erreur");
    setEditTitle(section.title);
    setEditHook(section.sales_hook ?? "");
  }
};
```

Remplacer les trois occurrences de `handleRenameSection` dans le JSX par `handleSaveSection`, et remplacer le bloc d'édition (le `<div className="flex items-center gap-2">` du mode `isEditing`) par une version à deux champs :

```tsx
<div
  className="flex flex-1 flex-col gap-2"
  onClick={(e) => e.stopPropagation()}
>
  <div className="flex items-center gap-2">
    <Input
      value={editTitle}
      onChange={(e) => setEditTitle(e.target.value)}
      className="h-8 w-60"
      autoFocus
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSaveSection();
        if (e.key === "Escape") {
          setIsEditing(false);
          setEditTitle(section.title);
          setEditHook(section.sales_hook ?? "");
        }
      }}
    />
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8"
      onClick={handleSaveSection}
      aria-label="Confirmer"
    >
      <Check className="h-4 w-4" />
    </Button>
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8"
      onClick={() => {
        setIsEditing(false);
        setEditTitle(section.title);
        setEditHook(section.sales_hook ?? "");
      }}
      aria-label="Annuler"
    >
      <X className="h-4 w-4" />
    </Button>
  </div>
  <Input
    value={editHook}
    onChange={(e) => setEditHook(e.target.value)}
    className="h-8 max-w-xl"
    maxLength={200}
    placeholder="Accroche page de vente, ex. : à la fin de ce chapitre, vous saurez reconnaître une bonne prise du sein"
    onKeyDown={(e) => {
      if (e.key === "Enter") handleSaveSection();
      if (e.key === "Escape") {
        setIsEditing(false);
        setEditTitle(section.title);
        setEditHook(section.sales_hook ?? "");
      }
    }}
  />
</div>
```

Enfin, dans le mode lecture (`CardTitle`), afficher l'accroche quand elle existe. Remplacer le bloc `<CardTitle>` par :

```tsx
<div className="flex flex-col gap-0.5">
  <CardTitle className="flex items-center gap-2 text-base">
    {isExpanded ? (
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    ) : (
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    )}
    {section.title}
    <span className="text-xs text-muted-foreground">
      ({blocks.length} bloc{blocks.length > 1 ? "s" : ""})
    </span>
  </CardTitle>
  {section.sales_hook && (
    <p className="pl-6 text-xs italic text-muted-foreground">
      {section.sales_hook}
    </p>
  )}
</div>
```

- [ ] **Step 6: Vérifier**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

Run: `pnpm dev`, aller sur `/admin/accompagnements/<id>/edit` d'un module, cliquer le crayon d'une section, saisir une accroche, valider.
Expected: toast « Section enregistrée », accroche affichée en italique sous le titre après refresh. Rouvrir l'édition, vider le champ, valider : l'accroche disparaît.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/00079_accompagnement_section_sales_hook.sql src/validations/accompagnements.ts src/app/\(dashboard\)/admin/accompagnements
git commit -m "feat: accroche commerciale editable par chapitre d'accompagnement"
```

---

## Task 4: Calcul du programme (chapitres et compteurs)

Calcul pur, testé. Aucun rendu.

**Files:**
- Create: `src/app/(public)/accompagnements/_components/module/module-program-data.ts`
- Test: `src/app/(public)/accompagnements/_components/module/module-program-data.spec.ts`

**Interfaces:**
- Produces: `type SectionRow`, `type BlockRow`, `type ProgramChapter`, `buildProgramChapters(rows)`, `buildProofItems(chapters)`, `formatChapterCounts(counts)`.

- [ ] **Step 1: Écrire les tests d'abord**

`module-program-data.spec.ts` :

```ts
import { describe, it, expect } from "vitest";
import {
  buildProgramChapters,
  buildProofItems,
  formatChapterCounts,
  type SectionRow,
} from "./module-program-data";

const section = (
  id: string,
  position: number,
  types: string[],
  salesHook: string | null = null
): SectionRow => ({
  id,
  title: `Chapitre ${id}`,
  position,
  sales_hook: salesHook,
  accompagnement_blocks: types.map((type, i) => ({ id: `${id}-${i}`, type })),
});

describe("buildProgramChapters", () => {
  it("trie les chapitres par position, pas par ordre d'arrivée", () => {
    const chapters = buildProgramChapters([
      section("b", 2, []),
      section("a", 1, []),
    ]);
    expect(chapters.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("compte les blocs par type", () => {
    const [chapter] = buildProgramChapters([
      section("a", 1, ["video", "video", "text", "download"]),
    ]);
    expect(chapter.counts).toEqual({
      video: 2,
      text: 1,
      download: 1,
      image: 0,
      quiz: 0,
    });
  });

  it("ignore un type de bloc inconnu au lieu de casser", () => {
    const [chapter] = buildProgramChapters([section("a", 1, ["video", "hologramme"])]);
    expect(chapter.counts.video).toBe(1);
  });

  it("expose l'accroche quand elle existe et null sinon", () => {
    const chapters = buildProgramChapters([
      section("a", 1, [], "Vous saurez reconnaître une bonne prise du sein."),
      section("b", 2, []),
    ]);
    expect(chapters[0].salesHook).toBe(
      "Vous saurez reconnaître une bonne prise du sein."
    );
    expect(chapters[1].salesHook).toBeNull();
  });

  it("tolère une section sans blocs", () => {
    const chapters = buildProgramChapters([
      { id: "a", title: "Vide", position: 1, sales_hook: null },
    ]);
    expect(chapters[0].counts.video).toBe(0);
  });

  it("renvoie un tableau vide quand il n'y a aucune section", () => {
    expect(buildProgramChapters([])).toEqual([]);
  });
});

describe("formatChapterCounts", () => {
  it("n'affiche que les types qui vendent, au pluriel correct", () => {
    const [chapter] = buildProgramChapters([
      section("a", 1, ["video", "video", "download", "quiz", "text", "image"]),
    ]);
    expect(formatChapterCounts(chapter.counts)).toEqual([
      "2 vidéos",
      "1 document",
      "1 quiz",
    ]);
  });

  it("renvoie un tableau vide quand le chapitre n'a que du texte", () => {
    const [chapter] = buildProgramChapters([section("a", 1, ["text", "image"])]);
    expect(formatChapterCounts(chapter.counts)).toEqual([]);
  });
});

describe("buildProofItems", () => {
  it("agrège les chapitres et les vidéos de tout le module", () => {
    const chapters = buildProgramChapters([
      section("a", 1, ["video", "video", "download"]),
      section("b", 2, ["video"]),
    ]);
    expect(buildProofItems(chapters)).toEqual([
      "2 chapitres",
      "3 vidéos",
      "1 document",
    ]);
  });

  it("accorde le singulier", () => {
    const chapters = buildProgramChapters([section("a", 1, ["video"])]);
    expect(buildProofItems(chapters)).toEqual(["1 chapitre", "1 vidéo"]);
  });

  it("renvoie un tableau vide sans chapitre", () => {
    expect(buildProofItems([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `pnpm test src/app/\(public\)/accompagnements/_components/module/module-program-data.spec.ts`
Expected: FAIL, « Failed to resolve import "./module-program-data" ».

- [ ] **Step 3: Écrire l'implémentation**

`module-program-data.ts` :

```ts
/**
 * Calcul du programme affiché sur une page de vente de module.
 *
 * Les chapitres et leurs blocs sont lus en base : quand le contenu pedagogique
 * est refait, la page de vente suit sans changement de code. Ce fichier ne fait
 * que du calcul pur, il est donc testable sans base ni rendu.
 */

/** Types de la colonne `accompagnement_blocks.type` (enum `block_type`). */
export const BLOCK_TYPES = ["text", "video", "image", "quiz", "download"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type BlockRow = { id: string; type: string };

export type SectionRow = {
  id: string;
  title: string;
  position: number;
  sales_hook: string | null;
  accompagnement_blocks?: BlockRow[];
};

export type BlockCounts = Record<BlockType, number>;

export type ProgramChapter = {
  id: string;
  title: string;
  salesHook: string | null;
  counts: BlockCounts;
};

const emptyCounts = (): BlockCounts => ({
  text: 0,
  video: 0,
  image: 0,
  quiz: 0,
  download: 0,
});

const isBlockType = (value: string): value is BlockType =>
  (BLOCK_TYPES as readonly string[]).includes(value);

/** Trie les chapitres par `position` et compte leurs blocs par type. */
export function buildProgramChapters(rows: SectionRow[]): ProgramChapter[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((row) => {
      const counts = emptyCounts();
      for (const block of row.accompagnement_blocks ?? []) {
        // Un type inconnu (enum elargie en base avant le deploiement du front)
        // est ignore plutot que de faire planter la page.
        if (isBlockType(block.type)) counts[block.type] += 1;
      }
      return {
        id: row.id,
        title: row.title,
        salesHook: row.sales_hook,
        counts,
      };
    });
}

const plural = (n: number, singular: string, pluralForm: string): string =>
  `${n} ${n > 1 ? pluralForm : singular}`;

/**
 * Badges d'un chapitre. `text` et `image` sont volontairement absents : ils
 * decrivent la mise en forme, pas une promesse de valeur.
 */
export function formatChapterCounts(counts: BlockCounts): string[] {
  const items: string[] = [];
  if (counts.video > 0) items.push(plural(counts.video, "vidéo", "vidéos"));
  if (counts.download > 0)
    items.push(plural(counts.download, "document", "documents"));
  if (counts.quiz > 0) items.push(`${counts.quiz} quiz`);
  return items;
}

/** Barre de preuve en haut de page : volumetrie agregee du module. */
export function buildProofItems(chapters: ProgramChapter[]): string[] {
  if (chapters.length === 0) return [];
  const total = chapters.reduce<BlockCounts>((acc, c) => {
    for (const type of BLOCK_TYPES) acc[type] += c.counts[type];
    return acc;
  }, emptyCounts());

  return [
    plural(chapters.length, "chapitre", "chapitres"),
    ...formatChapterCounts(total),
  ];
}
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test src/app/\(public\)/accompagnements/_components/module/module-program-data.spec.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(public\)/accompagnements/_components/module
git commit -m "feat: calcul du programme d'un module depuis la base"
```

---

## Task 5: Calcul de l'upsell pack

**Files:**
- Create: `src/app/(public)/accompagnements/_components/module/pack-upsell-data.ts`
- Test: `src/app/(public)/accompagnements/_components/module/pack-upsell-data.spec.ts`

**Interfaces:**
- Consumes: `formatPrice` de `@/config/accompagnements`.
- Produces: `type PackUpsell`, `computePackUpsell(args)`.

- [ ] **Step 1: Écrire les tests d'abord**

`pack-upsell-data.spec.ts` :

```ts
import { describe, it, expect } from "vitest";
import { computePackUpsell } from "./pack-upsell-data";

describe("computePackUpsell", () => {
  it("calcule le complément à payer et le nombre de modules restants", () => {
    const upsell = computePackUpsell({
      packPriceCents: 39700,
      packTitle: "Mon Allaitement Sur Mesure",
      modulePriceCents: 7500,
      currency: "EUR",
      totalModulesCount: 8,
    });
    expect(upsell?.deltaCents).toBe(32200);
    expect(upsell?.otherModulesCount).toBe(7);
    expect(upsell?.deltaLabel).toContain("322,00");
  });

  it("renvoie null quand le pack n'est pas publié", () => {
    expect(
      computePackUpsell({
        packPriceCents: null,
        packTitle: null,
        modulePriceCents: 7500,
        currency: "EUR",
        totalModulesCount: 8,
      })
    ).toBeNull();
  });

  it("renvoie null quand le pack ne coûte pas plus cher que le module", () => {
    expect(
      computePackUpsell({
        packPriceCents: 7500,
        packTitle: "Pack",
        modulePriceCents: 7500,
        currency: "EUR",
        totalModulesCount: 8,
      })
    ).toBeNull();
  });

  it("renvoie null quand le catalogue ne contient qu'un module", () => {
    expect(
      computePackUpsell({
        packPriceCents: 39700,
        packTitle: "Pack",
        modulePriceCents: 7500,
        currency: "EUR",
        totalModulesCount: 1,
      })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `pnpm test src/app/\(public\)/accompagnements/_components/module/pack-upsell-data.spec.ts`
Expected: FAIL, « Failed to resolve import "./pack-upsell-data" ».

- [ ] **Step 3: Écrire l'implémentation**

`pack-upsell-data.ts` :

```ts
import { formatPrice } from "@/config/accompagnements";

/**
 * Ancrage de valeur en bas d'une page de module : ce qu'il reste a payer pour
 * passer au pack complet. Meme logique que `savingsCents` cote pack, vue depuis
 * l'autre bout. Tout vient de la base, rien n'est ecrit en dur.
 */
export type PackUpsell = {
  deltaCents: number;
  /** Complément formaté, ex. « 322,00 € ». */
  deltaLabel: string;
  /** Nombre de modules que la cliente n'a pas encore, hors module courant. */
  otherModulesCount: number;
  packTitle: string;
};

export function computePackUpsell({
  packPriceCents,
  packTitle,
  modulePriceCents,
  currency,
  totalModulesCount,
}: {
  /** Null quand le pack n'est pas publié ou introuvable. */
  packPriceCents: number | null;
  packTitle: string | null;
  modulePriceCents: number;
  currency: string;
  /** Nombre de modules publiés du catalogue, module courant inclus. */
  totalModulesCount: number;
}): PackUpsell | null {
  if (packPriceCents === null || packTitle === null) return null;

  const deltaCents = packPriceCents - modulePriceCents;
  if (deltaCents <= 0) return null;

  const otherModulesCount = totalModulesCount - 1;
  if (otherModulesCount < 1) return null;

  return {
    deltaCents,
    deltaLabel: formatPrice(deltaCents, currency),
    otherModulesCount,
    packTitle,
  };
}
```

- [ ] **Step 4: Lancer les tests**

Run: `pnpm test src/app/\(public\)/accompagnements/_components/module/pack-upsell-data.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(public\)/accompagnements/_components/module
git commit -m "feat: calcul du complement pack sur une page de module"
```

---

## Task 6: Type de contenu et défauts partagés

**Files:**
- Create: `src/app/(public)/accompagnements/_components/module/content/types.ts`
- Create: `src/app/(public)/accompagnements/_components/module/content/shared.ts`

**Interfaces:**
- Consumes: `Testimonial` de `sales/sales-testimonials.tsx`, `FaqItem` de `sales/sales-faq.tsx`.
- Produces: `type ModuleContent`, `SHARED_CONTENT`.

- [ ] **Step 1: Écrire le type**

`content/types.ts` :

```ts
import type { Testimonial } from "../../sales/sales-testimonials";
import type { FaqItem } from "../../sales/sales-faq";

/**
 * Copie d'une page de vente de module. 100 % serialisable : aucun composant,
 * aucune fonction. Les chiffres (prix, chapitres, videos) viennent de la base,
 * jamais d'ici.
 *
 * Les sections optionnelles absentes ne sont pas rendues. C'est ce qui permet
 * a « les-urgences-allaitement » d'avoir un parcours court sans branche `if`
 * dans l'orchestrateur.
 */
export type ModuleContent = {
  hero: {
    /** Ligne de credibilite au-dessus du titre. */
    eyebrow: string;
    /** Promesse portee par le H1 ; le nom produit reste affiche en dessous. */
    titleOverride: string;
    subtitle: string;
    ctaLabel: string;
  };
  problem?: {
    title: string;
    intro: string;
    points: string[];
  };
  promise?: {
    title: string;
    paragraphs: string[];
    bullets: string[];
  };
  program: {
    title: string;
    intro: string;
  };
  outcomes: {
    title: string;
    items: string[];
  };
  fit: {
    title: string;
    forYouTitle: string;
    forYou: string[];
    notForYouTitle: string;
    notForYou: string[];
  };
  moment: {
    title: string;
    intro: string;
  };
  testimonials?: {
    title: string;
    items: Testimonial[];
  };
  pricing: {
    title: string;
    subtitle: string;
  };
  /** Questions propres au module ; les communes viennent de SHARED_CONTENT. */
  faq: FaqItem[];
  finalCta: {
    title: string;
    subtitle: string;
    ctaLabel: string;
  };
};
```

- [ ] **Step 2: Écrire les défauts partagés**

`content/shared.ts`. Repris de `pack-content.ts` et adapté au singulier « ce module ».

```ts
import type { FaqItem } from "../../sales/sales-faq";

/**
 * Ce qui ne varie pas d'un module a l'autre. Les 8 fichiers de contenu ne
 * portent que le specifique.
 */
export const SHARED_CONTENT = {
  reassurances: [
    "Accès immédiat après paiement",
    "Accès illimité, à vie",
    "Par une consultante IBCLC",
  ],
  howItWorks: {
    title: "Comment se déroule l'accompagnement",
    steps: [
      {
        title: "Vous rejoignez le module",
        text: "Paiement sécurisé (1×, 3× ou 4× sans frais), accès immédiat à l'ensemble du contenu.",
      },
      {
        title: "Vous avancez à votre rythme",
        text: "Le module reste accessible à vie : vous y revenez selon votre besoin du moment, sans calendrier imposé.",
      },
      {
        title: "Vous appliquez, sereinement",
        text: "Des contenus courts, concrets, fondés sur les preuves, pensés pour être consultés entre deux tétées.",
      },
    ],
  },
  instructor: {
    title: "Pourquoi faire confiance à Carole",
    fallbackName: "Votre consultante IBCLC",
    fallbackBio:
      "Consultante en lactation certifiée IBCLC depuis 2011, j'ai accompagné plus de 5 000 familles et j'aide aujourd'hui plus de 1 000 mères chaque année, avec une équipe de 7 consultantes IBCLC. Ce module, c'est la synthèse de plus de dix ans de consultations individuelles, condensée pour être accessible à toute heure, même quand mon agenda de consultation est complet.",
    credentials: [
      "IBCLC depuis 2011",
      "5 000+ familles accompagnées",
      "1 000+ mères accompagnées chaque année",
      "Une équipe de 7 consultantes IBCLC",
      "Autrice de 3 livres sur l'allaitement",
      "Formatrice & conférencière internationale",
    ],
  },
  pricing: {
    includes: [
      "L'intégralité du module",
      "Accès immédiat et illimité, à vie",
      "Mises à jour incluses",
      "Paiement en 1×, 3× ou 4× sans frais",
    ],
    // PLACEHOLDER JURIDIQUE — formulation reprise du pack sur decision explicite.
    // La mention de retractation avait ete retiree du tunnel d'achat (contenu
    // numerique a acces immediat) : cette promesse rouvre le risque de
    // remboursement, desormais sur 9 pages. A faire valider avant mise en ligne.
    guarantee: "Satisfait ou remboursé sous 14 jours.",
  },
  faq: {
    title: "Questions fréquentes",
    /** Questions communes, ajoutées après les questions propres au module. */
    common: [
      {
        q: "Quand ai-je accès au contenu ?",
        a: "Immédiatement après votre paiement. Vous recevez vos accès et pouvez commencer tout de suite.",
      },
      {
        q: "Pendant combien de temps ai-je accès ?",
        a: "À vie. Vous revenez sur le module autant de fois que vous le souhaitez, à votre rythme.",
      },
      {
        q: "Est-ce que ça remplace une consultation individuelle ?",
        a: "Non. Le module couvre la grande majorité des situations avec des contenus clairs et fondés sur les preuves. Pour une situation spécifique, une consultation individuelle reste disponible en complément.",
      },
      {
        q: "Puis-je payer en plusieurs fois ?",
        a: "Oui, le paiement en 3× ou 4× sans frais est proposé au moment du règlement.",
      },
      {
        q: "Le contenu est-il fiable ?",
        a: "Oui. Tous les contenus sont conçus par une consultante en lactation IBCLC, selon une approche fondée sur les preuves.",
      },
    ] satisfies FaqItem[],
  },
  moment: {
    /** Titres de secours si un module du catalogue n'est pas publié. */
    currentBadge: "Vous êtes ici",
  },
} as const;
```

- [ ] **Step 3: Vérifier**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/accompagnements/_components/module/content
git commit -m "feat: type de contenu et defauts partages des pages de module"
```

---

## Task 7: Composant programme

**Files:**
- Create: `src/app/(public)/accompagnements/_components/module/module-program.tsx`

**Interfaces:**
- Consumes: `ProgramChapter` et `formatChapterCounts` (Task 4), `Section` (Task 1).
- Produces: `ModuleProgram({ title, intro, chapters })`.

- [ ] **Step 1: Écrire le composant**

Client, parce qu'il déplie. Au-delà de 8 chapitres, seuls les 6 premiers sont visibles.

```tsx
"use client";

import { useState } from "react";
import { FileText, HelpCircle, Video } from "lucide-react";
import { Section } from "../sales/section";
import {
  formatChapterCounts,
  type ProgramChapter,
} from "./module-program-data";

const BADGE_ICONS = [
  { key: "video" as const, Icon: Video },
  { key: "download" as const, Icon: FileText },
  { key: "quiz" as const, Icon: HelpCircle },
];

/** Au-dela de ce nombre de chapitres, la liste est repliee. */
const COLLAPSE_THRESHOLD = 8;
const VISIBLE_WHEN_COLLAPSED = 6;

export function ModuleProgram({
  title,
  intro,
  chapters,
}: {
  title: string;
  intro: string;
  chapters: ProgramChapter[];
}) {
  const collapsible = chapters.length > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);
  const visible =
    collapsible && !expanded ? chapters.slice(0, VISIBLE_WHEN_COLLAPSED) : chapters;
  const hiddenCount = chapters.length - visible.length;

  return (
    <Section id="programme" className="bg-background-beige">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-primary-green/70">{intro}</p>
      </div>

      <ol className="mx-auto mt-10 max-w-3xl space-y-3">
        {visible.map((chapter, i) => {
          const badges = formatChapterCounts(chapter.counts);
          return (
            <li
              key={chapter.id}
              className="flex gap-4 rounded-lg border border-primary-green/10 bg-white p-5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-green/10 text-sm font-semibold text-primary-green">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-base font-semibold text-primary-green">
                  {chapter.title}
                </h3>
                {chapter.salesHook && (
                  <p className="mt-1 text-sm text-primary-green/70">
                    {chapter.salesHook}
                  </p>
                )}
                {badges.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-3">
                    {BADGE_ICONS.map(({ key, Icon }) =>
                      chapter.counts[key] > 0 ? (
                        <li
                          key={key}
                          className="inline-flex items-center gap-1.5 text-xs text-primary-green/60"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {formatChapterCounts({
                            ...chapter.counts,
                            video: key === "video" ? chapter.counts.video : 0,
                            download: key === "download" ? chapter.counts.download : 0,
                            quiz: key === "quiz" ? chapter.counts.quiz : 0,
                          })[0]}
                        </li>
                      ) : null
                    )}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {collapsible && !expanded && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-md border border-primary-green/20 px-6 py-2.5 text-sm font-medium text-primary-green transition-colors hover:bg-primary-green/5"
          >
            Voir les {hiddenCount} chapitres suivants
          </button>
        </div>
      )}
    </Section>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/accompagnements/_components/module/module-program.tsx
git commit -m "feat: section programme d'une page de module"
```

---

## Task 8: Sections propres au module

Barre de preuve, problème, promesse, ce qui devient possible, dis-qualification, timeline, comment ça marche, CTA final.

**Files:**
- Create: `src/app/(public)/accompagnements/_components/module/module-sections.tsx`

**Interfaces:**
- Consumes: `Section` (Task 1), `ModuleContent` et `SHARED_CONTENT` (Task 6), `MODULE_ORDER` et `MODULE_ACCENTS` de `@/config/accompagnements`.
- Produces: `ModuleProofBar`, `ModuleProblem`, `ModulePromise`, `ModuleOutcomes`, `ModuleFit`, `ModuleMoment`, `ModuleHowItWorks`, `ModuleFinalCta`, et le type `MomentEntry`.

- [ ] **Step 1: Écrire le fichier**

```tsx
import Link from "next/link";
import { CheckCircle, MinusCircle } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Section } from "../sales/section";
import { SHARED_CONTENT } from "./content/shared";
import type { ModuleContent } from "./content/types";

/* ---------------------------------------------------------- Barre de preuve */
export function ModuleProofBar({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border-b border-primary-green/10 bg-white">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-4 sm:px-6">
        {[...items, "Accès à vie"].map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-sm font-medium text-primary-green/80"
          >
            <CheckCircle className="h-4 w-4 shrink-0 text-accent-sage" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- Le problème */
export function ModuleProblem({ content }: { content: ModuleContent["problem"] }) {
  if (!content) return null;
  const { title, intro, points } = content;
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
          <ScrollReveal key={p} delay={i * 60} className="h-full">
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-primary-green/10 bg-white p-5 text-center">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary-red" aria-hidden />
              <span className="text-sm text-primary-green/80">{p}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- La promesse */
export function ModulePromise({ content }: { content: ModuleContent["promise"] }) {
  if (!content) return null;
  const { title, paragraphs, bullets } = content;
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
              <CheckCircle className="h-5 w-5 shrink-0 text-primary-green" aria-hidden />
              <span className="text-primary-green/80">{b}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------- Ce qui devient possible */
export function ModuleOutcomes({ content }: { content: ModuleContent["outcomes"] }) {
  return (
    <Section className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {content.title}
        </h2>
      </ScrollReveal>
      <div className="mx-auto mt-10 grid max-w-3xl gap-3">
        {content.items.map((s, i) => (
          <ScrollReveal key={s} delay={i * 50}>
            <div className="flex items-start gap-3 rounded-lg border border-primary-green/10 bg-white p-4">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent-sage" aria-hidden />
              <span className="text-primary-green/80">{s}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------------------------------- Pour vous / pas pour vous */
export function ModuleFit({ content }: { content: ModuleContent["fit"] }) {
  return (
    <Section className="bg-accent-cream">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {content.title}
        </h2>
      </ScrollReveal>
      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <ScrollReveal>
          <div className="h-full rounded-lg border border-accent-sage/40 bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-primary-green">
              {content.forYouTitle}
            </h3>
            <ul className="mt-4 space-y-3">
              {content.forYou.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-primary-green/80">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-sage" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <div className="h-full rounded-lg border border-primary-green/10 bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-primary-green">
              {content.notForYouTitle}
            </h3>
            <ul className="mt-4 space-y-3">
              {content.notForYou.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-primary-green/70">
                  <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-green/30" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- À quel moment */
export type MomentEntry = { slug: string; title: string; isCurrent: boolean };

export function ModuleMoment({
  content,
  entries,
}: {
  content: ModuleContent["moment"];
  entries: MomentEntry[];
}) {
  if (entries.length < 2) return null;
  return (
    <Section className="bg-background-beige">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {content.title}
        </h2>
        <p className="mt-4 text-lg text-primary-green/70">{content.intro}</p>
      </ScrollReveal>
      <ol className="mx-auto mt-10 max-w-3xl border-l-2 border-primary-green/15 pl-6">
        {entries.map((entry) => (
          <li key={entry.slug} className="relative py-3">
            <span
              className={`absolute -left-[1.9rem] top-5 h-3 w-3 rounded-full border-2 border-background-beige ${
                entry.isCurrent ? "bg-primary-red" : "bg-primary-green/25"
              }`}
              aria-hidden
            />
            {entry.isCurrent ? (
              <p className="font-serif text-base font-semibold text-primary-green">
                {entry.title}
                <span className="ml-3 rounded-full bg-primary-red/10 px-2.5 py-0.5 align-middle text-xs font-medium text-primary-red">
                  {SHARED_CONTENT.moment.currentBadge}
                </span>
              </p>
            ) : (
              <Link
                href={`/accompagnements/${entry.slug}`}
                className="text-base text-primary-green/70 transition-colors hover:text-primary-green hover:underline"
              >
                {entry.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* --------------------------------------------------------- Comment ça marche */
export function ModuleHowItWorks() {
  const { title, steps } = SHARED_CONTENT.howItWorks;
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

/* ----------------------------------------------------------------- CTA final */
export function ModuleFinalCta({ content }: { content: ModuleContent["finalCta"] }) {
  return (
    <section className="bg-primary-rose px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">
          {content.title}
        </h2>
        <p className="mt-4 text-lg text-white/90">{content.subtitle}</p>
        {/* CTA en blanc : sur l'aplat rose, primary-red serait illisible. */}
        <a
          href="#tarif"
          className="mt-8 inline-flex items-center rounded-md bg-white px-8 py-3.5 text-base font-medium text-primary-rose shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-background-beige"
        >
          {content.ctaLabel}
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/accompagnements/_components/module/module-sections.tsx
git commit -m "feat: sections propres aux pages de module"
```

---

## Task 9: Bloc upsell pack

**Files:**
- Create: `src/app/(public)/accompagnements/_components/module/pack-upsell.tsx`

**Interfaces:**
- Consumes: `PackUpsell` (Task 5), `Section` (Task 1), `PACK_SLUG` de `@/config/accompagnements`.
- Produces: `PackUpsellSection({ upsell })`.

- [ ] **Step 1: Écrire le composant**

```tsx
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { PACK_SLUG } from "@/config/accompagnements";
import { Section } from "../sales/section";
import type { PackUpsell } from "./pack-upsell-data";

/**
 * Ancrage de valeur en bas d'une page de module. Tous les chiffres sont
 * derives de la base (`computePackUpsell`), rien n'est ecrit en dur.
 */
export function PackUpsellSection({ upsell }: { upsell: PackUpsell | null }) {
  if (!upsell) return null;
  return (
    <Section className="bg-primary-green">
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <Layers className="mx-auto h-8 w-8 text-accent-sage" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl font-bold text-white sm:text-3xl">
          Ce module fait partie du pack « {upsell.packTitle} »
        </h2>
        <p className="mt-4 text-lg text-white/85">
          Les {upsell.otherModulesCount} autres accompagnements, de la
          préparation au sevrage, pour {upsell.deltaLabel} de plus.
        </p>
        <Link
          href={`/accompagnements/${PACK_SLUG}`}
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-8 py-3.5 text-base font-medium text-primary-green shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-background-beige"
        >
          Découvrir le pack complet
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </ScrollReveal>
    </Section>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/accompagnements/_components/module/pack-upsell.tsx
git commit -m "feat: bloc upsell pack sur les pages de module"
```

---

## Task 10: Orchestrateur et routage

À la fin de cette tâche les 8 pages sont branchées. Elles ne s'afficheront qu'une fois leur fichier de contenu écrit (tâches 11 à 18), d'où le repli sur la fiche générique quand le contenu manque.

**Files:**
- Create: `src/app/(public)/accompagnements/_components/module/module-sales-page.tsx`
- Create: `src/app/(public)/accompagnements/_components/module/content/index.ts`
- Modify: `src/app/(public)/accompagnements/[slug]/page.tsx:90-99` (requête) et `:154-343` (routage)

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: `ModuleSalesPage(props)`, `MODULE_CONTENT: Partial<Record<string, ModuleContent>>`.

- [ ] **Step 1: Créer l'index de contenu, vide pour l'instant**

`content/index.ts` :

```ts
import type { ModuleContent } from "./types";

/**
 * Copie des pages de vente, par slug. `Partial` volontairement : un module sans
 * fichier de contenu retombe sur la fiche produit generique plutot que de
 * casser la page.
 */
export const MODULE_CONTENT: Partial<Record<string, ModuleContent>> = {};
```

- [ ] **Step 2: Écrire l'orchestrateur**

`module-sales-page.tsx` :

```tsx
import {
  Sprout,
  Sunrise,
  CalendarHeart,
  Briefcase,
  UtensilsCrossed,
  Leaf,
  Moon,
  ShieldPlus,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  MODULE_ACCENTS,
  MODULE_ORDER,
  PACK_SLUG,
  formatPrice,
  sortByModuleOrder,
} from "@/config/accompagnements";
import { ctaLabelFor } from "@/config/accompagnement-cta";
import { SalesHero } from "../sales/sales-hero";
import { SalesInstructor } from "../sales/sales-instructor";
import { SalesTestimonials } from "../sales/sales-testimonials";
import { SalesPricing } from "../sales/sales-pricing";
import { SalesFaq, type FaqItem } from "../sales/sales-faq";
import { SalesSideCta, type SideCtaAnchor } from "../sales/sales-side-cta";
import { Section } from "../sales/section";
import {
  ModuleProofBar,
  ModuleProblem,
  ModulePromise,
  ModuleOutcomes,
  ModuleFit,
  ModuleMoment,
  ModuleHowItWorks,
  ModuleFinalCta,
  type MomentEntry,
} from "./module-sections";
import { ModuleProgram } from "./module-program";
import { PackUpsellSection } from "./pack-upsell";
import {
  buildProgramChapters,
  buildProofItems,
  type SectionRow,
} from "./module-program-data";
import { computePackUpsell } from "./pack-upsell-data";
import { MODULE_CONTENT } from "./content";
import { SHARED_CONTENT } from "./content/shared";

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

type CatalogRow = {
  slug: string;
  title: string;
  price_cents: number;
};

/**
 * Catalogue necessaire a une page de module : les 8 modules pour la timeline,
 * le pack pour l'upsell. Une seule requete.
 */
export async function fetchCatalogRows(): Promise<CatalogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accompagnements")
    .select("slug, title, price_cents")
    .eq("status", "published")
    .is("deleted_at", null)
    .in("slug", [...MODULE_ORDER, PACK_SLUG]);
  return (data ?? []) as CatalogRow[];
}

/** Vrai quand le slug a une page de vente dediee prete a etre servie. */
export const hasModuleSalesPage = (slug: string): boolean =>
  MODULE_CONTENT[slug] !== undefined;

type ModuleSalesPageProps = {
  accompagnement: {
    id: string;
    slug: string;
    title: string;
    price_cents: number;
    currency: string;
    thumbnail_url: string | null;
    consultants: {
      bio: string | null;
      profiles: {
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      } | null;
    } | null;
  };
  sectionRows: SectionRow[];
  catalogRows: CatalogRow[];
  isLoggedIn: boolean;
  isEnrolled: boolean;
};

export function ModuleSalesPage({
  accompagnement,
  sectionRows,
  catalogRows,
  isLoggedIn,
  isEnrolled,
}: ModuleSalesPageProps) {
  const content = MODULE_CONTENT[accompagnement.slug];
  // Garde-fou : la page appelante verifie deja `hasModuleSalesPage`.
  if (!content) return null;

  const priceLabel = formatPrice(
    accompagnement.price_cents,
    accompagnement.currency
  );
  const chapters = buildProgramChapters(sectionRows);
  const proofItems = buildProofItems(chapters);

  const moduleRows = sortByModuleOrder(
    catalogRows.filter((row) => row.slug !== PACK_SLUG)
  );
  const packRow = catalogRows.find((row) => row.slug === PACK_SLUG) ?? null;

  const upsell = computePackUpsell({
    packPriceCents: packRow?.price_cents ?? null,
    packTitle: packRow?.title ?? null,
    modulePriceCents: accompagnement.price_cents,
    currency: accompagnement.currency,
    totalModulesCount: moduleRows.length,
  });

  const momentEntries: MomentEntry[] = moduleRows.map((row) => ({
    slug: row.slug,
    title: row.title,
    isCurrent: row.slug === accompagnement.slug,
  }));

  const profile = accompagnement.consultants?.profiles;
  const instructorName =
    profile && (profile.first_name || profile.last_name)
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : SHARED_CONTENT.instructor.fallbackName;

  const accent = MODULE_ACCENTS[accompagnement.slug];
  const Icon = accent ? MODULE_ICONS[accent.iconKey] : undefined;
  const ctaLabel = ctaLabelFor(accompagnement.slug);

  const faqItems: FaqItem[] = [...content.faq, ...SHARED_CONTENT.faq.common];

  const anchors: SideCtaAnchor[] = [
    ...(chapters.length > 0
      ? [{ href: "#programme", label: "Programme" }]
      : []),
    ...(content.testimonials
      ? [{ href: "#temoignages", label: "Témoignages" }]
      : []),
    { href: "#tarif", label: "Tarif" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <>
      <SalesSideCta
        ariaLabel={`Rejoindre ${accompagnement.title}`}
        priceLabel={priceLabel}
        imageUrl={accompagnement.thumbnail_url}
        metaLabel={proofItems.length > 0 ? proofItems.join(" · ") : null}
        instructorName={instructorName}
        anchors={anchors}
        ctaLabel={ctaLabel}
        accompagnementId={accompagnement.id}
        isLoggedIn={isLoggedIn}
        isEnrolled={isEnrolled}
        priceCents={accompagnement.price_cents}
        currency={accompagnement.currency}
      />
      <SalesHero
        productName={accompagnement.title}
        eyebrow={content.hero.eyebrow}
        titleOverride={content.hero.titleOverride}
        subtitle={content.hero.subtitle}
        reassurances={SHARED_CONTENT.reassurances}
        ctaLabel={content.hero.ctaLabel}
        priceLabel={priceLabel}
        imageUrl={accompagnement.thumbnail_url}
        accent={accent ? { from: accent.from, to: accent.to } : undefined}
        Icon={Icon}
      />
      <ModuleProofBar items={proofItems} />
      <ModuleProblem content={content.problem} />
      <ModulePromise content={content.promise} />
      {chapters.length > 0 && (
        <ModuleProgram
          title={content.program.title}
          intro={content.program.intro}
          chapters={chapters}
        />
      )}
      <ModuleOutcomes content={content.outcomes} />
      <ModuleFit content={content.fit} />
      <ModuleMoment content={content.moment} entries={momentEntries} />
      <ModuleHowItWorks />
      <SalesInstructor
        title={SHARED_CONTENT.instructor.title}
        name={instructorName}
        bio={accompagnement.consultants?.bio ?? null}
        fallbackBio={SHARED_CONTENT.instructor.fallbackBio}
        avatarUrl={profile?.avatar_url ?? null}
        credentials={SHARED_CONTENT.instructor.credentials}
      />
      {content.testimonials && (
        <SalesTestimonials
          title={content.testimonials.title}
          items={content.testimonials.items}
        />
      )}
      <SalesPricing
        title={content.pricing.title}
        subtitle={content.pricing.subtitle}
        priceLabel={priceLabel}
        anchorLabel={null}
        includes={SHARED_CONTENT.pricing.includes}
        guarantee={SHARED_CONTENT.pricing.guarantee}
        ctaLabel={ctaLabel}
        accompagnementId={accompagnement.id}
        isLoggedIn={isLoggedIn}
        isEnrolled={isEnrolled}
        priceCents={accompagnement.price_cents}
        currency={accompagnement.currency}
      />
      <PackUpsellSection upsell={upsell} />
      <Section
        id="faq"
        className="bg-background-beige"
      >
        <SalesFaq title={SHARED_CONTENT.faq.title} items={faqItems} />
      </Section>
      <ModuleFinalCta content={content.finalCta} />
    </>
  );
}
```

- [ ] **Step 3: Charger `sales_hook` dans la requête de la page**

Dans `src/app/(public)/accompagnements/[slug]/page.tsx`, le bloc `accompagnement_sections` de la requête (lignes 90-99) devient :

```
      accompagnement_sections (
        id,
        title,
        position,
        sales_hook,
        accompagnement_blocks (
          id,
          type,
          position
        )
      )
```

- [ ] **Step 4: Brancher le routage**

Dans le même fichier, juste après le bloc `if (slug === PACK_SLUG) { ... }` (qui reste inchangé), insérer :

```tsx
  if (hasModuleSalesPage(slug)) {
    const catalogRows = await fetchCatalogRows();
    return (
      <ModuleSalesPage
        accompagnement={{
          id: accompagnement.id,
          slug: accompagnement.slug,
          title: accompagnement.title,
          price_cents: accompagnement.price_cents,
          currency: accompagnement.currency,
          thumbnail_url: accompagnement.thumbnail_url,
          consultants: accompagnement.consultants as PackSalesPageConsultant,
        }}
        sectionRows={(accompagnement.accompagnement_sections ?? []) as SectionRow[]}
        catalogRows={catalogRows}
        isLoggedIn={!!currentUser}
        isEnrolled={isEnrolled}
      />
    );
  }
```

Ajouter les imports en tête du fichier :

```tsx
import {
  ModuleSalesPage,
  fetchCatalogRows,
  hasModuleSalesPage,
} from "../_components/module/module-sales-page";
import type { SectionRow } from "../_components/module/module-program-data";
```

Le reste de la fonction (fiche générique) est conservé tel quel : il sert aux slugs sans fichier de contenu.

- [ ] **Step 5: Vérifier**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

Run: `pnpm test`
Expected: toute la suite passe.

Run: `pnpm dev` puis `/accompagnements/je-me-prepare-a-allaiter`
Expected: la fiche produit générique, inchangée. `MODULE_CONTENT` est vide, donc `hasModuleSalesPage` renvoie faux. C'est le comportement attendu à ce stade.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(public\)/accompagnements
git commit -m "feat: orchestrateur et routage des pages de vente de module"
```

---

## Task 11: Contenu — Mon allaitement des premiers jours

Fichier de référence : les tâches 12 à 18 suivent exactement cette forme.

**Files:**
- Create: `src/app/(public)/accompagnements/_components/module/content/mon-allaitement-des-premiers-jours.ts`
- Modify: `src/app/(public)/accompagnements/_components/module/content/index.ts`

**Interfaces:**
- Consumes: `ModuleContent` (Task 6).
- Produces: `MON_ALLAITEMENT_DES_PREMIERS_JOURS`, enregistré dans `MODULE_CONTENT`.

- [ ] **Step 1: Écrire le fichier de contenu**

```ts
import type { ModuleContent } from "./types";

/**
 * Page de vente « Mon allaitement des premiers jours » (75 €, 7 chapitres).
 * Moment vise : la sortie de maternite et les six premieres semaines, quand
 * tout se joue et que la douleur fait abandonner.
 */
export const MON_ALLAITEMENT_DES_PREMIERS_JOURS: ModuleContent = {
  hero: {
    eyebrow: "Consultante IBCLC depuis 2011 · 5 000+ familles accompagnées",
    titleOverride:
      "Les premières semaines décident souvent de tout votre allaitement. Vous n'avez pas à les traverser à l'aveugle.",
    subtitle:
      "La maternité vous a laissée partir avec un bébé et dix conseils contradictoires. Ce module vous donne les repères cliniques des six premières semaines : la prise du sein, la douleur, la montée de lait, la prise de poids, les rythmes. Tout ce qui se joue maintenant.",
    ctaLabel: "Je pose des bases solides",
  },
  problem: {
    title: "Les premières semaines, personne ne vous a vraiment préparée",
    intro:
      "Vous vous êtes préparée à accoucher. Pas à ça.",
    points: [
      "Chaque mise au sein vous fait mal, et vous serrez les dents en attendant que « ça passe ».",
      "Vous ne savez pas si votre bébé boit assez, et personne ne vous donne de critère fiable pour le vérifier.",
      "On vous a dit de patienter, d'espacer, de compléter. Trois conseils qui se contredisent.",
      "Votre bébé réclame toutes les heures et vous vous demandez si votre lait suffit.",
      "La courbe de poids vous angoisse avant même le rendez-vous.",
      "Vous êtes épuisée à 3 h du matin, sans personne à qui poser la question qui vous tient éveillée.",
    ],
  },
  promise: {
    title: "Ce n'est pas un manque de volonté, c'est un manque de repères",
    paragraphs: [
      "La douleur n'est pas le prix à payer pour allaiter. Elle est un signal : dans la très grande majorité des cas, elle vient d'une prise du sein perfectible, et elle se corrige. Les conseils reçus à la maternité arrivent souvent trop vite, dans un couloir, sans que personne ne regarde vraiment une tétée.",
      "Ce module s'appuie sur l'observation clinique, la physiologie de la lactation et les comportements innés du nouveau-né. C'est ce que je regarde en consultation, mis à plat, chapitre par chapitre, pour que vous puissiez l'observer chez vous.",
    ],
    bullets: [
      "Reconnaître une bonne prise du sein, et corriger celle qui fait mal.",
      "Savoir, avec des critères objectifs, si votre bébé boit assez.",
      "Distinguer un rythme normal de nouveau-né d'un signal qui doit alerter.",
    ],
  },
  program: {
    title: "Ce que contient le module",
    intro:
      "Sept chapitres qui suivent l'ordre réel des premières semaines, à consulter dans l'urgence ou à parcourir tranquillement.",
  },
  outcomes: {
    title: "Ce qui devient possible",
    items: [
      "Vous mettez votre bébé au sein sans appréhension, parce que vous savez ce que vous regardez.",
      "La douleur diminue, puis disparaît, et vous savez pourquoi.",
      "La pesée n'est plus un verdict : vous avez déjà vos propres repères.",
      "Vous comprenez les tétées groupées du soir au lieu de les vivre comme un échec.",
      "Vous savez ce qui justifie d'appeler une consultante, et ce qui n'est qu'une étape normale.",
      "Vous arrêtez de chercher des réponses sur les forums à 3 h du matin.",
    ],
  },
  fit: {
    title: "Est-ce le bon module pour vous ?",
    forYouTitle: "Oui, si",
    forYou: [
      "Vous êtes enceinte du dernier trimestre ou votre bébé a moins de deux mois.",
      "Vous avez mal et on vous a répondu que c'était normal.",
      "Vous doutez de votre production de lait.",
      "Vous voulez comprendre ce que vous faites, pas appliquer une recette.",
    ],
    notForYouTitle: "Pas encore, si",
    notForYou: [
      "Votre bébé a plus de six mois : « Mon allaitement au fil des mois » correspond mieux à votre étape.",
      "Vous cherchez uniquement à soulager une crevasse ou une mastite installée : voyez « Les urgences allaitement ».",
      "Votre situation demande un examen clinique de votre bébé : une consultation individuelle s'impose d'abord.",
    ],
  },
  moment: {
    title: "À quel moment de votre allaitement ?",
    intro:
      "Chaque accompagnement couvre une étape. Voici où celui-ci se situe.",
  },
  // PLACEHOLDER — temoignages a remplacer par de vrais verbatims avant mise en ligne.
  testimonials: {
    title: "Elles ont retrouvé des premières semaines sereines",
    items: [
      {
        quote:
          "J'avais mal à en pleurer. En comprenant la prise du sein, la douleur a disparu en trois jours.",
        author: "Marie",
        detail: "Maman de Léa, 3 semaines",
      },
      {
        quote:
          "Je pensais ne pas avoir assez de lait. J'avais juste un bébé au rythme normal, et personne ne me l'avait dit.",
        author: "Sarah",
        detail: "Maman d'Adam, 6 semaines",
      },
      {
        quote:
          "Enfin des réponses claires et non culpabilisantes. J'ai repris confiance en moi.",
        author: "Camille",
        detail: "Maman de Jules, 5 semaines",
      },
    ],
  },
  pricing: {
    title: "Donnez à votre allaitement le démarrage qu'il mérite",
    subtitle: "Un accès unique au module complet, à vie.",
  },
  faq: [
    {
      q: "Mon bébé a déjà trois mois, est-ce encore utile ?",
      a: "Oui si vous avez encore mal ou si vous doutez de votre production : les repères des premières semaines restent valables. Si votre allaitement est installé et que vos questions portent sur la suite, « Mon allaitement au fil des mois » vous conviendra mieux.",
    },
    {
      q: "Je suis encore enceinte, dois-je attendre l'accouchement ?",
      a: "Non, c'est même le meilleur moment. Vous arrivez à la maternité en sachant ce que vous regardez, au lieu de découvrir en pleine fatigue.",
    },
    {
      q: "J'allaite déjà en mixte, ce module peut-il m'aider ?",
      a: "Oui. Il vous aide à comprendre ce qui a conduit aux compléments et ce qui reste possible pour votre allaitement, sans injonction.",
    },
  ],
  finalCta: {
    title: "Offrez-vous des premières semaines sereines",
    subtitle:
      "Les bons repères, au bon moment, plutôt que dix conseils contradictoires.",
    ctaLabel: "Je pose des bases solides",
  },
};
```

- [ ] **Step 2: Enregistrer le contenu**

`content/index.ts` :

```ts
import type { ModuleContent } from "./types";
import { MON_ALLAITEMENT_DES_PREMIERS_JOURS } from "./mon-allaitement-des-premiers-jours";

/**
 * Copie des pages de vente, par slug. `Partial` volontairement : un module sans
 * fichier de contenu retombe sur la fiche produit generique plutot que de
 * casser la page.
 */
export const MODULE_CONTENT: Partial<Record<string, ModuleContent>> = {
  "mon-allaitement-des-premiers-jours": MON_ALLAITEMENT_DES_PREMIERS_JOURS,
};
```

- [ ] **Step 3: Vérifier la page en vrai**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

Run: `pnpm dev` puis `/accompagnements/mon-allaitement-des-premiers-jours`
Expected, dans l'ordre : hero vert avec halo pêche et icône lever de soleil, barre de preuve « 7 chapitres · 21 vidéos · Accès à vie », problème, promesse, programme avec les 7 chapitres réels numérotés et leurs badges vidéo, ce qui devient possible, deux colonnes oui/pas encore, timeline des 8 modules avec « Vous êtes ici » sur celui-ci, comment ça marche, consultante, témoignages, tarif à 75 €, bloc vert d'upsell pack, FAQ (3 questions du module puis 5 communes), CTA final rose.

Vérifier aussi : la carte flottante apparaît après 400 px de scroll et ses ancres fonctionnent ; les liens de la timeline mènent aux autres modules ; sur mobile la page ne déborde pas horizontalement.

- [ ] **Step 4: Vérifier la non-régression du pack**

Run: `pnpm dev` puis `/accompagnements/pack-mon-allaitement-sur-mesure`
Expected: page inchangée.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(public\)/accompagnements/_components/module/content
git commit -m "feat: page de vente de Mon allaitement des premiers jours"
```

---

## Tâches 12 à 18: les 7 modules restants

Chacune suit exactement la forme de la Task 11 : créer `content/<slug>.ts` exportant un `ModuleContent`, l'ajouter à `MODULE_CONTENT` dans `content/index.ts`, vérifier la page dans le navigateur, commiter. Les briefs ci-dessous donnent les chaînes à écrire ; tout ce qui n'est pas précisé (structure du fichier, `program.title`, `moment`, en-têtes de `fit`, commentaire `// PLACEHOLDER` au-dessus des témoignages) est identique à la Task 11.

Pour toutes : `hero.eyebrow` = `"Consultante IBCLC depuis 2011 · 5 000+ familles accompagnées"`, `hero.ctaLabel` et `finalCta.ctaLabel` = la valeur déjà présente dans `ACCOMPAGNEMENT_CTA_LABELS` pour ce slug (`src/config/accompagnement-cta.ts`), `moment.title` = `"À quel moment de votre allaitement ?"`, `moment.intro` = `"Chaque accompagnement couvre une étape. Voici où celui-ci se situe."`, `fit.forYouTitle` = `"Oui, si"`, `fit.notForYouTitle` = `"Pas encore, si"`.

Chaque module a besoin de : 6 `problem.points`, 2 `promise.paragraphs`, 3 `promise.bullets`, 6 `outcomes.items`, 4 `fit.forYou`, 3 `fit.notForYou`, 3 témoignages, 3 questions de FAQ propres au module.

---

### Task 12: Je me prépare à allaiter

**Files:** Create `content/je-me-prepare-a-allaiter.ts`, modify `content/index.ts`.
**Interfaces:** Produces `JE_ME_PREPARE_A_ALLAITER`.

- [ ] **Step 1: Écrire le contenu**

Moment : grossesse, avant la naissance. 5 chapitres, 14 vidéos, 75 €. Angle : prendre de l'avance pendant qu'on a encore du temps et de l'énergie, pour ne pas découvrir en pleine fatigue.

- `titleOverride` : « Le meilleur moment pour apprendre à allaiter, c'est avant que votre bébé soit là. »
- `subtitle` : « Vous préparez la chambre, la valise, la liste de naissance. Personne ne vous a dit que les trois heures les plus décisives de votre allaitement se joueraient juste après la naissance, et qu'on peut les préparer. »
- `problem.title` : « Ce que vous ne saurez qu'une fois qu'il sera trop tard »
- `problem.intro` : « On prépare tout pour l'arrivée du bébé, sauf la seule chose qu'on fera dix fois par jour pendant des mois. »
- `problem.points` : les cours de préparation à la naissance survolent l'allaitement en vingt minutes ; l'entourage vous prédit déjà que vous n'aurez pas assez de lait ; vous ne savez pas ce qui se passe réellement dans l'heure qui suit la naissance ; vous ignorez ce qu'il faut demander à la maternité, et ce qu'il faut refuser ; vous avez lu dix articles qui se contredisent sur le tire-lait, les tétines et les compléments ; vous partez avec l'idée que « ça marchera ou ça ne marchera pas », comme si c'était une loterie.
- `promise.title` : « L'allaitement n'est pas une loterie, c'est une compétence »
- `promise.paragraphs` : (1) la physiologie de la lactation est prévisible, ce qui la met en difficulté aussi ; ce qui distingue les démarrages faciles des démarrages douloureux tient à quelques gestes et quelques décisions prises très tôt. (2) ce module transmet ce que j'explique aux futures mères en consultation prénatale : ce qui se joue à la naissance, ce qu'il faut savoir demander, et comment reconnaître dès le premier jour que tout se passe bien.
- `promise.bullets` : comprendre comment la lactation se met en place, et ce qui la freine ; savoir quoi demander et quoi refuser à la maternité ; reconnaître dès la première tétée ce qui va bien et ce qui doit être corrigé.
- `outcomes.items` : vous arrivez à la maternité avec un plan, pas avec des espoirs ; vous savez formuler ce que vous voulez à l'équipe soignante ; la première tétée n'est plus un moment que vous subissez ; vous reconnaissez une bonne prise du sein avant d'avoir mal ; les remarques de l'entourage ne vous font plus douter ; vous économisez les nuits de recherche paniquée sur internet.
- `fit.forYou` : vous êtes enceinte, quel que soit le terme ; c'est votre premier allaitement et vous partez de zéro ; votre allaitement précédent s'est mal passé et vous voulez comprendre pourquoi ; vous voulez décider en connaissance de cause, pas suivre des consignes.
- `fit.notForYou` : votre bébé est né et vous avez déjà mal, voyez « Mon allaitement des premiers jours » ; vous cherchez à résoudre une crevasse ou un engorgement en cours, voyez « Les urgences allaitement » ; vous avez une pathologie mammaire connue qui demande un avis clinique individuel.
- `pricing.title` : « Préparez la seule chose que vous ferez dix fois par jour »
- `pricing.subtitle` : « Un accès unique au module complet, à vie. »
- FAQ propres : « Je suis au premier trimestre, est-ce trop tôt ? » (non, c'est le meilleur moment, vous avez encore l'énergie de lire tranquillement) ; « Je ne sais pas encore si je vais allaiter » (le module aide justement à décider en connaissance de cause, sans injonction) ; « J'ai déjà allaité, ça m'apportera quelque chose ? » (oui, chaque allaitement est différent et ce qui s'est passé la première fois ne préjuge pas de la suivante).
- `finalCta.title` : « Arrivez préparée, pas inquiète » ; `finalCta.subtitle` : « Quelques heures maintenant valent mieux que six semaines de doute. »
- Témoignages : profils « enceinte de 7 mois », « maman de Noé, 2 mois », « enceinte de 8 mois ».

- [ ] **Step 2: Enregistrer, vérifier, commiter**

Ajouter à `MODULE_CONTENT`, puis :

Run: `pnpm exec tsc --noEmit` — Expected: aucune erreur.
Run: `pnpm dev` puis `/accompagnements/je-me-prepare-a-allaiter` — Expected: page complète, halo sage, icône pousse, 5 chapitres, 14 vidéos, upsell pack visible.

```bash
git add src/app/\(public\)/accompagnements/_components/module/content
git commit -m "feat: page de vente de Je me prepare a allaiter"
```

---

### Task 13: Mon allaitement au fil des mois

**Files:** Create `content/mon-allaitement-au-fil-des-mois.ts`, modify `content/index.ts`.
**Interfaces:** Produces `MON_ALLAITEMENT_AU_FIL_DES_MOIS`.

- [ ] **Step 1: Écrire le contenu**

Moment : allaitement installé, de deux mois à plusieurs années. 6 chapitres, 25 vidéos, 75 €. Angle : l'allaitement qui dure pose d'autres questions que le démarrage, et plus personne ne vous accompagne à ce stade. Les titres de chapitres en base sont déjà les questions des mères (« Je veux plus de lait », « J'ai mal », « Je suis inquiète pour mon bébé », « Mon bébé est agité ») : le `program.intro` doit le souligner.

- `titleOverride` : « Votre allaitement est lancé. Les questions, elles, ne s'arrêtent pas là. »
- `subtitle` : « Passé les premières semaines, on considère que ça roule. Sauf que la baisse de lait, les pics de croissance, les tétées agitées, les dents et le regard des autres arrivent maintenant, et que plus personne ne vous accompagne. »
- `problem.title` : « Le moment où l'on cesse de vous accompagner »
- `problem.intro` : « Passé six semaines, on suppose que vous savez. Ce n'est pas ce que vous vivez. »
- `problem.points` : vous avez l'impression d'avoir moins de lait qu'avant et vous ne savez pas si c'est réel ; votre bébé s'agite au sein, se cambre, refuse, et vous ne comprenez pas pourquoi ; la douleur est revenue après des semaines sans problème ; on vous demande de plus en plus souvent quand vous comptez arrêter ; votre bébé tète encore la nuit et tout le monde vous dit que ce n'est plus normal ; vous ne savez pas à qui poser ces questions maintenant que la maternité est loin.
- `promise.title` : « Un allaitement qui dure n'est pas un allaitement figé »
- `promise.paragraphs` : (1) la lactation s'ajuste en permanence : ce que vous prenez pour une baisse est souvent une régulation normale, et ce que vous prenez pour un caprice est souvent un besoin identifiable. (2) ce module reprend, une par une, les questions que les mères me posent entre deux mois et deux ans, avec ce que l'observation clinique permet de répondre.
- `promise.bullets` : distinguer une vraie baisse de lactation d'une régulation normale ; comprendre les comportements de votre bébé au sein plutôt que les interpréter ; savoir répondre à l'entourage sans avoir à vous justifier.
- `outcomes.items` : vous savez si votre production baisse vraiment, et quoi faire le cas échéant ; les tétées agitées ne vous inquiètent plus, vous en connaissez les causes ; vous traversez les pics de croissance sans croire que tout s'écroule ; la douleur qui revient a une explication et une réponse ; vous assumez les tétées nocturnes en sachant ce qu'elles apportent ; les remarques de l'entourage glissent.
- `fit.forYou` : votre bébé a plus de deux mois et votre allaitement est installé ; vous doutez de votre production sans signe objectif ; votre bébé s'agite ou refuse le sein ; vous voulez continuer et vous cherchez des réponses solides.
- `fit.notForYou` : votre bébé a moins de six semaines, voyez « Mon allaitement des premiers jours » ; votre question porte sur la reprise du travail, la diversification ou le sevrage : ces trois modules existent séparément ; vous avez une mastite ou un abcès en cours qui demande un avis médical immédiat.
- `pricing.title` : « Continuez votre allaitement avec les bonnes réponses »
- `pricing.subtitle` : « Un accès unique au module complet, à vie. »
- FAQ propres : « Mon bébé a un an, c'est encore pour moi ? » (oui, le module couvre l'allaitement long) ; « Je crois que je n'ai plus assez de lait » (le module donne les critères objectifs pour le vérifier avant de conclure) ; « Mon bébé refuse le sein depuis quelques jours » (le module traite la grève de la tétée et ses causes).
- `finalCta.title` : « Votre allaitement mérite de durer sereinement » ; `finalCta.subtitle` : « Les questions du milieu de parcours méritent d'aussi bonnes réponses que celles du début. »
- Témoignages : profils « maman de Lou, 5 mois », « maman d'Éliott, 9 mois », « maman de Rose, 14 mois ».

- [ ] **Step 2: Enregistrer, vérifier, commiter**

Run: `pnpm exec tsc --noEmit` — Expected: aucune erreur.
Run: `pnpm dev` puis `/accompagnements/mon-allaitement-au-fil-des-mois` — Expected: 6 chapitres, 25 vidéos, halo miel, icône calendrier.

```bash
git add src/app/\(public\)/accompagnements/_components/module/content
git commit -m "feat: page de vente de Mon allaitement au fil des mois"
```

---

### Task 14: Je reprends une activité professionnelle

**Files:** Create `content/je-reprends-une-activite-professionnelle.ts`, modify `content/index.ts`.
**Interfaces:** Produces `JE_REPRENDS_UNE_ACTIVITE_PROFESSIONNELLE`.

- [ ] **Step 1: Écrire le contenu**

Moment : les semaines qui précèdent la reprise. 6 chapitres, 17 vidéos, 75 €. Angle : la reprise est la première cause d'arrêt non choisi de l'allaitement, et c'est un problème d'organisation, pas de lactation.

- `titleOverride` : « Reprendre le travail ne vous oblige pas à arrêter d'allaiter. »
- `subtitle` : « La reprise est la première raison pour laquelle des mères arrêtent d'allaiter sans l'avoir choisi. Pas parce que c'est impossible, mais parce que personne ne leur a montré comment s'organiser. »
- `problem.title` : « La date approche et rien n'est prêt »
- `problem.intro` : « Vous savez quand vous reprenez. Vous ne savez pas comment vous allez faire. »
- `problem.points` : vous ne savez pas combien de lait tirer, ni quand commencer ; le tire-lait vous intimide et les premiers essais ont donné trois gouttes ; vous ignorez comment conserver et transporter votre lait en sécurité ; le mode de garde vous dit qu'il « faudra bien passer au biberon » ; votre bébé refuse le biberon et la reprise est dans trois semaines ; vous ne savez pas à quoi vous avez droit sur votre lieu de travail.
- `promise.title` : « Ce n'est pas un problème de lactation, c'est un problème d'organisation »
- `promise.paragraphs` : (1) une lactation installée ne s'arrête pas parce que vous reprenez le travail. Ce qui la met en difficulté, c'est un plan de tirage improvisé, un stock constitué trop tard et un mode de garde mal informé. (2) ce module donne la méthode que je transmets en consultation avant chaque reprise : quand commencer, combien tirer, comment conserver, quoi dire au mode de garde et à l'employeur.
- `promise.bullets` : construire un plan de tirage adapté à votre rythme de travail ; conserver et transporter votre lait en sécurité ; préparer votre bébé et son mode de garde à votre absence.
- `outcomes.items` : vous reprenez avec un stock suffisant et un plan clair ; le tirage devient une routine de quelques minutes, pas une épreuve ; votre lait est conservé correctement, sans doute sur les durées ; votre mode de garde applique ce que vous avez demandé ; votre bébé accepte de boire en votre absence et retrouve le sein le soir ; votre lactation tient dans la durée au lieu de s'effondrer en trois semaines.
- `fit.forYou` : vous reprenez dans les semaines ou les mois qui viennent ; vous voulez continuer à allaiter après la reprise ; vous n'avez jamais tiré votre lait ou vos essais ont échoué ; vous cherchez un plan concret, pas des encouragements.
- `fit.notForYou` : votre allaitement n'est pas encore installé et vous avez mal, commencez par « Mon allaitement des premiers jours » ; vous avez décidé de sevrer à la reprise, « Je souhaite sevrer mon bébé » vous accompagnera mieux ; votre bébé a plus de six mois et votre question porte d'abord sur les repas solides, voyez « La diversification de mon bébé allaité ».
- `pricing.title` : « Reprenez le travail sans renoncer à votre allaitement »
- `pricing.subtitle` : « Un accès unique au module complet, à vie. »
- FAQ propres : « Je reprends dans dix jours, c'est trop tard ? » (non, le module donne aussi la marche à suivre en délai court) ; « Mon bébé refuse le biberon » (le module traite le refus et les alternatives au biberon) ; « Je travaille en horaires décalés ou sans pause dédiée » (le module couvre les plans de tirage contraints et vos droits).
- `finalCta.title` : « Reprenez sereinement, continuez d'allaiter » ; `finalCta.subtitle` : « Un plan clair vaut mieux qu'un arrêt subi. »
- Témoignages : profils « maman de Gabriel, 4 mois », « maman d'Inès, 6 mois », « maman de Tom, 5 mois ».

- [ ] **Step 2: Enregistrer, vérifier, commiter**

Run: `pnpm exec tsc --noEmit` — Expected: aucune erreur.
Run: `pnpm dev` puis `/accompagnements/je-reprends-une-activite-professionnelle` — Expected: 6 chapitres, 17 vidéos, halo sage, icône mallette.

```bash
git add src/app/\(public\)/accompagnements/_components/module/content
git commit -m "feat: page de vente de Je reprends une activite professionnelle"
```

---

### Task 15: La diversification de mon bébé allaité

**Files:** Create `content/la-diversification-de-mon-bebe-allaite.ts`, modify `content/index.ts`.
**Interfaces:** Produces `LA_DIVERSIFICATION_DE_MON_BEBE_ALLAITE`.

- [ ] **Step 1: Écrire le contenu**

Moment : autour de six mois. 5 chapitres, 15 vidéos, 75 €. Angle : diversifier un bébé allaité ne suit pas les mêmes règles qu'un bébé au biberon, et les conseils reçus ignorent cette différence.

- `titleOverride` : « Diversifier un bébé allaité, ce n'est pas la même chose. Et personne ne vous le dit. »
- `subtitle` : « Les grammages, les horaires et les ordres d'introduction qu'on vous donne ont été pensés pour des bébés nourris au biberon. Votre bébé tète : sa diversification suit une autre logique, et votre allaitement n'a pas à s'arrêter là. »
- `problem.title` : « On vous donne un calendrier, pas une explication »
- `problem.intro` : « À six mois, tout le monde a un avis sur ce que votre bébé devrait manger. »
- `problem.points` : on vous donne des grammages précis sans vous dire d'où ils viennent ; vous ne savez pas s'il faut donner le sein avant ou après le repas ; votre bébé refuse la cuillère et vous vous demandez si vous vous y prenez mal ; on vous annonce que l'allaitement doit forcément diminuer maintenant ; les allergènes vous inquiètent et les conseils ont changé trois fois en dix ans ; vous ne savez pas comment reconnaître qu'il est vraiment prêt.
- `promise.title` : « La diversification suit votre bébé, pas un calendrier »
- `promise.paragraphs` : (1) un bébé allaité arrive à la diversification avec une expérience gustative et une autoregulation que les repères standards ignorent. Les signes de maturité sont observables, ils ne se lisent pas sur un calendrier. (2) ce module explique ce qui se passe réellement, ce que dit la recherche actuelle sur les allergènes et les textures, et comment introduire les aliments sans faire chuter votre lactation.
- `promise.bullets` : reconnaître les vrais signes de maturité de votre bébé ; introduire les aliments dans un ordre qui a du sens, allergènes compris ; préserver votre allaitement pendant que l'alimentation solide s'installe.
- `outcomes.items` : vous savez quand commencer, en observant votre bébé plutôt que le calendrier ; les repas deviennent un moment de découverte, pas un combat ; vous n'avez plus peur d'introduire les allergènes ; votre lactation tient pendant que les quantités solides augmentent ; vous savez quoi répondre quand on vous dit qu'il faut arrêter le sein ; les refus et les régressions ne vous inquiètent plus.
- `fit.forYou` : votre bébé approche ou dépasse quatre à six mois ; vous voulez continuer à allaiter pendant la diversification ; vous hésitez entre cuillère, morceaux et alimentation autonome ; les allergènes vous inquiètent.
- `fit.notForYou` : votre bébé a moins de quatre mois : la diversification n'est pas encore le sujet ; vous cherchez à sevrer complètement, voyez « Je souhaite sevrer mon bébé » ; votre bébé a une allergie déjà diagnostiquée qui demande un suivi médical individuel.
- `pricing.title` : « Diversifiez sans mettre fin à votre allaitement »
- `pricing.subtitle` : « Un accès unique au module complet, à vie. »
- FAQ propres : « Faut-il donner le sein avant ou après le repas ? » (le module explique la logique et les cas de figure) ; « Mon bébé recrache tout » (c'est fréquent et le module explique ce que cela signifie) ; « Dois-je réduire les tétées quand il mange ? » (non par principe, le module détaille comment les deux coexistent).
- `finalCta.title` : « Une diversification à votre rythme » ; `finalCta.subtitle` : « Votre bébé vous montre quand il est prêt. Encore faut-il savoir le lire. »
- Témoignages : profils « maman de Mila, 7 mois », « maman de Sacha, 8 mois », « maman d'Ava, 6 mois ».

- [ ] **Step 2: Enregistrer, vérifier, commiter**

Run: `pnpm exec tsc --noEmit` — Expected: aucune erreur.
Run: `pnpm dev` puis `/accompagnements/la-diversification-de-mon-bebe-allaite` — Expected: 5 chapitres, 15 vidéos, halo miel, icône couverts.

```bash
git add src/app/\(public\)/accompagnements/_components/module/content
git commit -m "feat: page de vente de La diversification de mon bebe allaite"
```

---

### Task 16: Je souhaite sevrer mon bébé

**Files:** Create `content/je-souhaite-sevrer-mon-bebe.ts`, modify `content/index.ts`.
**Interfaces:** Produces `JE_SOUHAITE_SEVRER_MON_BEBE`.

- [ ] **Step 1: Écrire le contenu**

Moment : la décision d'arrêter, à tout âge. 6 chapitres, 18 vidéos, 75 €. Angle : le sevrage est un acte à part entière, physiologique et émotionnel, et il se rate quand on l'improvise. Ton particulièrement non culpabilisant : la lectrice a déjà décidé, elle n'a pas besoin d'être convaincue de continuer.

- `titleOverride` : « Arrêter d'allaiter est une décision. Elle mérite d'être accompagnée, pas subie. »
- `subtitle` : « Que vous arrêtiez à trois semaines ou à trois ans, par choix ou par contrainte, le sevrage se prépare. Mal mené, il fait mal, aux seins comme au cœur. Bien mené, il se passe en douceur pour vous deux. »
- `problem.title` : « Personne ne vous accompagne pour arrêter »
- `problem.intro` : « On vous a beaucoup dit comment commencer. Sur la fin, silence. »
- `problem.points` : vous ne savez pas à quel rythme retirer les tétées sans engorger ; vous craignez que votre bébé le vive mal, et vous culpabilisez déjà ; on vous a conseillé de serrer vos seins ou de prendre un médicament, sans explication ; vous avez essayé d'arrêter et votre bébé a refusé catégoriquement ; vous ne savez pas si ce que vous ressentez, tristesse ou soulagement, est normal ; votre entourage a un avis tranché, dans un sens ou dans l'autre.
- `promise.title` : « Un sevrage réussi est un sevrage progressif et informé »
- `promise.paragraphs` : (1) le sevrage est un processus physiologique : la lactation décroît selon des règles connues, et les brusquer expose à l'engorgement, à la mastite et à une chute hormonale difficile. (2) ce module donne la méthode selon l'âge de votre bébé et votre délai, et il traite la part émotionnelle, la vôtre comme la sienne, que presque personne n'aborde.
- `promise.bullets` : retirer les tétées dans un ordre et à un rythme qui protègent vos seins ; accompagner la réaction de votre bébé plutôt que de la subir ; reconnaître une grève de la tétée, qui n'est pas un sevrage.
- `outcomes.items` : vous savez exactement quelle tétée retirer, et quand ; vos seins ne vous font pas mal pendant la décroissance ; votre bébé traverse la transition avec un remplacement qui lui convient ; vous distinguez un vrai refus d'une grève passagère ; vous vivez vos émotions sans les trouver anormales ; vous arrêtez sans avoir le sentiment d'avoir raté quelque chose.
- `fit.forYou` : vous avez décidé d'arrêter, quelle que soit la raison ; vous voulez arrêter progressivement et sans douleur ; vous avez déjà essayé et votre bébé a refusé ; vous hésitez encore et voulez comprendre ce que le sevrage implique.
- `fit.notForYou` : vous voulez continuer et cherchez à résoudre une difficulté, d'autres modules y répondent mieux ; vous êtes en pleine mastite ou abcès, traitez-le d'abord avec « Les urgences allaitement » ou une consultation ; votre arrêt est imposé par un traitement médical en cours qui demande un avis individuel.
- `pricing.title` : « Terminez votre allaitement comme vous l'avez commencé, accompagnée »
- `pricing.subtitle` : « Un accès unique au module complet, à vie. »
- FAQ propres : « Je dois arrêter très vite, est-ce possible ? » (le module couvre les sevrages courts et les précautions à prendre) ; « Mon bébé refuse tout autre chose que le sein » (le module traite le refus et les alternatives selon l'âge) ; « Vais-je me sentir mal après ? » (la chute hormonale est réelle, le module explique ce qui est attendu et ce qui doit alerter).
- `finalCta.title` : « Sevrez en douceur, et en confiance » ; `finalCta.subtitle` : « Votre décision est la bonne. Reste à la mettre en œuvre correctement. »
- Témoignages : profils « maman de Naël, 11 mois », « maman de Zoé, 18 mois », « maman de Liam, 4 mois ».

- [ ] **Step 2: Enregistrer, vérifier, commiter**

Run: `pnpm exec tsc --noEmit` — Expected: aucune erreur.
Run: `pnpm dev` puis `/accompagnements/je-souhaite-sevrer-mon-bebe` — Expected: 6 chapitres, 18 vidéos, halo pêche, icône feuille.

```bash
git add src/app/\(public\)/accompagnements/_components/module/content
git commit -m "feat: page de vente de Je souhaite sevrer mon bebe"
```

---

### Task 17: Mon bébé ne fait pas ses nuits

**Files:** Create `content/mon-bebe-ne-fait-pas-ses-nuits.ts`, modify `content/index.ts`.
**Interfaces:** Produces `MON_BEBE_NE_FAIT_PAS_SES_NUITS`.

- [ ] **Step 1: Écrire le contenu**

Le plus gros module : 15 chapitres, 210 vidéos, 97 €. Le programme sera replié (au-delà de 8 chapitres). Le prix le plus élevé du catalogue doit être justifié par la volumétrie, que la barre de preuve affiche déjà. Angle : le sommeil du jeune enfant est un sujet en soi, pas un chapitre de l'allaitement, et l'injonction à « faire ses nuits » repose sur une idée fausse.

- `titleOverride` : « Votre bébé ne dort pas comme on vous a dit qu'il devrait. Peut-être que c'est la consigne qui est fausse. »
- `subtitle` : « Faire ses nuits n'est pas une compétence qui s'apprend à trois mois. Le sommeil du jeune enfant obéit à des mécanismes précis, et comprendre ces mécanismes change tout : ce que vous attendez, ce que vous mettez en place, et la culpabilité que vous portez. »
- `problem.title` : « Vous êtes épuisée, et on vous répond que c'est normal »
- `problem.intro` : « Deux réponses circulent, et aucune ne vous aide : laissez pleurer, ou prenez votre mal en patience. »
- `problem.points` : votre enfant se réveille plusieurs fois par nuit et vous ne tenez plus ; on vous dit qu'à son âge il devrait dormir d'une traite, et vous vous demandez ce que vous ratez ; l'endormissement dure une heure et se termine souvent en pleurs ; on vous conseille de le laisser pleurer et cela vous est insupportable ; vous ne savez pas si les tétées de nuit entretiennent le problème ; votre couple et votre travail encaissent, et personne ne parle de vous.
- `promise.title` : « Le sommeil n'est pas une discipline, c'est une physiologie »
- `promise.paragraphs` : (1) les cycles de sommeil du jeune enfant, leur maturation, le rôle de l'alimentation, de la lumière et de l'environnement sont documentés. Les réveils nocturnes ne sont pas un dysfonctionnement à corriger, mais ils ont des causes sur lesquelles on peut agir. (2) ce module est le plus complet du catalogue : il reprend les besoins de l'enfant, l'endormissement, ce qui parasite le sommeil, les habitudes, et il consacre une partie entière au bien-être des parents, parce qu'une famille épuisée ne tient pas sur la seule compréhension.
- `promise.bullets` : comprendre les besoins réels de sommeil selon l'âge, et ce qui est attendu ; identifier ce qui parasite concrètement les nuits de votre enfant ; agir sur l'endormissement sans laisser pleurer.
- `outcomes.items` : vous savez ce qui est normal à l'âge de votre enfant et vous cessez de vous comparer ; l'endormissement s'allège parce que vous en avez identifié les freins ; les réveils diminuent, et ceux qui restent ne vous effondrent plus ; vous savez si l'alimentation joue un rôle dans son cas ; vous mettez en place un cadre qui vous convient, sans méthode imposée ; vous récupérez, parce que le module traite aussi votre sommeil à vous.
- `fit.forYou` : les nuits de votre enfant vous épuisent, quel que soit son âge ; on vous a conseillé de le laisser pleurer et vous cherchez autre chose ; vous voulez comprendre avant d'appliquer ; vous cherchez un accompagnement complet, pas trois astuces.
- `fit.notForYou` : votre bébé a moins de six semaines : ses réveils sont physiologiques et « Mon allaitement des premiers jours » répond mieux à vos questions ; vous cherchez une méthode d'entraînement au sommeil par extinction, ce n'est pas l'approche de ce module ; votre enfant présente des signes médicaux, apnées ou trouble respiratoire, qui relèvent d'un avis pédiatrique.
- `pricing.title` : « Comprenez le sommeil de votre enfant, et retrouvez le vôtre »
- `pricing.subtitle` : « Le module le plus complet du catalogue. Un accès unique, à vie. »
- FAQ propres : « C'est le module le plus cher, pourquoi ? » (c'est le plus vaste : quinze chapitres et plus de deux cents vidéos, qui couvrent le sommeil de la naissance au jeune enfant, et le sommeil des parents) ; « Mon enfant a trois ans, est-ce encore pour moi ? » (oui, le module couvre du nourrisson au jeune enfant) ; « Est-ce une méthode d'entraînement au sommeil ? » (non, aucune extinction ni laisser-pleurer : le module explique les mécanismes et propose des leviers).
- `finalCta.title` : « Des nuits qui redeviennent lisibles » ; `finalCta.subtitle` : « Comprendre ce qui se passe change plus de choses qu'une méthode de plus. »
- Témoignages : profils « maman de Jade, 8 mois », « maman de Raphaël, 2 ans », « maman de Léon, 14 mois ».

- [ ] **Step 2: Enregistrer, vérifier, commiter**

Run: `pnpm exec tsc --noEmit` — Expected: aucune erreur.
Run: `pnpm dev` puis `/accompagnements/mon-bebe-ne-fait-pas-ses-nuits` — Expected: 15 chapitres, dont 6 visibles et un bouton « Voir les 9 chapitres suivants » qui déplie le reste ; barre de preuve « 15 chapitres · 210 vidéos » ; halo sage, icône lune ; prix 97 €.

```bash
git add src/app/\(public\)/accompagnements/_components/module/content
git commit -m "feat: page de vente de Mon bebe ne fait pas ses nuits"
```

---

### Task 18: Les urgences allaitement (parcours court)

**Files:** Create `content/les-urgences-allaitement.ts`, modify `content/index.ts`.
**Interfaces:** Produces `LES_URGENCES_ALLAITEMENT`.

- [ ] **Step 1: Écrire le contenu, sans `problem`, `promise` ni `testimonials`**

Ce module est le seul dont le fichier omet trois sections. C'est intentionnel : 27 €, 4 chapitres, une lectrice qui a mal en ce moment. Les clés `problem`, `promise` et `testimonials` sont **absentes** de l'objet (pas mises à `undefined` explicitement), et le fichier porte un commentaire d'en-tête l'expliquant :

```ts
/**
 * Page de vente « Les urgences allaitement » (27 €, 4 chapitres).
 *
 * Parcours volontairement court : `problem`, `promise` et `testimonials` sont
 * omis. La lectrice arrive ici avec une crevasse ou une mastite en cours ; lui
 * dérouler six paragraphes sur sa douleur avant de montrer le remède serait
 * contre-productif. Le hero enchaine sur la barre de preuve, puis directement
 * sur le programme.
 */
```

Le parcours rendu est donc : hero, barre de preuve, programme, ce qui devient possible, oui/pas encore, timeline, comment ça marche, consultante, tarif, upsell pack, FAQ, CTA final.

- `titleOverride` : « Une crevasse, un engorgement, une mastite. Ce qu'il faut faire, tout de suite. »
- `subtitle` : « Quatre situations, quatre marches à suivre, expliquées par une consultante IBCLC. Accès immédiat, pour ce soir. »
- `program.title` : « Les quatre urgences traitées »
- `program.intro` : « Chaque chapitre répond à une situation précise, avec la conduite à tenir et ce qu'il ne faut surtout pas faire. »
- `outcomes.items` : vous savez quoi faire dans l'heure qui vient ; la douleur diminue parce que vous traitez la cause, pas le symptôme ; vous savez ce qui relève de l'auto-traitement et ce qui impose de consulter ; vous évitez les gestes qui aggravent, encore souvent conseillés ; vous continuez d'allaiter pendant le traitement, ce qui est presque toujours indiqué ; vous reconnaissez les signes de récidive avant qu'elle s'installe.
- `fit.forYou` : vous avez mal maintenant et vous cherchez la conduite à tenir ; vous avez une rougeur, une boule ou de la fièvre ; on vous a conseillé d'arrêter d'allaiter et vous voulez vérifier ; vous voulez savoir reconnaître ces situations avant qu'elles arrivent.
- `fit.notForYou` : votre douleur est présente à chaque tétée depuis le début sans lésion visible : c'est souvent une question de prise du sein, voyez « Mon allaitement des premiers jours » ; vous avez de la fièvre depuis plus de 24 heures ou un état général dégradé : consultez un médecin sans attendre, ce module ne remplace pas un avis clinique ; vous cherchez un accompagnement complet de votre allaitement, le pack ou les modules par étape sont plus adaptés.
- `pricing.title` : « Soulagez la douleur, ce soir »
- `pricing.subtitle` : « Accès immédiat après paiement. Un accès unique, à vie. »
- FAQ propres : « J'ai de la fièvre, dois-je consulter ? » (oui si elle dure plus de 24 heures ou si votre état général se dégrade : le module précise les critères, il ne remplace pas un avis médical) ; « Dois-je arrêter d'allaiter pendant une mastite ? » (non, dans la très grande majorité des cas continuer est ce qui résout la mastite : le module explique pourquoi) ; « Le module coûte 27 €, pourquoi si peu ? » (c'est le plus court du catalogue, quatre situations ciblées, et il doit rester accessible dans l'urgence).
- `finalCta.title` : « N'attendez pas que ça empire » ; `finalCta.subtitle` : « Quatre situations, la conduite à tenir, accessible dans la minute. »

- [ ] **Step 2: Enregistrer, vérifier, commiter**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur. Si TypeScript proteste sur les clés absentes, c'est que `problem`, `promise` ou `testimonials` n'ont pas été déclarées optionnelles dans `ModuleContent` : corriger le type, pas le contenu.

Run: `pnpm dev` puis `/accompagnements/les-urgences-allaitement`
Expected: hero, barre de preuve « 4 chapitres · 5 vidéos · Accès à vie », puis directement le programme. **Aucune** section problème, promesse ou témoignages. La carte flottante n'affiche que trois ancres (Programme, Tarif, FAQ), sans Témoignages. Halo rouge, icône bouclier, prix 27 €.

```bash
git add src/app/\(public\)/accompagnements/_components/module/content
git commit -m "feat: page de vente courte des Urgences allaitement"
```

---

## Task 19: Vérification finale

**Files:** aucun fichier créé. Correction inline de ce qui est trouvé.

- [ ] **Step 1: Suite complète**

Run: `pnpm test`
Expected: tous les tests passent, dont `module-program-data.spec.ts` (11), `pack-upsell-data.spec.ts` (4), `pack-modules-data.spec.ts` (2).

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

Run: `pnpm lint`
Expected: aucune erreur.

Run: `pnpm build`
Expected: build réussi.

- [ ] **Step 2: Parcourir les 9 pages**

Sur `pnpm dev`, ouvrir successivement les 8 modules et le pack. Pour chacun, vérifier : le prix affiché correspond à la base, le nombre de chapitres correspond au contenu réel, le bloc upsell est présent sur les modules et absent du pack, la timeline surligne le bon module, la FAQ contient les questions du module suivies des communes.

- [ ] **Step 3: Vérifier le repli**

Dans le back-office, dépublier temporairement le pack, puis recharger une page de module.
Expected: la page s'affiche normalement, sans le bloc upsell. Republier le pack.

- [ ] **Step 4: Vérifier le responsive**

Sur `/accompagnements/mon-bebe-ne-fait-pas-ses-nuits` en 375 px de large : aucun débordement horizontal, la carte flottante est masquée, le bouton de dépliage du programme fonctionne, les deux colonnes oui/pas encore s'empilent.

- [ ] **Step 5: Recenser les placeholders**

Run: `grep -rn "PLACEHOLDER" src/app/\(public\)/accompagnements/`
Expected: la garantie dans `shared.ts`, et un commentaire au-dessus des témoignages dans chacun des 7 fichiers de contenu qui en contiennent (tous sauf `les-urgences-allaitement.ts`).

Reporter cette liste au propriétaire du projet : ces textes doivent être remplacés ou validés avant mise en production.

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "chore: verification finale des pages de vente des modules"
```

---

## Auto-revue du plan

**Couverture de la spec :**

| Exigence de la spec | Tâche |
|---|---|
| §4 primitives extraites vers `sales/` | 1, 2 |
| §4 pack refactoré à iso-rendu | 1, 2 (steps de vérification) |
| §5 sections 1 et 2 (hero, barre de preuve) | 2, 8, 10 |
| §5 sections 3, 4 (problème, promesse, optionnelles) | 8, 11 à 18 |
| §5 section 5 et §6 (programme DB + `sales_hook`) | 4, 7 |
| §5 section 6 (ce qui devient possible) | 8 |
| §5 section 7 (dis-qualification) | 8 |
| §5 section 8 (timeline, maillage interne) | 8, 10 |
| §5 sections 9, 10 (comment ça marche, consultante) | 2, 8 |
| §5 section 11 (témoignages optionnels) | 2, 10, 11 à 17 |
| §5 section 12 (tarif, garantie) | 2, 6 |
| §5 section 13 (upsell pack) | 5, 9 |
| §5 sections 14, 15 (FAQ, CTA final) | 1, 8, 10 |
| §5 variante courte urgences | 18 |
| §7 migration `sales_hook` + back-office | 3 |
| §8 routage, repli générique, `long_description_html` retiré | 10 |
| §9 type `ModuleContent` et `shared.ts` | 6 |
| §10 copy + placeholders balisés | 11 à 18, 19 step 5 |
| §11 tests (upsell, compteurs, repli sans section) | 4, 5 |
| §13 critères de succès | 19 |

**Cohérence des types :** `SectionRow` est défini en Task 4 et consommé tel quel en Task 10. `ProgramChapter` et `formatChapterCounts` (Task 4) sont consommés en Task 7. `PackUpsell` (Task 5) est consommé en Task 9 et construit en Task 10. `Testimonial` (Task 2) et `FaqItem` (Task 1) sont importés par `types.ts` (Task 6). `SideCtaAnchor` (Task 2) est construit en Task 10. `ModuleContent` (Task 6) est le type de tous les fichiers des tâches 11 à 18 et le paramètre de tous les composants de la Task 8.

**Point d'attention connu :** la Task 7 appelle `formatChapterCounts` avec un objet de compteurs filtré pour extraire un badge à la fois. C'est correct mais indirect. Si l'implémentation trouve plus lisible d'extraire un helper `formatSingleCount(type, n)` dans `module-program-data.ts`, c'est un changement bienvenu, à condition d'ajouter le test correspondant.

# Résumé de formation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un champ « Résumé » en HTML riche aux événements, éditable en
back-office et affiché dans le bandeau d'en-tête de la page publique de formation.

**Architecture:** Une colonne `summary_html` sur la table `events`, saisie via
l'éditeur Tiptap déjà présent dans le dépôt. Le formulaire d'administration reçoit
un sous-composant dédié qui porte les deux éditeurs riches (résumé et « À propos »,
ce dernier n'étant aujourd'hui éditable nulle part). La page publique de détail est
scindée en deux : le fichier de route garde la récupération des données, un
composant de présentation porte le rendu, ce qui permet à une nouvelle page
d'aperçu d'administration de réutiliser exactement le même affichage sur les
brouillons.

**Tech Stack:** Next.js 15 (App Router, React Server Components), TypeScript,
Supabase (PostgreSQL + client admin à service role), Zod v4, Tailwind CSS v4,
Vitest, éditeur `novel` / Tiptap.

**Spec source:** `docs/superpowers/specs/2026-08-06-formation-resume-design.md`

## Global Constraints

- Langue de toute chaîne visible par l'utilisateur : français.
- Nom de la colonne : `summary_html`. Nom du champ dans le formulaire et le schéma
  Zod : `summary_html`. Ne jamais l'abréger en `summary`.
- La colonne existante à rendre éditable s'appelle `long_description` (table
  `events`). Ne pas la confondre avec `long_description_html`, qui appartient à la
  table `formations` et n'est pas concernée par ce plan.
- Toute colonne ajoutée est facultative : un événement sans résumé reste valide et
  n'affiche simplement pas le bloc.
- Une chaîne vide, `"<p></p>"` ou `"<p><br></p>"` renvoyée par l'éditeur est
  normalisée en `null` avant écriture en base.
- Le rendu HTML passe par `dangerouslySetInnerHTML`, conformément au motif déjà en
  place dans le dépôt. Ne pas introduire d'assainisseur : ce serait une exception
  isolée, et la surface d'écriture est réservée aux administratrices.
- Commandes de vérification : `pnpm test` (Vitest), `pnpm lint` (ESLint),
  `pnpm build` (Next.js).
- Numéro de migration : `00067`. La dernière en date est `00066_promo_codes_seed.sql`.
- Les références de lignes citées dans ce plan peuvent avoir bougé : l'arbre de
  travail contenait des modifications non commitées sur
  `src/app/(public)/formations/[slug]/page.tsx`, `src/app/globals.css` et
  `src/config/navigation.ts` au moment de la rédaction. Toujours repérer le code par
  son contenu, jamais par son numéro de ligne seul.

## File Structure

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/00067_event_summary.sql` | Créé. Ajoute `summary_html` à `events`. |
| `src/types/database.ts` | Modifié. Complète le type `Event` avec `long_description` et `summary_html`. |
| `src/validations/events.ts` | Modifié. Deux champs facultatifs dans `eventSchema`. |
| `src/app/(dashboard)/admin/evenements/actions.ts` | Modifié. Persiste les deux colonnes en création et en mise à jour. |
| `src/lib/html/strip.ts` | Créé. `stripHtml` et `truncate`, sans dépendance. |
| `src/lib/html/strip.spec.ts` | Créé. Tests des deux fonctions. |
| `src/app/(dashboard)/admin/evenements/_components/event-content-fields.tsx` | Créé. Les deux éditeurs riches, isolés du formulaire principal. |
| `src/app/(dashboard)/admin/evenements/_components/event-form.tsx` | Modifié. Branche le sous-composant, ajoute le bouton « Aperçu ». |
| `src/app/(public)/formations/[slug]/_components/event-detail.tsx` | Créé. Tout le rendu de la page de détail, extrait de la route. |
| `src/app/(public)/formations/[slug]/page.tsx` | Modifié. Ne garde que la récupération des données et les métadonnées. |
| `src/app/(public)/formations/[slug]/register-button.tsx` | Modifié. Nouvelle propriété `isPreview`. |
| `src/app/(dashboard)/admin/evenements/[id]/preview/page.tsx` | Créé. Aperçu administrateur, brouillons compris. |
| `src/app/(dashboard)/admin/evenements/actions.spec.ts` | Créé. Tests des deux actions serveur. |

---

### Task 1: Colonne, type, validation et persistance

**Files:**
- Create: `supabase/migrations/00067_event_summary.sql`
- Modify: `src/types/database.ts` (type `Event`)
- Modify: `src/validations/events.ts` (`eventSchema`)
- Modify: `src/app/(dashboard)/admin/evenements/actions.ts` (`createEvent`, `updateEvent`)
- Test: `src/app/(dashboard)/admin/evenements/actions.spec.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - Colonne SQL `events.summary_html TEXT NULL`.
  - Champs de type `Event` : `long_description: string | null`, `summary_html: string | null`.
  - Champs `eventSchema` : `summary_html?: string | null`, `long_description?: string | null`.
  - Fonction exportée depuis `src/app/(dashboard)/admin/evenements/actions.ts` :
    `export const normalizeRichText = (value: string | null | undefined): string | null`.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/00067_event_summary.sql` :

```sql
-- ─── Resume d'evenement ──────────────────────────────────────
-- Un troisieme niveau de lecture entre `description` (une phrase, texte brut)
-- et `long_description` (le texte long deja affiche plus bas dans la page).
-- Mis en forme, donc HTML : l'editeur du back-office produit des paragraphes,
-- des listes et du gras.
--
-- Facultative : les evenements deja publies restent valides sans reprise. Un
-- resume vide n'affiche aucun bloc, c'est la regle produit, la colonne peut
-- donc rester NULL indefiniment.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS summary_html TEXT;
```

- [ ] **Step 2: Compléter le type `Event`**

Dans `src/types/database.ts`, dans le type `Event`, juste après la ligne
`description: string | null;` :

```ts
  description: string | null;
  // Colonnes editoriales riches, rendues en HTML sur la page publique.
  long_description: string | null;
  summary_html: string | null;
```

- [ ] **Step 3: Écrire les tests d'action en échec**

Créer `src/app/(dashboard)/admin/evenements/actions.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: async () => ({ id: "admin-1", roles: ["admin"] }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createEvent, updateEvent, normalizeRichText } from "./actions";

/**
 * Chaine Supabase minimale : chaque methode renvoie la chaine, `single`
 * resout le resultat fourni, et l'objet est thenable pour les appels sans
 * `single` (le `update(...).eq(...)` de `updateEvent`).
 */
const createChain = (result: { data?: unknown; error?: unknown }) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "insert", "update"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const validInput = {
  title: "Formation allaitement",
  slug: "formation-allaitement",
  description: "Une phrase.",
  type: "online" as const,
  starts_at: "2026-09-01T09:00:00.000Z",
  ends_at: "2026-09-01T17:00:00.000Z",
  price_cents: 12000,
  currency: "eur",
  show_price: true,
  consultant_id: "11111111-1111-4111-8111-111111111111",
  is_published: false,
};

beforeEach(() => {
  mockFrom.mockReset();
});

describe("normalizeRichText", () => {
  it("renvoie null pour une valeur absente", () => {
    expect(normalizeRichText(null)).toBeNull();
    expect(normalizeRichText(undefined)).toBeNull();
  });

  it("renvoie null pour les coquilles vides produites par l'editeur", () => {
    expect(normalizeRichText("")).toBeNull();
    expect(normalizeRichText("   ")).toBeNull();
    expect(normalizeRichText("<p></p>")).toBeNull();
    expect(normalizeRichText("<p><br></p>")).toBeNull();
  });

  it("conserve un contenu reel", () => {
    expect(normalizeRichText("<p>Trois points cles</p>")).toBe(
      "<p>Trois points cles</p>",
    );
  });
});

describe("createEvent", () => {
  it("persiste summary_html et long_description", async () => {
    const chain = createChain({ data: { id: "event-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    const result = await createEvent({
      ...validInput,
      summary_html: "<p>Trois points cles</p>",
      long_description: "<p>Le programme detaille</p>",
    });

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        summary_html: "<p>Trois points cles</p>",
        long_description: "<p>Le programme detaille</p>",
      }),
    );
  });

  it("normalise un resume vide en null", async () => {
    const chain = createChain({ data: { id: "event-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    await createEvent({ ...validInput, summary_html: "<p></p>" });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ summary_html: null }),
    );
  });

  it("accepte un evenement sans resume", async () => {
    const chain = createChain({ data: { id: "event-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    const result = await createEvent(validInput);

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ summary_html: null, long_description: null }),
    );
  });
});

describe("updateEvent", () => {
  it("persiste summary_html et long_description", async () => {
    const chain = createChain({ data: { slug: "ancien-slug" } });
    mockFrom.mockReturnValue(chain);

    const result = await updateEvent("event-1", {
      ...validInput,
      summary_html: "<p>Resume mis a jour</p>",
      long_description: "<p>Programme mis a jour</p>",
    });

    expect(result.success).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        summary_html: "<p>Resume mis a jour</p>",
        long_description: "<p>Programme mis a jour</p>",
      }),
    );
  });
});
```

- [ ] **Step 4: Lancer les tests pour vérifier l'échec**

Run: `pnpm vitest run src/app/\(dashboard\)/admin/evenements/actions.spec.ts`
Expected: FAIL — `normalizeRichText` n'est pas exportée par `./actions`.

- [ ] **Step 5: Ajouter les champs au schéma Zod**

Dans `src/validations/events.ts`, dans l'objet passé à `z.object`, juste après
`description: z.string().optional().nullable(),` :

```ts
    description: z.string().optional().nullable(),
    summary_html: z.string().optional().nullable(),
    long_description: z.string().optional().nullable(),
```

- [ ] **Step 6: Implémenter `normalizeRichText` et la persistance**

Dans `src/app/(dashboard)/admin/evenements/actions.ts`, ajouter la fonction juste
après le bloc `requireAdmin` :

```ts
/**
 * L'editeur riche ne renvoie jamais null : un champ vide vaut "", "<p></p>"
 * ou "<p><br></p>" selon le chemin de saisie. On ramene ces coquilles a null
 * pour que la page publique teste simplement la presence de la valeur.
 */
export const normalizeRichText = (
  value: string | null | undefined,
): string | null => {
  if (!value) return null;
  const withoutMarkup = value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
  return withoutMarkup.trim() === "" ? null : value;
};
```

Dans l'objet passé à `.insert(...)` de `createEvent`, après
`description: parsed.data.description ?? null,` :

```ts
      description: parsed.data.description ?? null,
      summary_html: normalizeRichText(parsed.data.summary_html),
      long_description: normalizeRichText(parsed.data.long_description),
```

Ajouter les deux mêmes lignes dans l'objet passé à `.update(...)` de `updateEvent`,
au même endroit.

- [ ] **Step 7: Lancer les tests pour vérifier le succès**

Run: `pnpm vitest run src/app/\(dashboard\)/admin/evenements/actions.spec.ts`
Expected: PASS — sept tests.

- [ ] **Step 8: Appliquer la migration en local et vérifier la compilation**

Run: `pnpm exec supabase db push` puis `pnpm lint`
Expected: migration appliquée, aucune erreur ESLint.

Si `supabase db push` n'est pas disponible dans l'environnement, exécuter le contenu
du fichier SQL directement sur la base de développement et le signaler dans le
message de revue.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/00067_event_summary.sql src/types/database.ts src/validations/events.ts "src/app/(dashboard)/admin/evenements/actions.ts" "src/app/(dashboard)/admin/evenements/actions.spec.ts"
git commit -m "feat(evenements): colonne summary_html et persistance des champs riches"
```

---

### Task 2: Utilitaires HTML et métadonnées de référencement

**Files:**
- Create: `src/lib/html/strip.ts`
- Create: `src/lib/html/strip.spec.ts`
- Modify: `src/app/(public)/formations/[slug]/page.tsx` (`generateMetadata`)

**Interfaces:**
- Consumes: la colonne `summary_html` de la tâche 1.
- Produces, depuis `src/lib/html/strip.ts` :
  - `export const stripHtml = (html: string | null | undefined): string`
  - `export const truncate = (text: string, max: number): string | undefined`

- [ ] **Step 1: Écrire les tests en échec**

Créer `src/lib/html/strip.spec.ts` :

```ts
import { describe, it, expect } from "vitest";
import { stripHtml, truncate } from "./strip";

describe("stripHtml", () => {
  it("retire les balises et garde le texte", () => {
    expect(stripHtml("<p>Bonjour <strong>toi</strong></p>")).toBe("Bonjour toi");
  });

  it("insere une espace entre deux blocs colles", () => {
    expect(stripHtml("<li>Un</li><li>Deux</li>")).toBe("Un Deux");
  });

  it("decode les entites courantes", () => {
    expect(stripHtml("<p>Pr&eacute;natal &amp; postnatal&nbsp;: d&#233;tails</p>")).toBe(
      "Prénatal & postnatal : détails",
    );
  });

  it("normalise les espaces et les retours a la ligne", () => {
    expect(stripHtml("<p>Deux\n\n  espaces</p>")).toBe("Deux espaces");
  });

  it("renvoie une chaine vide pour une entree absente", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
    expect(stripHtml("<p></p>")).toBe("");
  });
});

describe("truncate", () => {
  it("renvoie le texte tel quel s'il tient dans la limite", () => {
    expect(truncate("Formation allaitement", 40)).toBe("Formation allaitement");
  });

  it("coupe sur un mot entier et suffixe une ellipse", () => {
    expect(truncate("Formation allaitement pour les professionnelles", 22)).toBe(
      "Formation allaitement…",
    );
  });

  it("coupe brutalement si le premier mot depasse deja la limite", () => {
    expect(truncate("Anticonstitutionnellement", 10)).toBe("Anticonst…");
  });

  it("renvoie undefined pour un texte vide", () => {
    expect(truncate("", 40)).toBeUndefined();
    expect(truncate("   ", 40)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `pnpm vitest run src/lib/html/strip.spec.ts`
Expected: FAIL — le module `./strip` n'existe pas.

- [ ] **Step 3: Implémenter les deux fonctions**

Créer `src/lib/html/strip.ts` :

```ts
/**
 * Texte brut a partir d'un fragment HTML rédactionnel. Sert aux metadonnees
 * de referencement, jamais au rendu : on ne cherche pas a assainir, seulement
 * a extraire une phrase lisible.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&eacute;": "é",
  "&egrave;": "è",
  "&ecirc;": "ê",
  "&agrave;": "à",
  "&ccedil;": "ç",
  "&ocirc;": "ô",
  "&ugrave;": "ù",
  "&icirc;": "î",
  "&hellip;": "…",
  "&laquo;": "«",
  "&raquo;": "»",
};

export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return "";

  return html
    // Une balise vaut une frontiere de mot : sans cette espace, deux items de
    // liste colles donneraient "UnDeux".
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&[a-zA-Z]+;|&#\d+;/g,
      (entity) =>
        ENTITIES[entity.toLowerCase()] ??
        (entity.startsWith("&#")
          ? String.fromCharCode(Number(entity.slice(2, -1)))
          : entity),
    )
    .replace(/\s+/g, " ")
    .trim();
};

export const truncate = (text: string, max: number): string | undefined => {
  const clean = text.trim();
  if (clean === "") return undefined;
  if (clean.length <= max) return clean;

  // On garde max - 1 caracteres pour laisser la place a l'ellipse.
  const head = clean.slice(0, max - 1);

  // Si la coupe tombe pile sur une espace, le dernier mot est deja entier :
  // reculer jusqu'a l'espace precedente amputerait un mot pour rien.
  if (/\s/.test(clean.charAt(max - 1))) return `${head.trimEnd()}…`;

  const lastSpace = head.lastIndexOf(" ");
  const cut = lastSpace > 0 ? head.slice(0, lastSpace) : head;
  return `${cut.trimEnd()}…`;
};
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `pnpm vitest run src/lib/html/strip.spec.ts`
Expected: PASS — neuf tests.

- [ ] **Step 5: Utiliser le résumé comme description de repli**

Dans `src/app/(public)/formations/[slug]/page.tsx`, ajouter l'import :

```ts
import { stripHtml, truncate } from "@/lib/html/strip";
```

Dans `generateMetadata`, remplacer la sélection et le retour. Le code actuel est :

```ts
  const { data } = await supabase
    .from("events")
    .select("title, description, thumbnail_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!data) return { title: "Événement introuvable" };
  return {
    title: data.title,
    description: data.description ?? undefined,
    openGraph: {
      title: data.title,
      description: data.description ?? undefined,
      type: "article",
      ...(data.thumbnail_url && { images: [{ url: data.thumbnail_url }] }),
    },
  };
```

Le remplacer par :

```ts
  const { data } = await supabase
    .from("events")
    .select("title, description, summary_html, thumbnail_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!data) return { title: "Événement introuvable" };

  // Le resume prend le relais quand la description courte n'est pas saisie :
  // mieux vaut une phrase extraite du contenu editorial qu'aucune metadonnee.
  const description =
    data.description ?? truncate(stripHtml(data.summary_html), 155);

  return {
    title: data.title,
    description,
    openGraph: {
      title: data.title,
      description,
      type: "article",
      ...(data.thumbnail_url && { images: [{ url: data.thumbnail_url }] }),
    },
  };
```

- [ ] **Step 6: Vérifier la compilation**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add src/lib/html/strip.ts src/lib/html/strip.spec.ts "src/app/(public)/formations/[slug]/page.tsx"
git commit -m "feat(formations): resume en description de repli pour le referencement"
```

---

### Task 3: Éditeurs riches dans le formulaire d'administration

**Files:**
- Create: `src/app/(dashboard)/admin/evenements/_components/event-content-fields.tsx`
- Modify: `src/app/(dashboard)/admin/evenements/_components/event-form.tsx`

**Interfaces:**
- Consumes: `eventSchema` étendu et les actions de la tâche 1 ; le composant
  existant `WysiwygEditor` de `src/components/editor/wysiwyg-editor.tsx`, dont
  l'interface est `{ initialContent?: string; onChange?: (html: string) => void;
  placeholder?: string }`.
- Produces:
  ```ts
  export type EventContentFieldsProps = {
    summaryHtml: string;
    longDescription: string;
    onChange: (field: "summary_html" | "long_description", html: string) => void;
  };
  export const EventContentFields = (props: EventContentFieldsProps) => JSX.Element;
  ```

- [ ] **Step 1: Créer le sous-composant**

Créer `src/app/(dashboard)/admin/evenements/_components/event-content-fields.tsx` :

```tsx
"use client";

import { Label } from "@/components/ui/label";
import { WysiwygEditor } from "@/components/editor/wysiwyg-editor";

/**
 * Les deux champs riches vivent hors d'`event-form` : l'editeur n'est pas
 * controle (`initialContent` une fois, puis `onChange`) alors que le
 * formulaire l'est entierement. Isoler le pont entre les deux modeles evite
 * de le disperser dans un fichier deja tres long.
 */
export type EventContentFieldsProps = {
  summaryHtml: string;
  longDescription: string;
  onChange: (field: "summary_html" | "long_description", html: string) => void;
};

export const EventContentFields = ({
  summaryHtml,
  longDescription,
  onChange,
}: EventContentFieldsProps) => (
  <>
    <div className="space-y-2">
      <Label>Résumé</Label>
      <p className="text-xs text-muted-foreground">
        Affiché dans le bandeau d’en-tête, sous la description. Restez bref :
        quelques lignes ou une courte liste.
      </p>
      <WysiwygEditor
        initialContent={summaryHtml}
        onChange={(html) => onChange("summary_html", html)}
        placeholder="Ce que la participante retient en 30 secondes…"
      />
    </div>

    <div className="space-y-2">
      <Label>À propos de cette formation</Label>
      <p className="text-xs text-muted-foreground">
        Le texte long affiché au milieu de la page publique.
      </p>
      <WysiwygEditor
        initialContent={longDescription}
        onChange={(html) => onChange("long_description", html)}
        placeholder="Programme, objectifs, public visé…"
      />
    </div>
  </>
);
```

- [ ] **Step 2: Brancher le sous-composant dans le formulaire**

Dans `src/app/(dashboard)/admin/evenements/_components/event-form.tsx` :

Ajouter l'import après celui de `Textarea` :

```tsx
import { EventContentFields } from "./event-content-fields";
```

Dans l'objet initial de `useState`, après `description: event?.description ?? "",` :

```tsx
    description: event?.description ?? "",
    summary_html: event?.summary_html ?? "",
    long_description: event?.long_description ?? "",
```

Dans `payload`, à l'intérieur de `handleSubmit`, après
`description: formData.description || null,` :

```tsx
      description: formData.description || null,
      summary_html: formData.summary_html || null,
      long_description: formData.long_description || null,
```

Dans le JSX, juste après le `</div>` qui ferme le bloc du champ `description`
(celui qui contient `<Textarea id="description" …>`) et avant le `</CardContent>`
qui suit :

```tsx
              <EventContentFields
                summaryHtml={formData.summary_html}
                longDescription={formData.long_description}
                onChange={(field, html) =>
                  setFormData((p) => ({ ...p, [field]: html }))
                }
              />
```

- [ ] **Step 3: Vérifier la compilation**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: aucune erreur. Si `tsc` signale que `summary_html` n'existe pas sur
`Event`, c'est que l'étape 2 de la tâche 1 n'a pas été appliquée : la corriger avant
de continuer.

- [ ] **Step 4: Vérifier à la main dans le navigateur**

Run: `pnpm dev`, puis ouvrir `/admin/evenements`, choisir un événement, cliquer
« Modifier ».
Expected: sous la description, deux éditeurs riches avec leur barre d'outils.
Saisir un résumé de deux lignes avec une liste à puces, enregistrer, recharger la
page : le contenu est toujours là.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/evenements/_components/event-content-fields.tsx" "src/app/(dashboard)/admin/evenements/_components/event-form.tsx"
git commit -m "feat(admin): editeurs riches pour le resume et le texte long d'un evenement"
```

---

### Task 4: Extraire le rendu public et afficher le résumé

Cette tâche fait deux choses parce qu'elles touchent les mêmes lignes : découper le
fichier de route, et insérer le nouveau bloc. Les séparer imposerait de déplacer
deux fois le même code.

**Files:**
- Create: `src/app/(public)/formations/[slug]/_components/event-detail.tsx`
- Modify: `src/app/(public)/formations/[slug]/page.tsx`
- Modify: `src/app/(public)/formations/[slug]/register-button.tsx`

**Interfaces:**
- Consumes: `summary_html` en base (tâche 1), `stripHtml` / `truncate` déjà utilisés
  dans `generateMetadata` (tâche 2).
- Produces, depuis `_components/event-detail.tsx` :
  ```ts
  export type EventDetailConsultant = {
    slug: string;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;

  export type EventDetailProps = {
    event: Record<string, unknown> & {
      id: string;
      title: string;
      slug: string;
      description: string | null;
      summary_html: string | null;
      long_description: string | null;
      type: "online" | "in_person" | "hybrid";
      starts_at: string;
      ends_at: string;
      location: string | null;
      max_participants: number | null;
      price_cents: number;
      currency: string;
      show_price: boolean;
      thumbnail_url: string | null;
    };
    consultant: EventDetailConsultant;
    isAlreadyRegistered: boolean;
    isFullyBooked: boolean;
    registrationsCount: number;
    isAuthenticated: boolean;
    awaitingRegistration: boolean;
    isPreview?: boolean;
  };

  export const EventDetail = (props: EventDetailProps) => JSX.Element;
  ```
- Produces, depuis `register-button.tsx` : la propriété facultative
  `isPreview?: boolean` ajoutée aux propriétés existantes.

- [ ] **Step 1: Créer le composant de présentation**

Créer `src/app/(public)/formations/[slug]/_components/event-detail.tsx`.

Y déplacer, sans les modifier, depuis `page.tsx` :
- les fonctions `formatPrice`, `formatDuration`, `categorizeEvent` ;
- le type `EventCategory` ;
- la constante `HIGHLIGHTS` ;
- les imports qu'elles utilisent (`Image`, `Link`, `Card`, `CardContent`, `Badge`,
  les icônes `lucide-react`, `format` et `fr` de `date-fns`, les constantes de
  `@/config/formations`, `RegisterButton`, `RegistrationReconciler`) ;
- tout le bloc `return ( … )` de `EventDetailPage`, ainsi que les variables locales
  purement dérivées qu'il consomme : `consultantName`, `typeLabel`, `TypeIcon`,
  `categoryLabel`, `categoryColor`, `duration`, `isFree`, `isMultiDay`, `isPast`,
  `spotsLeft`.

Ne pas y déplacer : les appels Supabase, `getSessionUser`, `notFound`, `redirect`,
`generateMetadata`. Ils restent dans la route.

Le fichier commence par la déclaration des types de l'encadré « Produces » ci-dessus,
puis :

```tsx
export const EventDetail = ({
  event,
  consultant,
  isAlreadyRegistered,
  isFullyBooked,
  registrationsCount,
  isAuthenticated,
  awaitingRegistration,
  isPreview = false,
}: EventDetailProps) => {
  const consultantName = consultant?.profiles
    ? `${consultant.profiles.first_name ?? ""} ${consultant.profiles.last_name ?? ""}`.trim()
    : "Consultante";

  const typeLabel =
    event.type === "online"
      ? "En ligne"
      : event.type === "in_person"
        ? "Présentiel"
        : "Hybride";

  const TypeIcon =
    event.type === "online" ? Video : event.type === "in_person" ? MapPin : Users;

  const { label: categoryLabel, color: categoryColor } = categorizeEvent(event.title);
  const duration = formatDuration(event.starts_at, event.ends_at);
  const isFree = event.price_cents === 0;
  const isPast = new Date(event.ends_at) < new Date();
  const isMultiDay =
    new Date(event.ends_at).getDate() !== new Date(event.starts_at).getDate();
  const spotsLeft = event.max_participants
    ? event.max_participants - registrationsCount
    : null;

  return (
    // Le JSX est copie mot pour mot depuis le `return` de `EventDetailPage`,
    // sans reecriture ni reindentation, hormis les deux substitutions
    // decrites juste apres.
  );
};
```

Il s'agit d'un déplacement, pas d'une réécriture : copier le JSX tel quel, ne rien
renommer, ne rien reformater. Toute divergence visuelle à l'étape 3 signifierait que
la copie a été altérée.

Dans le JSX déplacé, remplacer l'unique appel à `<RegisterButton … />` par la même
balise avec une propriété de plus, `isPreview={isPreview}`, et remplacer
`isAuthenticated={!!user}` par `isAuthenticated={isAuthenticated}`.

- [ ] **Step 2: Réduire la route à la récupération des données**

Dans `src/app/(public)/formations/[slug]/page.tsx`, supprimer tout ce qui a été
déplacé, y compris les imports devenus inutiles, et remplacer le `return` de
`EventDetailPage` par :

```tsx
  return (
    <EventDetail
      event={event}
      consultant={consultant}
      isAlreadyRegistered={isAlreadyRegistered}
      isFullyBooked={isFullyBooked}
      registrationsCount={registrationsCount}
      isAuthenticated={!!user}
      awaitingRegistration={!!awaitingRegistration}
    />
  );
```

Le fichier conserve : `generateMetadata`, la requête Supabase, la redirection
`external_url`, les deux requêtes d'inscription, et les variables
`registrationsCount`, `isAlreadyRegistered`, `isFullyBooked`, `consultant`,
`awaitingRegistration`. Ajouter l'import :

```tsx
import { EventDetail } from "./_components/event-detail";
```

Le cast en ligne du consultant est remplacé par le type partagé :

```tsx
  const consultant = event.consultants as unknown as EventDetailConsultant;
```

`EventDetailConsultant` est importé depuis `./_components/event-detail`, avec
`EventDetail`. Supprimer l'objet littéral qui servait de cast auparavant.

- [ ] **Step 3: Vérifier la non-régression avant d'ajouter quoi que ce soit**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm build`
Expected: aucune erreur.

Puis `pnpm dev` et ouvrir une page de formation publiée.
Expected: la page est visuellement identique à avant l'extraction.

- [ ] **Step 4: Commit de l'extraction, seule**

```bash
git add "src/app/(public)/formations/[slug]/_components/event-detail.tsx" "src/app/(public)/formations/[slug]/page.tsx"
git commit -m "refactor(formations): extraire le rendu de la page de detail"
```

- [ ] **Step 5: Ajouter le bouton d'inscription en mode aperçu**

Dans `src/app/(public)/formations/[slug]/register-button.tsx`, ajouter
`isPreview?: boolean;` au type des propriétés, la déstructurer avec la valeur par
défaut `false`, et placer en tout début de corps de composant :

```tsx
  if (isPreview) {
    return (
      <Button className="w-full" disabled>
        Inscription (désactivée en aperçu)
      </Button>
    );
  }
```

Si `Button` n'est pas déjà importé dans ce fichier, ajouter
`import { Button } from "@/components/ui/button";`.

- [ ] **Step 6: Insérer le bloc résumé dans le bandeau**

Dans `_components/event-detail.tsx`, repérer le bloc commenté
`{/* Short description */}` et insérer juste après sa fermeture, avant le bloc
`{/* Quick meta */}` :

```tsx
              {/* Résumé — troisième niveau de lecture, mis en forme */}
              {event.summary_html && (
                <div
                  className="mt-5 max-w-2xl border-l-2 border-primary-red/60 pl-4
                             text-[0.95rem] leading-relaxed text-white/70
                             [&_p]:mb-2 [&_p:last-child]:mb-0
                             [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                             [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
                             [&_strong]:font-semibold [&_strong]:text-white
                             [&_em]:not-italic [&_em]:text-accent-honey-soft
                             [&_a]:underline [&_a]:underline-offset-2
                             [&_h1]:hidden [&_h2]:hidden [&_h3]:hidden"
                  dangerouslySetInnerHTML={{ __html: event.summary_html }}
                />
              )}
```

Trois choix de forme, à ne pas « corriger » sans raison :
- filet vertical plutôt qu'encadré, pour ne pas emboîter une surface dans une
  surface déjà pleine ;
- `em` en miel sans italique, parce qu'un italique clair décroche sur le fond
  coloré du bandeau ;
- titres masqués, parce que l'éditeur autorise H1 à H3 et qu'un titre entrerait en
  concurrence avec le `h1` de la page.

- [ ] **Step 7: Vérifier le rendu**

Run: `pnpm dev`, ouvrir la formation dont le résumé a été saisi à la tâche 3.
Expected: le résumé apparaît sous la description courte, au-dessus de la ligne
date / durée / formatrice, avec un filet vertical à gauche. Les puces sont visibles.
Réduire la fenêtre à 375 px de large : le bloc reste lisible et ne déborde pas.
Ouvrir une formation sans résumé : aucun bloc, aucune espace vide en trop.

- [ ] **Step 8: Vérifier la compilation**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm test`
Expected: aucune erreur, tous les tests passent.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(public)/formations/[slug]/_components/event-detail.tsx" "src/app/(public)/formations/[slug]/register-button.tsx"
git commit -m "feat(formations): afficher le resume dans le bandeau d'en-tete"
```

---

### Task 5: Page d'aperçu d'administration

**Files:**
- Create: `src/app/(dashboard)/admin/evenements/[id]/preview/page.tsx`
- Modify: `src/app/(dashboard)/admin/evenements/_components/event-form.tsx`

**Interfaces:**
- Consumes: `EventDetail` et `EventDetailConsultant` de la tâche 4.
- Produces: la route `/admin/evenements/[id]/preview`.

- [ ] **Step 1: Créer la page d'aperçu**

Créer `src/app/(dashboard)/admin/evenements/[id]/preview/page.tsx` :

```tsx
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  EventDetail,
  type EventDetailConsultant,
  type EventDetailProps,
} from "@/app/(public)/formations/[slug]/_components/event-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("events")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: data ? `Aperçu — ${data.title}` : "Aperçu introuvable",
    robots: { index: false, follow: false },
  };
};

const EventPreviewPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;

  // Client admin et pas de filtre `is_published` : l'interet de l'apercu est
  // justement de voir un brouillon tel qu'il sera publie.
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select(
      `
      *,
      consultants (
        slug,
        profiles!consultants_id_fkey (
          first_name,
          last_name,
          avatar_url
        )
      )
    `,
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { count } = await supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "registered");

  const registrationsCount = count ?? 0;
  const consultant = event.consultants as unknown as EventDetailConsultant;

  return (
    <div className="-m-6">
      <div className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-primary-green/10 bg-accent-honey-soft px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/evenements">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <p className="text-sm font-medium text-primary-green">
            Aperçu — {event.is_published ? "publié" : "brouillon"}. Cette page
            n’est pas visible du public.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/admin/evenements/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Link>
        </Button>
      </div>

      <EventDetail
        event={event as EventDetailProps["event"]}
        consultant={consultant}
        isAlreadyRegistered={false}
        isFullyBooked={false}
        registrationsCount={registrationsCount}
        isAuthenticated={false}
        awaitingRegistration={false}
        isPreview
      />
    </div>
  );
};

export default EventPreviewPage;
```

La classe `-m-6` annule la gouttière du gabarit d'administration pour que le
bandeau d'en-tête aille bord à bord, comme en public. Si le gabarit
(`src/app/(dashboard)/layout.tsx` ou son enfant) applique une autre valeur que
`p-6`, ajuster la marge négative en conséquence.

- [ ] **Step 2: Ajouter le bouton « Aperçu » au formulaire**

Dans `src/app/(dashboard)/admin/evenements/_components/event-form.tsx`, dans la
barre d'actions, juste avant le bloc conditionnel
`{mode === "edit" && event?.is_published && (` qui porte le bouton « Voir » :

```tsx
          {mode === "edit" && event && (
            <Button type="button" variant="outline" asChild>
              <Link href={`/admin/evenements/${event.id}/preview`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Aperçu
              </Link>
            </Button>
          )}
```

Le bouton « Voir » existant reste tel quel : il pointe vers la page publique et
n'apparaît que sur un événement publié. « Aperçu » s'affiche aussi sur les
brouillons, c'est justement sa raison d'être.

- [ ] **Step 3: Vérifier**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm build`
Expected: aucune erreur.

Puis `pnpm dev` : ouvrir un événement **non publié** en modification, cliquer
« Aperçu ».
Expected: la page de détail s'affiche avec son résumé, précédée du bandeau
d'avertissement. Le bouton d'inscription est désactivé et porte la mention
« Inscription (désactivée en aperçu) ». Se déconnecter et appeler l'URL d'aperçu
directement : redirection vers `/connexion`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/admin/evenements/[id]/preview/page.tsx" "src/app/(dashboard)/admin/evenements/_components/event-form.tsx"
git commit -m "feat(admin): page d'apercu d'un evenement"
```

---

## Vérification finale

- [ ] `pnpm test` — tous les tests passent.
- [ ] `pnpm lint` — aucune erreur.
- [ ] `pnpm build` — la compilation aboutit.
- [ ] Un événement sans résumé s'affiche exactement comme avant.
- [ ] Un événement avec résumé l'affiche dans le bandeau, en public comme en aperçu.
- [ ] Le texte « À propos » est modifiable depuis l'administration et le changement
      se voit sur la page publique.
- [ ] La page d'aperçu refuse un visiteur non administrateur.

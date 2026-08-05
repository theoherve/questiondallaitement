# Éditeur d'article — blocs déplaçables et bibliothèque visible — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à l'éditeur d'article l'ergonomie de l'éditeur d'email : chaque bloc se saisit et se déplace à la souris, et la bibliothèque de blocs est visible sans avoir à la chercher.

**Architecture :** L'éditeur d'article (`WysiwygEditor`, Tiptap/novel) possède déjà une bibliothèque de blocs (`WysiwygSidebar`, catalogue + recherche + snippets) — elle est simplement **repliée par défaut**. Ce qui manque réellement, c'est le déplacement de blocs. Il est ajouté par une extension Tiptap qui greffe une poignée flottante sur ProseMirror, sans nouvelle dépendance : ProseMirror sait déjà déplacer une `NodeSelection` par glisser-déposer, il ne manque que la poignée qui la déclenche. Le clavier est couvert en parallèle, car une poignée à la souris exclut sinon toute personne qui n'en utilise pas.

**Tech Stack :** Tiptap 2.27 / ProseMirror, React 19, Next.js 16, Vitest (environnement `node`).

## Global Constraints

- **Aucune nouvelle dépendance npm.** `@tiptap/extension-drag-handle-react` n'est pas dans le projet et son statut de licence a changé plusieurs fois ; l'extension maison tient en ~140 lignes et ne dépend que de ce qui est déjà installé.
- Ne pas restructurer `wysiwyg-editor.tsx` (995 lignes) : ce plan y ajoute des lignes, il ne le découpe pas. Le nouveau code vit dans ses propres fichiers.
- L'éditeur est partagé par quatre écrans — blog, formations, replay-lives, snippets. Toute modification de `WysiwygEditor` doit rester rétro-compatible : nouvelles props optionnelles, valeurs par défaut identiques au comportement actuel.
- Vitest tourne en environnement `node`, sans DOM : seuls les helpers purs sont testés unitairement ; le reste est vérifié à la main, écran par écran.
- Le déplacement doit rester accessible au clavier (WCAG 2.1 — 2.1.1 « Clavier »).

---

## File Structure

**Créés :**
- `src/components/editor/drag-handle-extension.ts` — extension Tiptap + plugin ProseMirror de la poignée.
- `src/components/editor/drag-handle-geometry.ts` — **pur** : calcul de la position de la poignée et du bloc survolé.
- `src/components/editor/drag-handle-geometry.spec.ts` — tests.

**Modifiés :**
- `src/components/editor/wysiwyg-editor.tsx` — enregistrer l'extension, styles de la poignée, raccourcis clavier de déplacement.
- `src/components/editor/wysiwyg-sidebar.tsx` — entrée « Sondage » au catalogue.
- `src/app/(dashboard)/admin/blog/_components/blog-post-form.tsx` — ouvrir la bibliothèque par défaut.
- `src/app/globals.css` — styles de la poignée.

---

### Task 1: Poignée de déplacement des blocs

**Files:**
- Create: `src/components/editor/drag-handle-geometry.ts`
- Create: `src/components/editor/drag-handle-geometry.spec.ts`
- Create: `src/components/editor/drag-handle-extension.ts`
- Modify: `src/components/editor/wysiwyg-editor.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `handleOffset(nodeRect: Rect, containerRect: Rect, handleHeight: number): { top: number; left: number }` avec `type Rect = { top: number; left: number; height: number }`.
  - `DragHandle` — extension Tiptap, nom `dragHandle`.

- [ ] **Step 1: Écrire les tests de géométrie**

Créer `src/components/editor/drag-handle-geometry.spec.ts` :

```ts
import { describe, expect, it } from "vitest";
import { handleOffset } from "./drag-handle-geometry";

describe("handleOffset", () => {
  it("centre la poignée sur la première ligne du bloc", () => {
    const offset = handleOffset(
      { top: 200, left: 120, height: 24 },
      { top: 100, left: 100, height: 500 },
      16,
    );

    // 200 - 100 = 100 depuis le haut du conteneur, puis (24 - 16) / 2 = 4.
    expect(offset.top).toBe(104);
  });

  it("place la poignée dans la marge, à gauche du bloc", () => {
    const offset = handleOffset(
      { top: 200, left: 140, height: 24 },
      { top: 100, left: 100, height: 500 },
      16,
    );

    expect(offset.left).toBe(12);
  });

  it("ne sort jamais du conteneur par la gauche", () => {
    const offset = handleOffset(
      { top: 200, left: 100, height: 24 },
      { top: 100, left: 100, height: 500 },
      16,
    );

    expect(offset.left).toBe(0);
  });

  it("aligne la poignée en haut d'un bloc plus court qu'elle", () => {
    const offset = handleOffset(
      { top: 200, left: 120, height: 10 },
      { top: 100, left: 100, height: 500 },
      16,
    );

    expect(offset.top).toBe(100);
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `pnpm exec vitest run src/components/editor/drag-handle-geometry.spec.ts`
Expected: FAIL — `Failed to resolve import "./drag-handle-geometry"`.

- [ ] **Step 3: Implémenter la géométrie**

Créer `src/components/editor/drag-handle-geometry.ts` :

```ts
export type Rect = { top: number; left: number; height: number };

/** Largeur réservée à la poignée dans la marge gauche, en pixels. */
export const HANDLE_GUTTER = 28;

/**
 * Position de la poignée, en coordonnées relatives au conteneur de l'éditeur.
 *
 * Elle est posée dans la marge et non sur le bloc : à l'intérieur, elle
 * recouvrirait le texte de la première ligne et le curseur atterrirait dessus
 * au clic.
 */
export const handleOffset = (
  nodeRect: Rect,
  containerRect: Rect,
  handleHeight: number,
): { top: number; left: number } => {
  const relativeTop = nodeRect.top - containerRect.top;

  // Centrée sur la première ligne du bloc — pas sur le bloc entier : un
  // paragraphe de dix lignes verrait sinon sa poignée flotter au milieu, loin
  // du repère visuel que cherche l'œil.
  const centering = Math.max(0, (Math.min(nodeRect.height, 24) - handleHeight) / 2);

  return {
    top: relativeTop + centering,
    left: Math.max(0, nodeRect.left - containerRect.left - HANDLE_GUTTER),
  };
};
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm exec vitest run src/components/editor/drag-handle-geometry.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Écrire l'extension**

Créer `src/components/editor/drag-handle-extension.ts` :

```ts
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { handleOffset } from "./drag-handle-geometry";

const HANDLE_HEIGHT = 20;

/**
 * Remonte jusqu'au bloc de premier niveau contenant la position.
 *
 * On ne déplace que des blocs entiers : saisir un élément de liste isolément
 * produirait un document incohérent une fois lâché ailleurs.
 */
const topLevelPos = (view: EditorView, coords: { left: number; top: number }) => {
  const found = view.posAtCoords(coords);
  if (!found) return null;

  const resolved = view.state.doc.resolve(found.inside >= 0 ? found.inside : found.pos);
  if (resolved.depth === 0) return found.inside >= 0 ? found.inside : null;

  return resolved.before(1);
};

/**
 * Poignée de déplacement des blocs.
 *
 * ProseMirror sait déjà déplacer une sélection de nœud par glisser-déposer ;
 * il manque seulement de quoi la déclencher sans avoir à sélectionner le bloc
 * à la main. La poignée fait exactement ça — elle pose une `NodeSelection` puis
 * laisse le navigateur et ProseMirror faire le reste.
 */
export const DragHandle = Extension.create({
  name: "dragHandle",

  addProseMirrorPlugins() {
    let handle: HTMLElement | null = null;
    let currentPos: number | null = null;

    return [
      new Plugin({
        key: new PluginKey("dragHandle"),

        view(view) {
          const container = view.dom.parentElement;
          if (!container) return {};

          // Le conteneur porte le positionnement : sans lui, la poignée se
          // placerait par rapport à la page et dériverait au moindre scroll.
          container.style.position = "relative";

          handle = document.createElement("div");
          handle.className = "wysiwyg-drag-handle";
          handle.setAttribute("draggable", "true");
          handle.setAttribute("aria-hidden", "true");
          handle.innerHTML =
            '<svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">' +
            '<circle cx="3" cy="3" r="1.4"/><circle cx="9" cy="3" r="1.4"/>' +
            '<circle cx="3" cy="8" r="1.4"/><circle cx="9" cy="8" r="1.4"/>' +
            '<circle cx="3" cy="13" r="1.4"/><circle cx="9" cy="13" r="1.4"/>' +
            "</svg>";
          container.appendChild(handle);

          const onDragStart = (event: DragEvent) => {
            if (currentPos === null) return;

            const selection = NodeSelection.create(view.state.doc, currentPos);
            view.dispatch(view.state.tr.setSelection(selection));

            const slice = selection.content();
            view.dragging = { slice, move: true };

            const dom = view.nodeDOM(currentPos);
            if (dom instanceof HTMLElement && event.dataTransfer) {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setDragImage(dom, 0, 0);
            }
          };

          const onMouseMove = (event: MouseEvent) => {
            if (!handle) return;

            const pos = topLevelPos(view, {
              left: event.clientX,
              top: event.clientY,
            });

            if (pos === null) {
              handle.style.opacity = "0";
              currentPos = null;
              return;
            }

            const dom = view.nodeDOM(pos);
            if (!(dom instanceof HTMLElement)) return;

            currentPos = pos;
            const nodeRect = dom.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const offset = handleOffset(nodeRect, containerRect, HANDLE_HEIGHT);

            handle.style.top = `${offset.top}px`;
            handle.style.left = `${offset.left}px`;
            handle.style.opacity = "1";
          };

          const onMouseLeave = () => {
            if (handle) handle.style.opacity = "0";
          };

          handle.addEventListener("dragstart", onDragStart);
          container.addEventListener("mousemove", onMouseMove);
          container.addEventListener("mouseleave", onMouseLeave);

          return {
            destroy() {
              handle?.removeEventListener("dragstart", onDragStart);
              container.removeEventListener("mousemove", onMouseMove);
              container.removeEventListener("mouseleave", onMouseLeave);
              handle?.remove();
              handle = null;
            },
          };
        },
      }),
    ];
  },
});
```

- [ ] **Step 6: Ajouter les styles**

À la fin de `src/app/globals.css` :

```css
/* Poignée de déplacement des blocs de l'éditeur. Masquée par défaut : elle
   n'apparaît qu'au survol du bloc concerné, pour ne pas encombrer la page
   pendant la rédaction. */
.wysiwyg-drag-handle {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  color: rgb(26 64 64 / 0.45);
  cursor: grab;
  opacity: 0;
  transition: opacity 120ms ease, background-color 120ms ease;
}

.wysiwyg-drag-handle:hover {
  background-color: rgb(26 64 64 / 0.08);
  color: rgb(26 64 64 / 0.8);
}

.wysiwyg-drag-handle:active {
  cursor: grabbing;
}
```

- [ ] **Step 7: Enregistrer l'extension et réserver la marge**

Dans `src/components/editor/wysiwyg-editor.tsx` :

1. Ajouter `import { DragHandle } from "./drag-handle-extension";`
2. Ajouter `DragHandle,` au tableau `extensions`, après `Placeholder.configure(...)`.
3. Sur le conteneur qui enveloppe `EditorContent`, ajouter la classe `pl-8` pour dégager la marge où la poignée se pose (sinon elle chevauche le texte sur les écrans étroits).

- [ ] **Step 8: Ajouter le déplacement au clavier**

Toujours dans `src/components/editor/wysiwyg-editor.tsx`, ajouter à `extensions` une extension locale déclarée juste avant le tableau :

```ts
/**
 * Déplacement d'un bloc au clavier.
 *
 * La poignée ne sert qu'à la souris : sans équivalent clavier, réordonner un
 * article deviendrait impossible pour qui n'en utilise pas. Alt+↑ / Alt+↓ sont
 * les raccourcis attendus — ce sont ceux de Notion et de VS Code.
 */
const MoveBlockShortcuts = Extension.create({
  name: "moveBlockShortcuts",
  addKeyboardShortcuts() {
    const move = (direction: -1 | 1) => () => {
      const { state, view } = this.editor;
      const { $from } = state.selection;
      if ($from.depth === 0) return false;

      const from = $from.before(1);
      const node = state.doc.nodeAt(from);
      if (!node) return false;

      const to = from + node.nodeSize;
      const target = direction === -1 ? from : to;
      const sibling =
        direction === -1
          ? state.doc.resolve(from).nodeBefore
          : state.doc.resolve(to).nodeAfter;
      if (!sibling) return false;

      const insertAt =
        direction === -1 ? target - sibling.nodeSize : target + sibling.nodeSize;

      const tr = state.tr.delete(from, to).insert(
        direction === -1 ? insertAt : insertAt - node.nodeSize,
        node,
      );
      view.dispatch(tr.scrollIntoView());
      return true;
    };

    return { "Alt-ArrowUp": move(-1), "Alt-ArrowDown": move(1) };
  },
});
```

Nécessite `import { Extension } from "@tiptap/core";` en haut du fichier s'il n'y est pas déjà, puis `MoveBlockShortcuts,` dans `extensions`.

- [ ] **Step 9: Vérifier**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: tout au vert.

Run: `pnpm dev`, ouvrir `/admin/blog/nouveau` et vérifier :
1. Au survol d'un paragraphe, la poignée apparaît dans la marge gauche, alignée sur sa première ligne.
2. Glisser la poignée déplace le bloc entier, et le lâcher entre deux autres blocs l'y insère.
3. Un titre, une liste, un encadré et un bouton CTA se déplacent aussi bien qu'un paragraphe.
4. Alt+↑ / Alt+↓ déplacent le bloc contenant le curseur.
5. Vérifier les trois autres écrans qui utilisent l'éditeur — `/admin/formations`, `/admin/replay-lives`, `/admin/parametres` (snippets) — pour s'assurer que rien n'y est cassé.

- [ ] **Step 10: Commit**

```bash
git add src/components/editor/drag-handle-extension.ts src/components/editor/drag-handle-geometry.ts src/components/editor/drag-handle-geometry.spec.ts src/components/editor/wysiwyg-editor.tsx src/app/globals.css
git commit -m "feat(editeur): poignee de deplacement des blocs et raccourcis clavier"
```

---

### Task 2: Bibliothèque de blocs visible et entrée « Sondage »

**Files:**
- Modify: `src/components/editor/wysiwyg-sidebar.tsx`
- Modify: `src/components/editor/wysiwyg-editor.tsx`
- Modify: `src/app/(dashboard)/admin/blog/_components/blog-post-form.tsx`

**Interfaces:**
- Consumes: `CATALOG`, `SidebarItem` (existants) ; nœud `surveyEmbed` du plan sondages.
- Produces: prop `defaultSidebarOpen?: boolean` sur `WysiwygEditor` (défaut `false`, comportement actuel préservé).

> **Constat préalable :** la bibliothèque de blocs existe déjà — `WysiwygSidebar` sert un catalogue de six catégories (texte, listes, mise en page, médias, encadrés, actions) avec recherche et snippets enregistrés. Elle est simplement fermée par défaut (`useState(false)`), et rien dans l'écran blog n'invite à l'ouvrir. Cette tâche la rend visible plutôt que d'en écrire une seconde.

- [ ] **Step 1: Rendre l'état initial de la bibliothèque paramétrable**

Dans `src/components/editor/wysiwyg-editor.tsx` :

1. Ajouter à l'interface de props :

```ts
  /** Ouvre la bibliothèque de blocs au montage. Fermée par défaut : les
   *  éditeurs courts (snippets, descriptions) n'ont pas la largeur pour elle. */
  defaultSidebarOpen?: boolean;
```

2. Ajouter `defaultSidebarOpen = false,` à la déstructuration des props, à côté de `sidebar = true,`.
3. Remplacer `const [sidebarOpen, setSidebarOpen] = useState(false);` par `const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);`

- [ ] **Step 2: Ouvrir la bibliothèque dans l'éditeur d'article**

Dans `src/app/(dashboard)/admin/blog/_components/blog-post-form.tsx`, sur le `<WysiwygEditor …>` de l'onglet Contenu, ajouter `defaultSidebarOpen`.

- [ ] **Step 3: Ajouter l'entrée « Sondage » au catalogue**

Dans `src/components/editor/wysiwyg-sidebar.tsx`, ajouter `BarChart3` à l'import `lucide-react`, puis une catégorie à la fin de `CATALOG` :

```tsx
  {
    id: "interactif",
    label: "Interactif",
    items: [
      {
        id: "survey-embed",
        label: "Sondage",
        description: "Formulaire ou graphique de résultats, mis à jour en direct",
        icon: <BarChart3 className="h-4 w-4" />,
        keywords: ["sondage", "quiz", "survey", "graphique", "resultats"],
        insert: (e) =>
          e
            .chain()
            .focus()
            .insertContent({
              type: "surveyEmbed",
              attrs: { slug: "", mode: "form" },
            })
            .run(),
      },
    ],
  },
```

> Dépend du nœud `surveyEmbed` livré par la Task 6 du plan `2026-08-04-sondages-integres-articles.md`. Si ce plan n'est pas encore exécuté, sauter cette étape et l'ajouter à ce moment-là — l'insertion échouerait silencieusement sur un nœud inconnu.

- [ ] **Step 4: Vérifier**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: aucune erreur.

Run: `pnpm dev`, puis sur `/admin/blog/nouveau` :
1. La bibliothèque est ouverte à droite au chargement.
2. La recherche « sond » remonte l'entrée Sondage, et le clic insère le bloc à la position du curseur.
3. Le bouton de la barre d'outils replie et déplie toujours la bibliothèque.
4. Sur mobile (fenêtre étroite), la bibliothèque reste dans son panneau `Sheet` et ne s'ouvre pas d'office.
5. `/admin/formations` et `/admin/replay-lives` gardent leur bibliothèque fermée au chargement.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/wysiwyg-sidebar.tsx src/components/editor/wysiwyg-editor.tsx "src/app/(dashboard)/admin/blog/_components/blog-post-form.tsx"
git commit -m "feat(editeur): bibliotheque de blocs ouverte sur l'article et entree sondage"
```

---

## Points volontairement hors périmètre

- **Découpage de `wysiwyg-editor.tsx`** (995 lignes) — le fichier gagnerait à être scindé, mais un refactor de l'éditeur partagé par quatre écrans mérite son propre chantier, pas un effet de bord de celui-ci.
- **Réordonnancement par glisser-déposer dans la bibliothèque elle-même** — le catalogue est statique et ordonné en code ; rien à déplacer.

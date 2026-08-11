# Mega menu "Livres" — design

## Contexte

Le header principal (`src/components/layout/header.tsx`) affiche déjà un lien "Livres" en texte simple dans `publicNav` (`/livres`). La page `/livres` (`src/app/(public)/livres/page.tsx`) présente les 3 livres de Carole Hervé (`src/config/books.ts`), chacun dans une `<section id={book.id}>`.

Un mega menu équivalent existe déjà pour "Accompagnements en ligne" (`src/components/layout/accompagnements-mega-menu.tsx`) : ouverture au survol/focus desktop, fermeture différée, `Escape`, ARIA (`aria-haspopup`, `aria-expanded`, `aria-controls`), dégradation gracieuse en lien simple.

## Objectif

Ajouter un mega menu "Livres" qui présente les 3 livres succinctement (couverture, titre, sous-titre, prix) et renvoie chacun vers son ancre sur `/livres`.

## Portée

- Desktop uniquement. Le menu mobile (overlay plein écran dans `header.tsx`) continue de mapper `publicNav` en liens simples — aucune modification nécessaire côté mobile, "Livres" y reste un lien texte classique.
- 3 livres, tous affichés (pas de sélection/featured).

## Composant : `BooksMegaMenu`

Nouveau fichier `src/components/layout/books-mega-menu.tsx`, calqué sur `AccompagnementsMegaMenu` :

- `"use client"`, mêmes mécanismes hover/focus (délai ouverture 80ms, fermeture 140ms), `Escape` referme et rend le focus au trigger, `aria-haspopup`/`aria-expanded`/`aria-controls`.
- Pas de props de données externes : `BOOKS` est statique (`src/config/books.ts`), importé directement dans le composant — pas de couche `nav-preview` ni de fetch serveur nécessaire (contrairement aux accompagnements dont les prix sont dynamiques).
- Panneau : grille à 3 colonnes égales (pas de colonne "vedette" — les 3 livres ont le même poids). Chaque carte :
  - couverture (`book.coverImage`, `next/image`)
  - `book.shortTitle`
  - `book.subtitle` tronqué (`line-clamp-2`)
  - `book.price`
  - lien vers `/livres#${book.id}`
- Pied de panneau : lien "Voir tous les livres" → `/livres`.
- Dégradation : si jamais `BOOKS` est vide, retomber sur un simple `<Link href="/livres">Livres</Link>` (garde la même robustesse que l'existant, même si en pratique `BOOKS` est toujours peuplé).

## Intégration

Dans `header.tsx`, remplacer le rendu du lien `publicNav` dont `href === "/livres"` par `<BooksMegaMenu triggerClassName="..." />`, sur le même modèle que le remplacement existant pour `/accompagnements` (lignes 84-100). Même classe de trigger que les autres liens nav pour rester visuellement cohérent.

## Hors périmètre

- Pas de changement sur `/livres` (les ancres `id={book.id}` existent déjà).
- Pas de changement sur le menu mobile.
- Pas de nouvelle donnée : réutilisation stricte de `BOOKS`.

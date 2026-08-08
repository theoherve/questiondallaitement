# Avis clients réels + avis Google — design

**Date** : 2026-08-08
**Statut** : validé, prêt pour plan d'implémentation

## Problème

Les témoignages affichés aujourd'hui sont des placeholders inventés pendant le développement, et ils vivent dans deux systèmes indépendants :

- [`src/app/(public)/_components/testimonial-carousel.tsx`](../../../src/app/(public)/_components/testimonial-carousel.tsx) — 6 témoignages en constante locale, carrousel 3 par page, utilisé une seule fois sur la page d'accueil.
- [`src/app/(public)/accompagnements/_components/sales/sales-testimonials.tsx`](../../../src/app/(public)/accompagnements/_components/sales/sales-testimonials.tsx) — grille de 3, alimentée par un tableau `testimonials` déclaré dans chaque `content/*.ts` de module et dans `pack-content.ts`.

Conséquences : un avis ne peut pas être réutilisé d'une page à l'autre, les deux rendus divergent visuellement, et rien ne relie le site aux avis Google réels de Carole.

## Objectif

Une source de vérité unique pour tous les avis, réels, affichés dans un rendu unique, avec les avis issus de Google identifiés comme tels et vérifiables d'un clic.

## Décisions structurantes

### Avis Google : recopie manuelle, note en direct

Les textes des avis Google sont recopiés à la main dans le fichier de données, avec un lien vers l'avis sur la fiche Google. La note globale et le nombre d'avis sont récupérés en direct via l'API Places.

La raison est réglementaire : l'API Places n'autorise pas la mise en cache du **texte** des avis, ne renvoie que ~5 avis choisis par Google, et impose un gabarit d'affichage (photo et nom de l'auteur, attribution). Recopier permet de choisir les avis pertinents et de les rendre dans le design du site. La note globale et le compte, eux, ne sont pas soumis à cette restriction et peuvent être mis en cache — ils sont donc récupérés en direct pour rester justes sans intervention.

### Aucun balisage de notation en JSON-LD

Tentation naturelle, à écarter : Google interdit le balisage d'avis auto-déclarés sur `Organization` et `LocalBusiness`, et les avis collectés sur un site tiers ne sont pas éligibles aux rich results. Le risque d'action manuelle est réel pour un gain nul.

Décision : aucun `AggregateRating` ni `Review` en JSON-LD dans le périmètre de ce travail. Une extension ultérieure pourra baliser en `Review` sur les `Product` (accompagnements), avec les avis directs uniquement.

### Un seul rendu de carte

Les avis Google et les avis directs partagent exactement la même carte, dans la typo et les couleurs du site. Un avis Google porte en pied de carte un badge discret `Ⓖ Avis Google ↗` qui pointe vers l'avis sur la fiche. Pas de style « capture d'écran Google » : la cohérence visuelle prime, le badge suffit à établir la vérifiabilité.

## Architecture

### 1. Données — `src/data/testimonials.ts`

Union discriminée, pour que le lien soit structurellement obligatoire sur un avis Google :

```ts
type TestimonialBase = {
  /** Slug stable, sert de clé React et de cible de déduplication. */
  id: string;
  author: string;              // "Margaux"
  detail: string;              // "Maman de Morgan, 3 mois"
  quote: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Slugs d'accompagnements concernés. Vide = avis générique. */
  topics: TestimonialTopic[];
  /** Éligible à la page d'accueil et au complément des pages de vente. */
  featured?: boolean;
  /** ISO. Optionnel, sert uniquement à l'ordre d'affichage. */
  date?: string;
};

export type Testimonial =
  | (TestimonialBase & { source: "direct" })
  | (TestimonialBase & { source: "google"; reviewUrl: string });
```

`TestimonialTopic` est l'union des clés de `MODULE_CONTENT` plus `"pack"`, de sorte qu'un topic mal orthographié est une erreur de compilation. À noter : `MODULE_CONTENT` est typé `Partial<Record<string, ModuleContent>>`, donc ses clés ne contraignent rien aujourd'hui — le type des topics doit être déclaré explicitement, pas dérivé de ce registre.

Le fichier expose aussi les valeurs de repli de la note Google (`GOOGLE_RATING_FALLBACK`, `GOOGLE_REVIEW_COUNT_FALLBACK`) et l'URL publique de la fiche.

### 2. Sélection — `src/lib/testimonials.ts`

Fonctions pures, sans I/O :

- `getTestimonialsForModule(topic, n = 3)` — les avis portant `topic` d'abord, puis les `featured` génériques pour compléter jusqu'à `n`, dédupliqués par `id`.
- `getFeaturedTestimonials(n = 6)` — page d'accueil.
- `getAllTestimonials(filters?: { topic?, source? })` — page `/avis`.

Un ordre déterministe est requis (pas de tri dépendant de l'ordre de déclaration seul) pour que le rendu statique soit stable entre deux builds.

### 3. Note Google — `src/lib/google-reviews.ts`

`getGoogleRating()` appelle Places API (New) :

```
GET https://places.googleapis.com/v1/places/{PLACE_ID}?fields=rating,userRatingCount
```

avec `next: { revalidate: 86400 }`. Variables d'environnement : `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID`.

En cas de clé absente, d'erreur réseau ou de réponse invalide, la fonction retourne les valeurs de repli du fichier de données. Elle ne lève jamais : une page ne doit pas tomber parce que Google est indisponible. Le texte des avis n'est jamais demandé à l'API.

### 4. Composants — `src/components/public/testimonials/`

- `testimonial-card.tsx` — carte unique, badge Google conditionnel.
- `testimonial-grid.tsx` — grille 3 colonnes, utilisée par les pages de vente et `/avis`.
- `testimonial-carousel.tsx` — déplacé depuis `(public)/_components/`, reçoit ses avis en props, ne déclare plus aucune donnée.
- `google-rating-badge.tsx` — server component, `★ 4,9 · 128 avis Google →` vers la fiche.

### 5. Points d'intégration

**Page d'accueil** ([`src/app/(public)/page.tsx`](../../../src/app/(public)/page.tsx)) : badge de note sous le hero, carrousel alimenté par `getFeaturedTestimonials()`. L'import de `./_components/testimonial-carousel` suit le déplacement du composant.

**Pages de vente module** ([`module-sales-page.tsx`](../../../src/app/(public)/accompagnements/_components/module/module-sales-page.tsx)) : `SalesTestimonials` prend désormais un `topic` et non plus un tableau. La branche `content.testimonials &&` disparaît : la condition de rendu porte désormais sur le résultat de la sélection, vide seulement si le fichier de données l'est aussi. L'entrée d'ancre `#temoignages` dans la navigation (ligne ~160) suit la même condition, pour qu'aucune ancre ne pointe vers une section absente.

**Page de vente pack** ([`pack-sales-page.tsx`](../../../src/app/(public)/accompagnements/_components/pack/pack-sales-page.tsx)) : même traitement avec `topic: "pack"`.

**Nettoyage** : le champ `testimonials` sort de `ModuleContent` ([`content/types.ts`](../../../src/app/(public)/accompagnements/_components/module/content/types.ts)) et des 8 fichiers `content/*.ts`, ainsi que de `pack-content.ts`. Le titre de section, aujourd'hui porté par chaque contenu, devient un défaut du composant surchargeable en prop — un module qui veut son propre titre le garde.

**Nouvelle page `/avis`** : `src/app/(public)/avis/page.tsx`. Filtre par thème via `searchParams` et liens, sans état client, pour rester rendue côté serveur et indexable. Métadonnées ciblant « avis consultante en allaitement ».

### 6. Tests

Vitest sur `src/lib/testimonials.ts` uniquement — c'est la seule logique qui peut se dégrader en silence :

- un topic avec assez d'avis dédiés n'est jamais complété par des génériques ;
- un topic sans avis dédié retourne `n` avis `featured` ;
- aucun doublon d'`id` quand un avis est à la fois dédié et `featured` ;
- moins de `n` avis disponibles au total retourne ce qui existe, sans erreur.

`getGoogleRating` n'est pas testé : sa seule logique est un repli sur erreur, et le test coûterait un mock de `fetch` pour une valeur faible.

## Dépendances côté contenu

Le code est livrable sans, mais la mise en ligne exige de Carole :

- le Place ID de sa fiche Google et une clé API Places ;
- les textes des avis Google à mettre en avant, avec l'URL de chaque avis ;
- les avis directs, avec l'autorisation de les publier et le niveau de nommage souhaité (prénom, prénom anonymisé).

Tant que le fichier de données est vide, les sections concernées ne s'affichent pas. Aucun placeholder n'est réintroduit sous quelque forme que ce soit : les 6 témoignages inventés de la page d'accueil sont supprimés définitivement.

## Hors périmètre

- Administration des avis en base avec écran back-office. Le fichier versionné suffit tant que Carole passe par une mise en production pour publier un avis ; le jour où la cadence l'exige, la migration se fera derrière les mêmes fonctions de sélection.
- Récupération automatique du texte des avis Google, interdite par les conditions de l'API.
- Balisage JSON-LD de notation, écarté ci-dessus.
- Collecte d'avis depuis l'espace client.

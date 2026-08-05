# Blog : suggestions en sidebar, encadré de conclusion, newsletter et sources

Date : 2026-08-05
Branche : `feat/blog-fin-article-suggestions`

## Problème

La page d'un article (`/blog/[slug]`) se termine aujourd'hui sur une grille
« Articles similaires » en trois cartes dont les titres, rendus en `font-serif`
à une taille pensée pour une pleine largeur, débordent et se font tronquer dans
des colonnes étroites — la section est illisible. Par ailleurs rien ne pousse la
lectrice vers la newsletter à la fin d'une lecture, et les références citées
dans les articles n'ont aucun emplacement dédié : elles finissent noyées dans le
corps du texte ou disparaissent.

## Objectifs

1. Une colonne latérale fixe (desktop) avec des suggestions d'articles liés.
2. Un encadré de conclusion / rappel, saisi par article dans l'admin, masqué
   quand il est vide.
3. Un bloc d'inscription newsletter en fin de chaque article, encadré ou non.
4. Une section « Références et sources » en bas de page, saisie par article.
5. Réparer l'illisibilité des suggestions.

## Décisions

| Sujet | Décision |
|---|---|
| Choix des suggestions | Hybride : jusqu'à 3 articles épinglés dans l'admin, complétés automatiquement |
| Grille du bas | Remplacée par la sidebar en desktop ; liste compacte en dessous de `lg` |
| Encadré de conclusion | Titre + texte simple (pas de rich text), rendu dans un encadré appuyé |
| Références | Un seul champ rich text |
| Stockage | 4 colonnes sur `blog_posts`, pas de table dédiée (relation 1-1 avec l'article) |

## Modèle de données

Migration `supabase/migrations/00064_blog_article_extras.sql` :

| Colonne | Type | Rôle |
|---|---|---|
| `conclusion_title` | `TEXT` | Titre de l'encadré. Vide → « À retenir » à l'affichage |
| `conclusion_text` | `TEXT` | Texte simple. Vide ou blanc → encadré non affiché |
| `references_html` | `TEXT` | HTML de l'éditeur. Vide → section non affichée |
| `related_post_ids` | `UUID[] NOT NULL DEFAULT '{}'` | Articles épinglés, 0 à 3, ordre conservé |

Toutes facultatives : les articles existants restent valides sans reprise
éditoriale. Les policies RLS de `blog_posts` portent sur la ligne, pas sur les
colonnes — rien à modifier.

`related_post_ids` est un tableau et non une table de jointure : au maximum
trois entrées, jamais interrogées en sens inverse, et l'ordre de saisie fait
partie de l'intention éditoriale.

## Résolution des suggestions

`src/lib/blog/related-posts.ts` expose deux morceaux séparés pour que la logique
soit testable sans base :

- `resolveRelatedPosts(current, candidates, limit)` — fonction pure. Ordre de
  priorité : articles épinglés (dans l'ordre saisi) → même catégorie → tags en
  commun (plus de tags partagés d'abord) → plus récents. Déduplique, exclut
  l'article courant, coupe à `limit` (4).
- `fetchRelatedPosts(supabase, post)` — une requête qui ramène les articles
  publiés candidats puis délègue le classement à la fonction pure.

Conséquence voulue : la sidebar n'est jamais vide, y compris sur un article sans
catégorie, sans tags et sans épingle.

## Page publique

`src/app/(public)/blog/[slug]/page.tsx` passe de `max-w-4xl` à une grille
`max-w-6xl` : `lg:grid-cols-[minmax(0,1fr)_18rem]`.

- **Aside** (`hidden lg:block`, `sticky top-24`) : « À lire aussi » — items
  compacts, vignette 64 px, titre `text-sm` sur 2 lignes, date. C'est la
  correction du bug : plus aucun titre en taille de titre dans une colonne
  étroite.
- **Ordre en fin d'article** : tags → encadré de conclusion (si contenu) → bloc
  newsletter (toujours) → références (si contenu) → carte autrice →
  suggestions en liste compacte, **uniquement en dessous de `lg`** (pas de
  doublon avec la sidebar).

## Composants

Dans `src/components/blog/` :

| Fichier | Rôle |
|---|---|
| `article-suggestions.tsx` | `variant: "sidebar" \| "inline"`, même données, deux densités |
| `article-conclusion.tsx` | Encadré ; rend le texte simple en paragraphes (sauts de ligne respectés) |
| `article-references.tsx` | Section « Références et sources » ; liens externes en `rel="noopener noreferrer"`, sans `nofollow` — ce sont de vraies citations |
| `article-newsletter-cta.tsx` | Bloc vert sombre réutilisant `NewsletterSignupForm` |

`NEWSLETTER_SOURCES` gagne la valeur `"article_blog"` (ajout additif : les
valeurs existantes partent telles quelles dans Brevo, les toucher casserait
l'historique). `SOURCE_LABELS` de l'admin marketing gagne l'entrée
correspondante, ainsi que `sondage` qui y manque aujourd'hui. Le texte du bloc
vit dans `src/config/newsletter.ts` avec le reste du copy newsletter.

## Admin

Quatrième onglet « Fin d'article » dans le formulaire d'article. Le formulaire
fait déjà 518 lignes : les nouveaux champs vivent dans
`src/app/(dashboard)/admin/blog/_components/post-ending-fields.tsx`, piloté par
les mêmes `formData` / `setFormData`.

Contenu de l'onglet :
1. Encadré de conclusion — titre (`Input`, placeholder « À retenir ») et texte
   (`Textarea`), avec la mention explicite que l'encadré n'apparaît pas s'il est
   vide.
2. Références et sources — `WysiwygEditor`.
3. Articles épinglés — sélection parmi les articles publiés, 3 maximum,
   réordonnable, avec l'indication que les emplacements restants sont complétés
   automatiquement.

`blogPostSchema` est étendu : `conclusion_title` et `conclusion_text` en texte
facultatif, `references_html` en texte facultatif, `related_post_ids` en tableau
d'UUID de 3 éléments maximum. Les actions `createBlogPost` / `updateBlogPost`
normalisent les chaînes vides en `null` comme elles le font déjà pour les autres
champs facultatifs.

## Tests

Vitest, à côté des specs existantes :

- `src/lib/blog/related-posts.spec.ts` — priorité des épinglés, ordre de saisie
  conservé, exclusion de l'article courant, déduplication, chaîne de repli
  catégorie → tags → récents, respect de la limite.
- `src/validations/blog.spec.ts` — champs facultatifs vides acceptés, plus de
  3 épingles refusé, UUID invalide refusé.

Puis `pnpm lint` et `pnpm build`.

## Hors périmètre

- Sommaire de l'article dans la sidebar (proposé, écarté pour ce lot).
- Balisage `schema.org` `citation` sur les références.
- Reprise éditoriale des articles existants.

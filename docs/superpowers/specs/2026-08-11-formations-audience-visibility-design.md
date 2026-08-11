# Visibilité de l'agenda formations pour les mamans

Date : 2026-08-11

## Problème

`/formations` liste à la fois des formations pour professionnels de santé et
du contenu pour les mamans (webinaires, ateliers mensuels). Rien sur le site
ne distingue les deux publics :

- Le lien de nav « Formations » est visible partout (header, footer, mobile,
  connecté ou non) — ce n'est pas un problème de découverte du lien lui-même.
- Mais la page elle-même se présente comme réservée aux pros : meta title
  « Formations professionnelles », h1 « Formez-vous en aiguisant votre
  regard clinique », paragraphe d'intro « Professionnels de la périnatalité,
  thérapeutes manuels, thérapeutes psychologiques... ». Une maman qui clique
  malgré tout atterrit sur une page qui lui dit implicitement qu'elle n'est
  pas au bon endroit, et repart avant même de voir la liste.
- Aucune donnée ne distingue une session « pour mamans » d'une session
  « pour pros » : seule la catégorie existe (`formation`, `webinaire`,
  `atelier_mensuel`, `masterclass`, `conference`, `e_learning`), qui décrit
  un format, pas un public — un webinaire peut viser des pros comme des
  mamans.
- Rien dans l'espace client ne pointe vers l'agenda : une maman connectée
  doit déjà savoir que ça existe pour aller chercher le lien dans le menu.

## Périmètre

Dans ce chantier :
1. Champ `audience` explicite sur `formations`.
2. Toggle d'audience sur `/formations`, en plus des filtres de catégorie
   existants.
3. Hero de `/formations` neutralisé (n'affiche plus « professionnel » par
   défaut).
4. CTA depuis le tableau de bord espace-client vers l'agenda filtré maman.

Hors périmètre :
- Renommage ou scission du lien de nav « Formations ».
- Recomposition plus large du hero pro (au-delà de retirer le cadrage
  pro-only).
- Outillage d'édition en masse dans l'admin.
- Rendre le filtre catégorie lui-même pilotable par URL (il reste en state
  local, comme aujourd'hui).

## Modèle de données

Nouveau type énuméré et colonne sur `formations`, sur le même principe que
`formation_category` (migration 00075) :

```sql
CREATE TYPE formation_audience AS ENUM ('maman', 'pro', 'both');

ALTER TABLE formations
  ADD COLUMN audience formation_audience NOT NULL DEFAULT 'both';

COMMENT ON COLUMN formations.audience IS
  'Public cible de la session, pilote le toggle sur /formations. '
  'maman = mamans uniquement, pro = professionnels de sante uniquement, '
  'both = les deux. Backfill des lignes existantes a ''both'' : aucune '
  'session existante ne doit disparaitre d''une vue sans revue manuelle.';
```

Le backfill des lignes existantes reste `'both'` — pas d'heuristique par
catégorie ou par titre. Une session existante mal classée par une heuristique
resterait invisible pour un public sans que personne ne s'en aperçoive ; en
partant de `'both'`, le pire cas est qu'une session reste visible partout
jusqu'à ce que Carole précise son audience dans l'admin.

## Admin

`formation-form.tsx` (`src/app/(dashboard)/admin/formations/_components/`)
reçoit un champ `audience` (select : Maman / Professionnels de santé / Les
deux), au même niveau que le champ catégorie déjà présent. Valeur par
défaut à la création : `both`, cohérente avec le backfill.

## Page publique `/formations`

### Hero

Le hero (`src/app/(public)/formations/page.tsx`) perd son cadrage pro-only :

- Meta title/description neutres (ex. « Formations, ateliers et
  webinaires »), sans mention exclusive aux professionnels.
- h1 et paragraphe d'intro réécrits pour ne plus présupposer le public
  (aujourd'hui : « Formez-vous en aiguisant votre regard clinique » +
  « Professionnels de la périnatalité... »).
- Ce hero reste unique, pas de variante par état du toggle (décidé : un seul
  hero neutre pour tout le monde, plus simple que du contenu conditionnel et
  suffisant puisque le toggle en dessous fait le tri).

Le reste du hero (stats de sessions à venir, légende des catégories) ne
change pas.

### Toggle d'audience

Dans `FormationsList` (`_components/formations-list.tsx`), un toggle à trois
états au-dessus ou à côté des pastilles de catégorie existantes — dimension
séparée (public visé) de la dimension catégorie (format) :

- Tout voir (défaut)
- Pour les mamans
- Pour les pros de santé

Comportement :

- Piloté par le search param `?audience=maman|pro` de l'URL. Absence de
  param = « Tout voir ». C'est ce qui permet le lien profond depuis
  l'espace client (`/formations?audience=maman`).
- Changer le toggle met à jour l'URL (`router.replace`, sans rechargement),
  pour que le lien reste partageable et que le bouton retour du navigateur
  fonctionne.
- Filtre une session dont `audience` vaut `'both'` : toujours visible, quel
  que soit l'état du toggle. Une session `'maman'` : visible seulement sur
  « Tout voir » et « Pour les mamans ». Symétrique pour `'pro'`.
- S'applique aux trois listes déjà affichées (sans date, à venir, passées),
  comme le filtre de catégorie aujourd'hui.
- Le filtre catégorie reste un state local (pas dans l'URL) : pas de
  changement sur ce point, seul le nouveau filtre audience est piloté par
  l'URL.

`FormationData` (le type exporté par `formations-list.tsx`) gagne un champ
`audience: "maman" | "pro" | "both"`, et la query Supabase dans `page.tsx`
sélectionne la nouvelle colonne.

## Espace client

Sur `src/app/(public)/espace-client/page.tsx`, une nouvelle carte dans la
section bento, au même niveau visuel que « Mes accompagnements récents » et
« Prochains rendez-vous » : « Prochains ateliers et webinaires », avec un CTA
vers `/formations?audience=maman`. Contenu minimal — un lien avec libellé
clair plutôt qu'une preview de sessions dupliquant `/formations` (pas de
nouvelle requête Supabase pour cette carte).

## Tests

- Filtrage `FormationsList` : une session `audience: "maman"` disparaît sous
  « Pour les pros de santé » et inversement ; `"both"` reste visible dans
  les trois états.
- Lecture du search param `audience` au chargement (état initial du toggle
  reflète l'URL).
- Migration : colonne créée, contrainte NOT NULL, défaut `'both'` appliqué
  aux lignes existantes.

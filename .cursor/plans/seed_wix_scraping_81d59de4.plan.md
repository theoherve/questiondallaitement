# Plan : Seed Wix → Supabase (mis à jour)

## Données validées

### URLs à utiliser (pas de scraping des participant-page, protégées par login)

- Home : https://www.caroleherve.fr/
- Événements (formations pro) : https://www.caroleherve.fr/formations
- Vente Pack : https://www.caroleherve.fr/pack-essentiel-allaitement
- Vente modules :  
  https://www.caroleherve.fr/page-d-accompagnement/mon-allaitement-au-fil-des-mois  
  https://www.caroleherve.fr/page-d-accompagnement/je-souhaite-sevrer-mon-bebe  
  https://www.caroleherve.fr/page-d-accompagnement/je-me-prepare-a-allaiter  
  https://www.caroleherve.fr/page-d-accompagnement/les-urgences-de-allaitement  
  https://www.caroleherve.fr/page-d-accompagnement/la-diversification-de-mon-bebe-allaite  
  https://www.caroleherve.fr/page-d-accompagnement/mon-allaitement-des-premiers-jours  
  https://www.caroleherve.fr/page-d-accompagnement/je-reprends-une-activite-professionnelle  
  https://www.caroleherve.fr/page-d-accompagnement/mon-bebe-ne-fait-pas-ses-nuits
- Livres : https://www.caroleherve.fr/livres
- Médias & conférences : https://www.caroleherve.fr/medias-conferences
- À propos : https://www.caroleherve.fr/a-propos

Les pages `participant-page/*` et `members-area/my/challenges` sont derrière authentification : pas d’extraction du détail des formations, uniquement les pages publiques ci‑dessus.

### Prix des programmes (formations en ligne) → `formations`

| Titre | price_cents | slug (exemple) |
|-------|-------------|----------------|
| Pack - L'essentiel de l'allaitement | 51900 | pack-essentiel-allaitement |
| Les urgences de l'allaitement | 2700 | les-urgences-allaitement |
| Mon bébé ne fait pas ses nuits | 9700 | mon-bebe-ne-fait-pas-ses-nuits |
| Tous les autres (8 modules) | 6700 | (slug dérivé du titre) |

Autres programmes à 67 € : Je me prépare à allaiter, Mon allaitement des premiers jours, Mon allaitement au fil des mois, Je reprends une activité professionnelle, Je souhaite sevrer mon bébé, La diversification de mon bébé allaité.

### Types de consultation → `consultation_types`

D’après le menu du site (Cabinet / visio) :  
Consultation prénatale, Consultation d'allaitement, Reprise du travail, Diversification alimentaire, Sommeil du tout-petit, Sevrage, Troubles alimentaires.  
Durée : non précisée sur le site → mettre 60 min par défaut. Prix : à laisser à 0 ou à renseigner manuellement plus tard.

### Événements (formations pro) → `events`

Source : https://www.caroleherve.fr/formations  
Exemples visibles dans les résultats de recherche : « Formation : le sommeil du tout petit et du jeune enfant » (mar. 24 févr., visio), « EDBN - Allaitement : les indispensables » (jeu. 26 févr.), « EDBN - Animer un atelier d'allaitement » (ven. 06 mars).  
Créer des événements type `online`, avec `starts_at` / `ends_at` placeholder ou à partir des dates si on les extrait. Prix : 0 ou à renseigner.

### Livres / Médias / À propos → `platform_settings`

- `about_page` : contenu texte + engagement (À propos).
- `books_page` : liste des livres (L’allaitement pour les nuls 24,95€, Mon allaitement sur mesure 18,90€, Choisir d’allaiter 12,50€, contributions).
- `media_conferences_page` : titres, liens, « Vous m’avez peut‑être vue ou entendue ici », sujets de conférences.

### Consultante (Carole Hervé)

- `profiles` + `consultants` : first_name Carole, last_name Hervé, slug `carole-herve`, bio depuis À propos (IBCLC depuis 2011, 1000 mères/an, engagement, parcours).  
- Un `consultant_id` fixe est nécessaire : créé via Auth + profile + consultant avant d’insérer le reste. Pour `seed.sql`, utiliser un UUID constant (ex. variable ou placeholder) à lier à un utilisateur créé manuellement ou par script.

## Format de sortie

- **Un seul fichier** : `supabase/seed.sql`.

## Ordre d’exécution dans seed.sql

1. **Consultant** : insertion dans `profiles` et `consultants` en supposant qu’un utilisateur Auth existe déjà avec l’UUID choisi (ou documenter la création de l’user en amont).  
2. **consultation_types** (7 types, même `consultant_id`).  
3. **formations** (9 lignes : 1 pack + 8 modules), avec `price_cents` et slugs ci‑dessus.  
4. **formation_sections** (optionnel) : pour le Pack, 7 sections type « Je me prépare à allaiter », « Mon allaitement des premiers jours », etc. ; pour les modules, 1 section par formation ou omis.  
5. **events** (formations pro/conférences) : quelques lignes avec dates placeholder ou extraites.  
6. **platform_settings** : clés `about_page`, `books_page`, `media_conferences_page` (JSON).

## Prochaines étapes (implémentation)

1. Rédiger `supabase/seed.sql` avec un UUID consultante fixe (ex. `SEED_CONSULTANT_ID` en commentaire ou à remplacer).  
2. Documenter dans le README ou un fichier dédié : « Avant d’exécuter le seed, créer l’utilisateur Auth (email consultante) avec cet UUID, ou exécuter un script qui crée l’user puis applique le seed. »  
3. Optionnel : script Playwright pour extraire les textes longs (descriptions, about, livres) depuis les URLs listées et les injecter dans le SQL ; sinon, utiliser les textes déjà disponibles (recherche web / copier-coller) pour remplir `description`, `short_description`, et les valeurs JSON de `platform_settings`.

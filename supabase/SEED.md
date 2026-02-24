# Seed data (supabase/seed.sql)

Ce seed alimente la base avec les données issues de la migration Wix (consultante Carole Hervé, programmes, types de consultation, événements, pages À propos / Livres / Médias).

## Données Wix (scraping des formations, optionnel)

Pour (re)générer la structure des formations depuis le site Wix (sections + étapes par formation), exécuter le script Playwright suivant. Il produit `wix-formations-full.json` à la racine du projet, utile pour aligner `formation_sections` / contenu avec Wix.

1. **Prérequis** : Playwright installé (`pnpm add -D playwright` si besoin), navigateurs Playwright (`pnpm exec playwright install`).
2. **Lancer le script** :
   ```bash
   pnpm exec tsx scripts/migration/scrape-wix-formations.ts wix-formations-full.json
   ```
3. Une fenêtre Chromium s’ouvre sur la page « À propos » du site. **Connecte-toi manuellement** dans cette fenêtre (menu Se connecter, etc.), puis navigue vers l’espace membres (`/members-area/my/challenges`). Dès que tu es sur cette URL, le script reprend seul et scrape les formations.
4. La session est sauvegardée dans `wix-auth-state.json` ; les prochains runs peuvent réutiliser cette session sans se reconnecter (tant qu’elle reste valide côté Wix).

Le fichier `wix-formations-full.json` peut servir de référence pour mettre à jour `scripts/migration/wix-formations.ts` ou le contenu du seed (`formation_sections`, etc.) si tu veux rester aligné avec Wix.

---

## Avant d’exécuter le seed

Le seed insère un **profil** et un **consultant** dont l’`id` doit correspondre à un utilisateur existant dans **Supabase Auth**. Sans cela, l’insertion dans `profiles` échouera (contrainte FK vers `auth.users`).

**Option A – Créer l’utilisateur avec l’UUID du seed**

1. Utiliser l’API Auth Admin (service role) pour créer l’utilisateur avec le même UUID que dans le seed :
   - UUID utilisé dans le seed : `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`
   - Exemple (Node avec `@supabase/supabase-js`) :
     ```ts
     await supabase.auth.admin.createUser({
       id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
       email: 'carole@questiondallaitement.fr',
       password: 'votre-mot-de-passe-securise',
       email_confirm: true,
     });
     ```
2. Puis exécuter le seed (voir ci‑dessous).

**Option B – Créer l’utilisateur dans le Dashboard**

1. Dans Supabase : **Authentication** → **Add user** → créer un utilisateur (email conseillé : `carole@questiondallaitement.fr`).
2. Récupérer l’**User UID** (UUID) de cet utilisateur.
3. Dans `supabase/seed.sql`, remplacer **toutes** les occurrences de `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` par cet UUID.
4. Exécuter le seed.

## Exécution du seed

### Sans Docker (recommandé : projet Supabase hébergé)

Tu peux tout faire sans Docker en utilisant ton projet Supabase en ligne.

1. **Migrations** (schéma de la base) :
   ```bash
   pnpm db:push
   ```
   (le projet doit être lié : `pnpm db:link` une première fois si besoin.)

2. **Seed** (données initiales) – au choix :

   - **Option A – SQL Editor du Dashboard**  
     Supabase Dashboard → **SQL Editor** → coller le contenu de `supabase/seed.sql` → **Run**.

   - **Option B – Ligne de commande avec `psql`**  
     Récupère l’URL de connexion directe : Dashboard → **Project Settings** → **Database** → **Connection string** → **URI**.  
     Puis :
     ```bash
     export DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
     pnpm db:seed
     ```
     (Tu peux mettre `DIRECT_URL` dans `.env.local` et faire `source .env.local` avant, ou l’exporter à la main.)

Avant le seed, assure-toi qu’un utilisateur Auth existe avec l’UUID utilisé dans `seed.sql` (voir « Avant d’exécuter le seed »).

### Avec Docker (Supabase local)

- **Réinitialisation complète** (migrations + seed) :
  ```bash
  pnpm supabase db reset
  ```
  Nécessite Docker et `supabase start`. Il n’y a pas de commande « seed seul » : `db reset` rejoue les migrations puis exécute `seed.sql`.

## Contenu du seed

- **profiles** + **consultants** : Carole Hervé (slug `carole-herve`).
- **consultation_types** : 7 types (prénatale, allaitement, reprise du travail, diversification, sommeil, sevrage, troubles alimentaires).
- **formations** : 9 formations en ligne (1 pack + 8 modules) avec prix et slugs.
- **formation_sections** : 7 sections pour le Pack “L’essentiel de l’allaitement”.
- **events** : 3 événements type formations pro (dates exemples).
- **platform_settings** : clés `about_page`, `books_page`, `media_conferences_page` (contenu JSON).
- **email_templates** : templates par défaut (réservation, formation, bienvenue).

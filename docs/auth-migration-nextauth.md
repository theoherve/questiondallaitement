# Migration : Supabase Auth → NextAuth.js (Auth.js v5)

## Pourquoi changer ?

- Plus de problèmes de trigger / RLS / email de confirmation avec Supabase Auth.
- Auth gérée côté app (email + mot de passe), sessions via NextAuth (JWT).
- Supabase reste la base de données (table `profiles`), sans utiliser `auth.users`.

## À faire avant de lancer l’app

1. **Installer les dépendances**  
   ```bash
   pnpm install
   ```
   (Si le lockfile est en retard : `pnpm install --no-frozen-lockfile`.)

2. **Variables d’environnement**  
   Dans `.env.local` (et en prod) :
   ```env
   AUTH_SECRET=xxx   # obligatoire – générer avec: openssl rand -base64 32
   AUTH_URL=http://localhost:3000   # optionnel en dev
   ```

3. **Migration Supabase**  
   Appliquer la migration qui ajoute `password_hash` et décroche `profiles` de `auth.users` :
   ```bash
   pnpm db:push
   ```
   Ou exécuter manuellement le contenu de `supabase/migrations/00014_nextauth_profiles_password.sql` dans le SQL Editor Supabase.

## Ce qui a été fait

1. **Base de données**  
   - Ajout de la colonne `password_hash` sur `profiles`.  
   - Suppression de la liaison `profiles.id` → `auth.users(id)` et du trigger d’inscription Supabase.  
   - Les nouveaux comptes sont créés uniquement dans `profiles` (avec mot de passe hashé).

2. **NextAuth (Auth.js v5)**  
   - Provider **Credentials** (email + mot de passe).  
   - Vérification du mot de passe (bcrypt) et chargement du profil depuis Supabase.  
   - Session JWT avec `id`, `email`, `role`.  
   - Route API : `/api/auth/[...nextauth]`.

3. **Inscription / Connexion / Déconnexion**  
   - Inscription : insert direct dans `profiles` (hash bcrypt), puis redirection vers connexion.  
   - Connexion : `signIn("credentials", { email, password })`.  
   - Déconnexion : `signOut()`.

4. **Middleware et layout**  
   - Utilisation de la session NextAuth au lieu de Supabase pour protéger les routes et rediriger selon le rôle.

5. **Récupération du user côté serveur**  
   - Helper `getSessionUser()` qui retourne `{ id, email, role }` à partir de la session NextAuth.  
   - Client Supabase : on garde le client « anon » pour les pages publiques ; pour les pages protégées on utilise le client admin (service role) et on filtre par `id` utilisateur quand nécessaire (ou on lit le profil via `getSessionUser()`).

## Variables d’environnement

À ajouter dans `.env.local` :

```env
# NextAuth (générer avec: openssl rand -base64 32)
AUTH_SECRET=xxx
AUTH_URL=http://localhost:3000
```

En prod, définir `AUTH_URL` sur l’URL publique du site.

## Utilisateurs existants (Supabase Auth)

Les comptes créés avant la migration sont dans `auth.users` et ont une ligne dans `profiles` avec le même `id`. Ils ne ont pas de `password_hash`.  
Options :

- Leur demander de réinitialiser le mot de passe (tu ajoutes un flux « mot de passe oublié » qui met à jour `password_hash` dans `profiles`).
- Ou garder temporairement une double vérification : si pas de `password_hash`, appeler l’ancienne API Supabase Auth pour ce login (plus complexe).

Pour une migration simple, on considère que seuls les nouveaux comptes utilisent NextAuth ; les anciens doivent réinitialiser le mot de passe une fois.

# Lien de confirmation d’email (inscription)

## Problème

En cliquant sur le lien reçu par email, tu arrivais sur :
`http://localhost:3000/?error=missing_code#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`

Supabase redirige vers la **Site URL** (racine du site) avec l’erreur dans l’URL quand la **redirect URL** utilisée dans le lien n’est pas dans la liste autorisée, ou quand le lien a déjà été utilisé / expiré.

## Ce qui a été fait dans l’app

1. **Racine (`/`)**  
   - Si l’utilisateur arrive avec `?code=...` → redirection vers `/api/auth/callback?code=...` pour finaliser la connexion.  
   - Si l’URL contient une erreur d’auth dans le hash (`#error=...`) → redirection vers `/connexion` avec un message clair (lien expiré ou déjà utilisé).

2. **Page Connexion**  
   Messages d’erreur en français pour : `link_expired_or_used`, `missing_code`, `auth_failed`.

## Configuration Supabase à vérifier

### 1. Redirect URLs

Dans **Authentication → URL Configuration → Redirect URLs**, il faut que la **racine** soit autorisée en plus du callback :

- En local : `http://localhost:3000` et `http://localhost:3000/api/auth/callback`
- En prod : `https://www.questiondallaitement.vercel.app` et `https://www.questiondallaitement.vercel.app/api/auth/callback`

Clique sur **Add URL** et ajoute :

- `http://localhost:3000`
- En prod : `https://www.questiondallaitement.vercel.app`

Comme ça, si le mail de confirmation utilise la Site URL comme redirect, Supabase acceptera et enverra l’utilisateur sur `/?code=...`, et l’app le renverra vers `/api/auth/callback`.

### 2. Template d’email « Confirm signup »

Dans **Authentication → Email Templates → Confirm signup**, le lien doit utiliser l’URL de confirmation avec redirect. En général le template par défaut utilise déjà `{{ .ConfirmationURL }}`, qui inclut le `redirect_to` qu’on envoie au `signUp` (`emailRedirectTo: .../api/auth/callback`).  
Si tu as personnalisé le template, vérifie qu’il ne remplace pas ce lien par un lien fixe vers la Site URL uniquement.

### 3. Après un lien expiré / déjà utilisé

L’utilisateur est renvoyé sur la page de connexion avec le message :  
« Ce lien a expiré ou a déjà été utilisé. Connectez-vous si votre compte est actif, ou demandez un nouveau lien depuis l’inscription. »

Il peut soit se connecter directement (compte déjà actif), soit se ré-inscrire / redemander une confirmation si besoin.

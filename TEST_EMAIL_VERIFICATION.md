# Test Email Verification Flow — Question d'Allaitement

**Date**: 16 mars 2026  
**Serveur Dev**: http://localhost:3000  
**Branch**: main (6 fichiers modifiés, 1 migration noncommittée)

---

## 📋 Checklist Test Complet

### 1️⃣ TEST : Inscription (Signup) → Email Vérification Envoyé

**Objectifs** :

- ✅ Vérifier que le profil est créé avec `email_verified = false`
- ✅ Vérifier que `email_verification_token` est généré
- ✅ Vérifier que `email_verification_expires` est défini (expiry 24h)
- ✅ Vérifier que l'email de vérification est envoyé (ou logs d'erreur si template manquante)
- ✅ Vérifier message UX : "Un email de vérification vous a été envoyé..."

**Étapes** :

1. Aller sur http://localhost:3000/inscription
2. Remplir le formulaire :
   - Email: `test-verify-$(date +%s)@example.com` (ex: test-verify-1710596000@example.com)
   - Mot de passe: `TestPassword123!`
   - Prénom: `Test`
   - Nom: `User`
3. Cliquer "S'inscrire"
4. **Vérifier la réponse** :
   - ✅ Redirection vers `/inscription?success=...`
   - ✅ Message vert : "Compte créé ! Un email de vérification vous a été envoyé..."
   - ✅ Vérifier les **logs du serveur** pour :
     - `sendVerificationEmail called with email: test-verify-...@example.com`
     - OU erreur si template Resend `email_verification` manquante (acceptable)

**Validation en base de données** (optionnel) :

```sql
SELECT id, email, email_verified, email_verification_token, email_verification_expires
FROM profiles
WHERE email = 'test-verify-...@example.com'
ORDER BY created_at DESC LIMIT 1;
```

**Résultat attendu** :

```
id                                   | email                          | email_verified | email_verification_token | email_verification_expires
12345678-1234-1234-1234-123456789123 | test-verify-1710596000@... | false          | abc123def456...          | 2026-03-17T...
```

---

### 2️⃣ TEST : Connexion Bloquée (Email Non Vérifié)

**Objectifs** :

- ✅ Vérifier que le login refuse les email non vérifiés
- ✅ Vérifier message UX : "Veuillez confirmer votre adresse email..."
- ✅ Vérifier bouton "Renvoyer l'email de vérification" apparaît

**Étapes** :

1. Aller sur http://localhost:3000/connexion
2. Remplir le formulaire :
   - Email: `test-verify-1710596000@example.com` (celui créé ci-dessus)
   - Mot de passe: `TestPassword123!`
3. Cliquer "Se connecter"
4. **Vérifier la réponse** :
   - ✅ Page reste sur `/connexion`
   - ✅ Message d'erreur ROUGE : "Veuillez confirmer votre adresse email avant de vous connecter..."
   - ✅ Champ email caché : `unverified_email=test-verify-...@example.com`
   - ✅ Bouton visible : "Renvoyer l'email de vérification"

**Résultat** : ✅ Login bloqué tant que email non vérifié

---

### 3️⃣ TEST : Clic Lien Vérification

**Objectifs** :

- ✅ Vérifier que le token est validé
- ✅ Vérifier que le profil est marqué `email_verified = true`
- ✅ Vérifier que le token est annulé (`email_verification_token = null`)
- ✅ Vérifier que message de succès apparaît
- ✅ Vérifier que email de bienvenue est envoyé

**Étapes** :

1. **Récupérer le token** (depuis le serveur logs ou Resend/email) :
   - Lien complet du email : `http://localhost:3000/verification-email?token=abc123def456...`
2. Cliquer sur le lien (ou le copier-coller une fois)
3. **Vérifier la réponse** :
   - ✅ Redirection vers `/connexion?success=...`
   - ✅ Message vert : "Email confirmé avec succès ! Vous pouvez maintenant vous connecter."

**Validation en base de données** :

```sql
SELECT email_verified, email_verification_token, email_verification_expires
FROM profiles
WHERE email = 'test-verify-1710596000@example.com';
```

**Résultat attendu** :

```
email_verified | email_verification_token | email_verification_expires
true           | null                     | null
```

**Vérifier les logs** :

- ✅ `sendWelcomeEmail called with email: test-verify-...`

---

### 4️⃣ TEST : Connexion Réussie (Email Vérifié)

**Objectifs** :

- ✅ Vérifier que le login fonctionne après vérification
- ✅ Vérifier redirection vers `/espace-client`

**Étapes** :

1. Aller sur http://localhost:3000/connexion
2. Remplir le formulaire :
   - Email: `test-verify-1710596000@example.com`
   - Mot de passe: `TestPassword123!`
3. Cliquer "Se connecter"
4. **Vérifier la réponse** :
   - ✅ Redirection vers `/espace-client`
   - ✅ Session active (cookie `authjs.session-token` présent)
   - ✅ Header affiche le nom d'utilisateur

**Résultat** : ✅ Login réussi, accès espace client

---

### 5️⃣ TEST : Resend Verification Email

**Objectifs** :

- ✅ Vérifier rate limiting (3 tentatives / 10 min)
- ✅ Vérifier que le nouveau token remplace l'ancien
- ✅ Vérifier que l'email est renvoyé

**Setup** : _Besoin d'un 2e profil non vérifié_

1. Créer un 2e profil : `test-resend-$(date +%s)@example.com`
   - Suivre étapes du TEST 1️⃣
2. Aller sur http://localhost:3000/connexion
3. **Essayer une 1ère connexion** (bloquée car non vérifié)
   - Voir le bouton "Renvoyer l'email de vérification"
4. **Cliquer "Renvoyer l'email de vérification"** (1ère tentative)
   - ✅ Voir message vert : "Si un compte non vérifié existe..."
   - ✅ Voir log serveur : `sendVerificationEmail called` (nouveau token)
5. **Cliquer à nouveau** (2e tentative)
   - ✅ Message vert identique (email enumeration protection)
6. **3e tentative rapidement**
   - ✅ Message vert identique
7. **4e tentative rapidement**
   - ✅ Message rouge : "Trop de tentatives. Réessayez dans quelques minutes."

**Rate Limiting Validation** :

```
Limite: 3 tentatives / 600 secondes
Expected: Erreur à la 4e tentative dans la même fenêtre 10min
```

**Résultat** : ✅ Rate limiting fonctionne

---

### 6️⃣ TEST : Token Expiré

**Objectifs** :

- ✅ Vérifier que les tokens expirent après 24h
- ✅ Vérifier message d'erreur : "Ce lien de vérification a expiré..."

**Setup** :

1. Créer un profil test : `test-expired-$(date +%s)@example.com`
2. **Simuler token expiré** (en base) :
   ```sql
   UPDATE profiles
   SET email_verification_expires = NOW() - INTERVAL '1 hour'
   WHERE email = 'test-expired-...@example.com';
   ```
3. Cliquer sur le lien de vérification
4. **Vérifier la réponse** :
   - ✅ Redirection vers `/connexion?error=...`
   - ✅ Message rouge : "Ce lien de vérification a expiré..."
   - ✅ Bouton "Renvoyer l'email de vérification" visible

**Résultat** : ✅ Vérification des tokens expiré fonctionne

---

## 🔍 Validation Technique

### Migration 00023 Appliquée ?

```sql
-- Vérifier les colonnes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name LIKE 'email%verification%';
```

**Résultat attendu** : 3 lignes

```
column_name                  | data_type           | is_nullable
email_verified               | boolean             | NO
email_verification_token     | text                | YES
email_verification_expires   | timestamp with ...  | YES
```

### Index Créé ?

```sql
SELECT * FROM pg_indexes WHERE tablename = 'profiles' AND indexname LIKE '%verification%';
```

**Résultat attendu** : 1 ligne

```
indexname: idx_profiles_email_verification_token
```

---

## 📊 Résumé des Tests

| Test                    | Status      | Notes                         |
| ----------------------- | ----------- | ----------------------------- |
| 1️⃣ Signup + Email Vérif | ⬜ À tester | Vérifier logs Resend          |
| 2️⃣ Login Bloqué         | ⬜ À tester | Check message UX              |
| 3️⃣ Clic Lien Vérif      | ⬜ À tester | Valider token + welcome email |
| 4️⃣ Login Réussi         | ⬜ À tester | Check redirection + session   |
| 5️⃣ Resend + Rate Limit  | ⬜ À tester | 3/10min limit                 |
| 6️⃣ Token Expiré         | ⬜ À tester | 24h expiry                    |

---

## ⚠️ Problèmes Connus

### 1. Template Resend `email_verification` Manquante

- **Impact** : Email ne sera pas envoyé (fallback HTML utilisé)
- **Fix** : Créer la template dans Resend dashboard ou en base `email_templates`
- **Fallback** : Le code a un HTML par défaut (ligne 207 send.ts)

### 2. Migration 00023 Non Appliquée

- **Impact** : Erreur SQL lors du signup
- **Fix** : `supabase db push` (Docker requis)
- **Alt** : Appliquer manuellement en SQL :

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_email_verification_token ON profiles (email_verification_token)
WHERE email_verification_token IS NOT NULL;

UPDATE profiles SET email_verified = TRUE WHERE email_verified = FALSE;
```

### 3. Resend API Key Manquante

- **Impact** : Emails non envoyés
- **Fix** : Vérifier `.env.local` a `RESEND_API_KEY`

---

## ✅ Checklist Before PUSH

- [ ] Migration 00023 appliquée en prod
- [ ] Template Resend `email_verification` créée
- [ ] Tests 1️⃣-6️⃣ réussis
- [ ] Logs serveur propres (pas d'erreurs)
- [ ] Seeds mis à jour si nécessaire
- [ ] Commit + Push de la feature
- [ ] Tester en prod (staging)

---

## 📅 Timeline

- **10 min** : Tests locaux (1️⃣-4️⃣)
- **5 min** : Tests resend + rate limit (5️⃣)
- **5 min** : Tests edge cases (6️⃣)
- **Total** : ~20 minutes

# 🎯 PLAN D'ACTION FINAL — Email Verification Feature

**Statut** : Prêt pour validation  
**Temps estimé** : 30 minutes pour tester + committer  
**Deadline** : Immédiates (blocker pour MVP)

---

## ⚡ ÉTAPE 1 : Appliquer la Migration (5 min) 🔴 PRIORITÉ

### Problème

La migration `00023_email_verification.sql` n'a pas été appliquée en base. Sans elle, le signup échouera.

### Solution Recommandée : Supabase Dashboard

1. Aller sur **Supabase Dashboard** → https://app.supabase.com/projects
2. Sélectionner le projet **question-d-allaitement**
3. Aller à **SQL Editor** (menu gauche)
4. Nouveau query (bouton + en haut à droite)
5. Copy/paste ce contenu :

```sql
-- Migration 00023 : Email Verification
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_email_verification_token ON profiles (email_verification_token)
WHERE email_verification_token IS NOT NULL;

UPDATE profiles
SET email_verified = TRUE
WHERE email_verified = FALSE;
```

6. Cliquer **Run** (Ctrl+Enter)
7. Vérifier : Message "Success" sans erreurs

### Alternative : CLI Supabase

Si Docker est disponible :

```bash
cd /Users/theo.herve/Documents/Professionnel/Projects/question-d-allaitement
supabase db push
```

---

## ⚡ ÉTAPE 2 : Vérifier les Colonnes (2 min)

Validator que la migration a bien été appliquée :

```sql
-- dans Supabase SQL Editor
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name LIKE 'email%'
ORDER BY ordinal_position;
```

**Résultat attendu** : 3 lignes

```
email_verified          | boolean | NO
email_verification_token| text    | YES
email_verification_expires | timestamp with time zone | YES
```

---

## ⚡ ÉTAPE 3 : Vérifier Env Variables (2 min)

Ouvrir `.env.local` et vérifier :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend (pour emails)
RESEND_API_KEY=re_...

# App (pour lien de verification)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Si manquant : Ajouter les valeurs

---

## ⚡ ÉTAPE 4 : Démarrer le Serveur Dev (1 min)

Le serveur devrait déjà tourner. Vérifier :

```bash
# Terminal
curl http://localhost:3000

# Résultat: HTML du site (ou redirection si pas auth)
```

Si pas de réponse, démarrer :

```bash
cd /Users/theo.herve/Documents/Professionnel/Projects/question-d-allaitement
pnpm dev
# Devrait afficher: ▲ Next.js on http://localhost:3000
```

---

## ⚡ ÉTAPE 5 : Tester le Flow Complet (15 min)

### TEST 1️⃣ : Signup (3 min)

1. Ouvrir https://localhost:3000/inscription
2. Remplir :
   - **Email** : `test-verify-$(date +%s)@example.com` (ex: `test-verify-1710596000@example.com`)
   - **Mot de passe** : `TestPassword123!`
   - **Prénom** : `Test`
   - **Nom** : `User`
3. Cliquer **S'inscrire**

**✅ Résultat attendu** :

```
✓ Redirected à /inscription?success=...
✓ Message vert : "Compte créé ! Un email de vérification vous a été envoyé."
✓ Pas d'erreur SQL
✓ Logs du serveur : "sendVerificationEmail called with test-verify-..."
```

**❌ Si erreur "column email_verified does not exist"** :
→ Migration 00023 n'est pas appliquée → Retourner ÉTAPE 1

---

### TEST 2️⃣ : Login Bloqué (3 min)

1. Ouvrir http://localhost:3000/connexion
2. Remplir :
   - **Email** : `test-verify-1710596000@example.com`
   - **Mot de passe** : `TestPassword123!`
3. Cliquer **Se connecter**

**✅ Résultat attendu** :

```
✓ Reste sur /connexion (pas de redirection)
✓ Message ROUGE : "Veuillez confirmer votre adresse email avant de vous connecter."
✓ Bouton visible : "Renvoyer l'email de vérification"
```

---

### TEST 3️⃣ : Vérification Email (3 min)

Option A : Si vous pouvez voir l'email (Resend testing)

1. Aller à Resend Dashboard → Emails
2. Chercher l'email envoyé à `test-verify-...@example.com`
3. Copier le token depuis le lien
4. Aller à `http://localhost:3000/verification-email?token=VOTRE_TOKEN`

Option B : Via DB directement (pour tests rapides)

```sql
-- Dans Supabase SQL Editor
SELECT email_verification_token FROM profiles
WHERE email = 'test-verify-1710596000@example.com'
LIMIT 1;
```

1. Copier le token
2. Aller à `http://localhost:3000/verification-email?token=TOKEN_DE_LA_DB`

**✅ Résultat attendu** :

```
✓ Redirected à /connexion?success=...
✓ Message VERT : "Email confirmé avec succès ! Vous pouvez maintenant vous connecter."
```

---

### TEST 4️⃣ : Login Réussi (3 min)

1. Ouvrir http://localhost:3000/connexion
2. Remplir :
   - **Email** : `test-verify-1710596000@example.com`
   - **Mot de passe** : `TestPassword123!`
3. Cliquer **Se connecter**

**✅ Résultat attendu** :

```
✓ Redirected à /espace-client
✓ Nom d'utilisateur visible en haut
✓ Session active (cookie présent)
```

---

## ⚡ ÉTAPE 6 : Commit & Push (5 min)

```bash
cd /Users/theo.herve/Documents/Professionnel/Projects/question-d-allaitement

# 1. Vérifier l'état
git status

# 2. Stage tous les changements
git add -A

# 3. Commit avec message descriptif
git commit -m "feat: Implement email verification system

- Add email_verified, email_verification_token, email_verification_expires columns
- Generate secure verification tokens (32 bytes random hex)
- Implement handleVerifyEmail and handleResendVerification server actions
- Block login until email is verified
- Add rate limiting on resend (3 tries per 10 minutes)
- Implement email enumeration protection
- Add sendVerificationEmail and sendWelcomeEmail integration
- Add 24-hour token expiry
- Include /verification-email route for token validation
- Update login and signup flows

Database Migration: 00023_email_verification.sql"

# 4. Push
git push origin main

# 5. Vérifier
git log --oneline -3
```

---

## ⚡ ÉTAPE 7 : Validation Post-Push (2 min)

```bash
# Vérifier le commit est bien poussé
git log --oneline -1 origin/main

# Résultat attendu:
# abc1234 feat: Implement email verification system
```

---

## 🎯 Checklist Rapide

```
ÉTAPE 1 : Migration appliquée
  [ ] SQL exécuté avec succès
  [ ] 3 colonnes créées en base
  [ ] Index créé

ÉTAPE 2 : Env variables
  [ ] NEXT_PUBLIC_SUPABASE_URL présent
  [ ] RESEND_API_KEY présent
  [ ] NEXT_PUBLIC_APP_URL correct

ÉTAPE 3 : Serveur dev
  [ ] Serveur tourne sur http://localhost:3000
  [ ] Pas d'erreurs TypeScript
  [ ] Pas de console.error orphelines

ÉTAPE 4 : Tests (15 min)
  [ ] TEST 1 : Signup → email envoyé ✅
  [ ] TEST 2 : Login bloqué (email unverified) ✅
  [ ] TEST 3 : Click lien verification ✅
  [ ] TEST 4 : Login réussi ✅

ÉTAPE 5 : Commit
  [ ] git status propre
  [ ] 6 fichiers modifiés + 2 nouveaux
  [ ] Commit message descriptif
  [ ] Push réussi

ÉTAPE 6 : Validation
  [ ] Commit visible sur origin/main
  [ ] CI/CD lance si configuré
```

---

## 🆘 Troubleshooting

### ❌ "column 'email_verified' does not exist"

**Solution** : Appliquer la migration 00023 (ÉTAPE 1)

### ❌ "Email not received"

**Solution** : Vérifier RESEND_API_KEY, check Resend dashboard

### ❌ "Redirection loop on connexion"

**Solution** : Check cookies, clear browser cache, vérifier DB si email_verified = true

### ❌ "Token invalid"

**Solution** : Vérifier token pas NULL, check token pas expiré (24h)

### ❌ "Server timeout"

**Solution** : Kill server, `pnpm dev` again, check Docker/services

---

## ✨ Résultat Final

Une fois tous les tests ✅ et le commit poussé :

1. ✅ Feature **Email Verification** est en production
2. ✅ Tous les nouveaux utilisateurs doivent vérifier leur email
3. ✅ Login bloqué jusqu'à vérification
4. ✅ Resend email avec rate limiting
5. ✅ Security++ (prévention spam/fake accounts)

---

## 📋 Prochaines Priorités (Après Merge)

1. **Cron Email Rappel RDV** (3h) — `/api/cron`
2. **Tests E2E Complets** (8h) — Playwright
3. **Security Audit** (4h) — CSP headers
4. **UI/UX Phase 4-5** (13-20j) — Nouvelles pages

---

**🚀 Vous êtes prêt pour les tests !**

Besoin d'aide ? Check les fichiers dans le projet :

- `TEST_EMAIL_VERIFICATION.md` — Tests détaillés
- `AUDIT_EMAIL_VERIFICATION.md` — Audit complet
- `RAPPORT_FINAL_EMAIL_VERIFICATION.md` — Vue globale

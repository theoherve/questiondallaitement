# Email Verification Feature — Rapport d'Audit & Plan d'Action

**Date** : 16 mars 2026  
**Feature** : Système de vérification email après inscription  
**Status** : 🔶 **Prêt pour les tests complets** (code compliqué, migration en attente de test)

---

## 📊 État du Code

### Fichiers Modifiés (6)

#### 1. `src/app/(auth)/actions.ts` ✅

**Changements** :

- 🆕 `handleVerifyEmail(token: string)` — Valide le token, annule les colonnes, envoie email bienvenue
- 🆕 `handleResendVerification(formData)` — Resend avec rate limiting + prévention énumération email
- 📝 `handleLogin()` — Check `email_verified` AVANT NextAuth signIn
- 📝 `handleRegister()` — Génère token + expiry, insert dans profiles

**Validation** :

- ✅ Phone-generated token : `randomBytes(32).toString('hex')`
- ✅ Expiry 24h : `Date.now() + 24 * 60 * 60 * 1000`
- ✅ Rate limiting sur `handleResendVerification` (3/600s)
- ✅ Email enumeration safe : redirection identique si user existe ou pas

#### 2. `src/app/(auth)/connexion/page.tsx` ✅

**Changements** :

- 📝 Import `handleResendVerification` depuis actions
- 🆕 Gestion param URL `unverified_email`
- 🆕 Bouton conditionnel "Renvoyer l'email de vérification"

**Validation** :

- ✅ Montre le bouton si `unverified_email` est présent
- ✅ Envoie une form secrète avec l'email

#### 3. `src/app/(auth)/inscription/page.tsx` ✅

**Changements** :

- 📝 Message UX mis à jour : "Compte créé ! Un email de vérification vous a été envoyé..."

**Validation** :

- ✅ Message plus clair pour l'utilisateur

#### 4. `src/lib/emails/send.ts` ✅

**Changements** :

- 🆕 `sendVerificationEmail()` — Envoie email de vérification avec lien
- 📝 Function signatures standardisées (trailing commas)

**Contenu du template** :

```html
<h1>Confirmez votre adresse email</h1>
<p>Merci de vous être inscrit(e)</p>
<a href="${verification_url}">Confirmer mon email</a>
<p>Lien valide pendant 24 heures</p>
```

**Validation** :

- ✅ Essaie template Resend `email_verification`
- ✅ Fallback HTML par défaut (acceptable)
- ✅ Variables de remplacement : `client_name`, `verification_url`

#### 5. `src/lib/rate-limit.ts` ✅

**Changements** :

- 🆕 `AUTH_RATE_LIMITS.resendVerification` : 3 tentatives / 600 secondes

**Validation** :

- ✅ Config : { prefix: "resend-verification", limit: 3, windowSeconds: 600 }

#### 6. `src/middleware.ts` ✅

**Changements** :

- 📝 Route `/verification-email` ajoutée aux `AUTH_ROUTES` (non-protégée)

**Validation** :

- ✅ Accessible sans authentication

### Fichiers Nouveaux (2)

#### 1. `src/app/(auth)/verification-email/page.tsx` ✅

**12 lignes** :

- Page symple qui récupère token depuis URL
- Appelle `handleVerifyEmail(token)`
- Redirects avec success/error messages

**Validation** :

- ✅ Structure correcte
- ✅ Gestion token invalide/manquant

#### 2. `supabase/migrations/00023_email_verification.sql` ✅

**SQL** :

```sql
ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN email_verification_token TEXT;
ALTER TABLE profiles ADD COLUMN email_verification_expires TIMESTAMPTZ;
CREATE INDEX idx_profiles_email_verification_token ON profiles (email_verification_token) WHERE ...;
UPDATE profiles SET email_verified = TRUE WHERE email_verified = FALSE;
```

**Validation** :

- ✅ Colonne email_verified avec DEFAULT FALSE
- ✅ Colonnes token/expires NULLable
- ✅ Index sur token pour les lookups rapides
- ✅ Backfill des existing profiles (=TRUE car avant cette feature)

---

## ✅ Checklist d'Implémentation

### Architecture

- [x] Schema DB: 3 colonnes (`email_verified`, `email_verification_token`, `email_verification_expires`)
- [x] Index sur `email_verification_token`
- [x] Server Actions pour vérification
- [x] Token génération sécurisée (32 bytes random hex)
- [x] Token expiry 24h
- [x] Rate limiting (3/10min)

### Sécurité

- [x] Email enumeration prevention (redirect identique)
- [x] Token invalidation après vérification
- [x] Expiry check avant marking email comme verified
- [x] Rate limiting sur resend
- [x] Middleware validation

### UX

- [x] Message inscription clair
- [x] Bouton resend sur page connexion
- [x] Messages d'erreur spécifiques (expiré vs invalide)
- [x] Success messages

### Integration

- [x] sendVerificationEmail() function
- [x] sendWelcomeEmail() après vérification
- [x] Login check (email_verified = false → error)
- [x] Middleware routes

---

## 🧪 Tests à Valider

### Tests Locaux (Manuels via Browser)

```
TEST 1: Signup → Email de vérification
  Input: Email neuf, password, name
  Expected:
    - Redirect /inscription?success=...
    - Msg: "Compte créé ! Un email..."
    - Profile créé avec email_verified = false
    - sendVerificationEmail logged
  Status: ⬜ À tester

TEST 2: Connexion Bloquée (Email non-vérifié)
  Input: Email du TEST 1, password
  Expected:
    - Reste sur /connexion
    - Message erreur: "Veuillez confirmer votre adresse email..."
    - Bouton "Renvoyer l'email" visible
  Status: ⬜ À tester

TEST 3: Vérification Email (Clic Lien)
  Input: Token valide du email vérification
  Expected:
    - Redirect /connexion?success=...
    - Msg: "Email confirmé avec succès !"
    - Profile update: email_verified = true, token = null
    - sendWelcomeEmail logged
  Status: ⬜ À tester

TEST 4: Connexion Réussie (Email vérifié)
  Input: Email du TEST 1, password
  Expected:
    - Redirect /espace-client
    - Session active
  Status: ⬜ À tester

TEST 5: Resend Email + Rate Limit
  Input: 4 tentatives rapides resend
  Expected:
    - 1-3: Success msg (email enumeration safe)
    - 4: Error "Trop de tentatives"
  Status: ⬜ À tester

TEST 6: Token Expiré
  Input: Token > 24h
  Expected:
    - Error: "lien...a expiré"
    - Bouton resend visible
  Status: ⬜ À tester
```

---

## ⚠️ Problèmes Potentiels & Solutions

### BLOCKER 1: Migration 00023 Non Appliquée

**Symptôme** : Error lors du signup (`column "email_verified" does not exist`)  
**Fix** :

```bash
# Option 1: Docker requis
supabase db push

# Option 2: Appliqué manuellement en SQL (via Supabase dashboard)
-- Copy/paste le contenu de supabase/migrations/00023_email_verification.sql
```

**Status** : 🟠 Besoin de tester en prod si migration est appliquée

### BLOCKER 2: Template Resend Manquante

**Symptôme** : Fallback HTML utilisé au lieu de template Resend  
**Impact** : Email reçu mais style Resend perdu  
**Fix** :

```bash
# Créer template dans Resend dashboard
Name: email_verification
Variables: client_name, verification_url
```

**Status** : 🟡 Acceptable (fallback HTML fonctionne)

### BLOCKER 3: Resend API Key Manquante

**Symptôme** : Erreur lors de sendVerificationEmail  
**Fix** : Vérifier `.env.local` et `.env.production.local`

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**Status** : 🟢 Probablement OK (déjà configuré)

---

## 📈 Validation Technique

### Database Columns

```sql
-- Vérifier les colonnes existent
\d profiles

-- Résultat attendu:
-- email_verified          | boolean
-- email_verification_token| text
-- email_verification_expires | timestamp with time zone
```

### Seeds

**Status** : 🟡 Seeds à jour si `consultant_locations` existe  
**Note** : Seeds n'ont pas besoin d'être mises à jour pour cette feature (email verification est pour tous les users)

### Env Variables Requises

```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000 (ou https://... en prod)
```

---

## 🚀 Plan Commit & Merge

### Option A: Feature Branch (Recommandée)

```bash
# 1. Créer feature branch
git checkout -b feat/email-verification

# 2. Stage les changements
git add src/app/(auth)/ src/lib/emails/ src/lib/rate-limit.ts src/middleware.ts supabase/migrations/00023_email_verification.sql

# 3. Commit
git commit -m "feat: Implement email verification system

- Add email verification columns to profiles table
- Implement verification token generation and validation
- Add handleVerifyEmail and handleResendVerification server actions
- Block login until email is verified
- Add resend verification with rate limiting
- Integrate sendVerificationEmail and sendWelcomeEmail
- Add /verification-email route for token validation
- Include 24h token expiry and email enumeration protection

Migration: 00023_email_verification.sql"

# 4. Push
git push origin feat/email-verification

# 5. Créer PR pour review
# (sur GitHub UI)

# 6. Après approbation, merge
git checkout main
git pull origin main
git merge feat/email-verification
git push origin main
```

### Option B: Direct to main (Si travail solo)

```bash
git add -A
git commit -m "feat: Email verification system (voir commit details ci-dessus)"
git push origin main
```

---

## ✨ Prochaines Étapes Après Merge

### Phase 1: Tests Production (1-2 jours)

- [ ] Appliquer migration 00023 en staging
- [ ] Tests manuels complets
- [ ] Tests de sécurité email enumeration
- [ ] Vérifier template Resend

### Phase 2: Documentation (1-2h)

- [ ] Documenter le flow dans ADR-008 updates
- [ ] Ajouter au wiki/README

### Phase 3: Monitoring (ongoing)

- [ ] Surveiller les erreurs sendVerificationEmail
- [ ] Check email delivery rates (Resend dashboard)
- [ ] Monitor rate limit triggers

---

## 📋 Checklist Final Avant PUSH

- [ ] Tous les fichiers compilent sans erreur
- [ ] Pas de console.error() à gauche intentionnelle
- [ ] Migration 00023 appliquée en dev
- [ ] Tests manuels 1-4 passent (au minimum)
- [ ] Env variables configurées
- [ ] Resend template crée (ou fallback OK)
- [ ] Commit message clair et documenté
- [ ] Pas de secrets dans le commit
- [ ] Branch à jour avec main

---

## 📞 Support & Questions

**Template Resend manquante?**

```
Fallback HTML est utilisé automatiquement (voir send.ts:200-210)
Pour la template: Dashboard Resend → Templates → Create → email_verification
```

**Migration non appliquée?**

```
Si Supabase CLI ne marche pas, copier/coller le SQL directement:
1. Aller sur Supabase Dashboard
2. SQL Editor
3. Paster supabase/migrations/00023_email_verification.sql
4. Run
```

**Tests échouent?**

```
Vérifier les logs du serveur:
- npm run dev
- Chercher les erreurs "email_verified column" ou "sendVerificationEmail failed"
```

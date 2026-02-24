# Roadmap – Question d'Allaitement

Suivi de l'avancee du projet via des task lists (cocher avec `[x]` au fur et a mesure).
Reference : [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md).

Derniere mise a jour : 2026-02-24

---

## Legende statut

- `[x]` = Termine et fonctionnel
- `[~]` = Partiellement fait (scaffold ou incomplet)
- `[ ]` = A faire

---

## Fondations (termine)

- Setup projet Next.js 16 + TypeScript strict + Tailwind v4
- Shadcn/ui integre avec design tokens custom (globals.css)
- Schema base de donnees complet (14 migrations, toutes les tables)
- Enums PostgreSQL (user_role, booking_status, formation_status, etc.)
- Types TypeScript manuels (`src/types/database.ts`)
- Design system : fonts (Noto Serif / DM Sans), couleurs, radius
- Seeds de developpement (consultante, formations, events, templates email)
- Scripts migration Wix (scrape, transform, import)

---

## Refonte architecture (termine)

- Deplacer les pages espace client sous le layout public (`(public)/espace-client/`)
- Layout public : recuperer la session (`getSessionUser`), passer `user` au Header
- Header auth-aware : menu deroulant (Tableau de bord, Mes formations, Mes reservations, Mon profil)
- Lien Backoffice dans le menu deroulant (affiche selon role)
- Deconnexion dans le menu deroulant
- Constantes `BACKOFFICE_ROLES`, `getBackofficeRedirectUrl`, `canAccessBackoffice`
- Middleware : autoriser `marketing_manager` sur `/admin`
- Admin : nav filtree pour `marketing_manager` (Tableau de bord + Marketing uniquement)
- Admin : redirection des `marketing_manager` sur les pages non-autorisees

---

## MVP (Phase 1 – 8-10 semaines)

### Auth & securite

- NextAuth v5 credentials provider (email/password + bcryptjs)
- JWT session avec claims custom (id, role)
- Middleware RBAC (routes protegees par role)
- Page connexion
- Page inscription
- Page mot de passe oublie (scaffold)
- Systeme de permissions constants-based (`src/constants/permissions.ts`)
- RLS activee sur toutes les tables (deny by default)
- Helper functions SQL (`is_admin()`, `is_consultant()`, `get_user_role()`)
- RLS policies completes sur 25 tables
- Nettoyer la fonction orpheline `handle_new_user()` (trigger supprime en 00014)
- Revoir policy `profiles_insert_own` (autorise `auth.uid() IS NULL`, plus necessaire)
- Rate limiting (Vercel Edge / Upstash)
- Security headers (CSP, HSTS)
- Validation MIME type sur les uploads

### Pages publiques

- Landing page (hero, features, CTA)
- Page liste formations
- Page detail formation (`/formations/[slug]`)
- Page liste consultantes
- Page detail consultante (`/consultantes/[slug]`)
- Page liste evenements
- Page detail evenement (`/evenements/[slug]`)
- Footer
- Pages mentions legales, politique de confidentialite (contenu reel)
- SEO : meta tags dynamiques par page

### Stripe Connect

- Creation compte Express (`stripe.accounts.create`)
- Account links pour onboarding
- Checkout Session avec `application_fee_amount` + `transfer_data`
- Commission variable par consultante
- Refunds (total et partiel)
- Transfers (pour co-creation)
- Dashboard link pour consultantes

### Webhooks Stripe

- Route `/api/webhooks/stripe` avec verification signature
- Handler `checkout.session.completed` (formation enrollment, booking confirmation, event registration)
- Handler `payment_intent.succeeded`
- Handler `charge.refunded` / `charge.partially_refunded`
- Handler `account.updated` (status Stripe Connect)
- Handler `account.application.deauthorized`
- Enregistrement payment dans la table `payments` (source of truth)
- Audit log sur chaque paiement
- Envoi d'emails transactionnels dans les handlers webhook (Resend)

### Backoffice Admin ⚠️ PRIORITE

- Layout admin avec sidebar + header
- Dashboard admin (stats : consultantes, clients, revenus, formations)
- **Gestion formations (CRUD complet)**
  - Liste formations (toutes consultantes) avec filtres (status, consultante)
  - Creation formation (titre, slug, description, prix, consultante associee)
  - Editeur WYSIWYG (Novel) pour les blocs de type `text`
  - Gestion sections : ajouter, renommer, reordonner, supprimer
  - Gestion blocs : ajouter (text/video/image/quiz/download), editer, reordonner, supprimer
  - Upload images/thumbnails via Supabase Storage
  - Publication / depublication / archivage
  - Preview formation
- **Gestion consultantes**
  - Liste consultantes avec status Stripe Connect
  - Creation consultante (profil + activation)
  - Edition commission_rate par consultante
  - Vue detail : stats, formations associees, paiements
- **Gestion paiements**
  - Vue consolidee de tous les paiements
  - Filtres (status, type, consultante, date)
  - Detail paiement avec historique refunds
  - Action refund depuis l'admin
  - Export CSV
- **Parametres plateforme**
  - Commission par defaut
  - Seuil annulation (heures)
  - Taux penalite annulation
  - Mode maintenance

### Espace consultante

- [x] Layout avec sidebar
- [x] Dashboard consultante (scaffold)
- [x] Liste formations en lecture seule *(a migrer : retirer le CRUD, garder la lecture)*
- [ ] Retirer le CRUD formations de l'espace consultante (suite ADR-009)
- [ ] Vue formations : stats (enrollments, revenus)
- [~] Page reservations (scaffold)
- [ ] Gestion reservations : confirmer rdv on_site, annuler, voir details
- [ ] Page parametres : profil, Stripe Connect, Zoom
- [ ] Parametres lieux : configurer cabinet (adresse), teleconsultation (actif/inactif), domicile (actif/inactif, rayon, supplement)
- [ ] Parametres types de consultation : titre, description, duree, prix, lieux disponibles
- [ ] Parametres disponibilites : creneaux recurrents + exceptions (conges, jours feries)

### Espace client

- [x] Layout avec header auth-aware
- [x] Dashboard client (scaffold)
- [~] Page mes formations (scaffold)
- [~] Page mes reservations (scaffold)
- [~] Page mon profil (scaffold)
- [ ] Lecteur de formation (viewer blocks : text, video, image, quiz, download)
- [ ] Suivi de progression par bloc
- [ ] Flow d'achat formation (detail → Stripe Checkout → redirect)

### Booking system (ADR-013)

- [x] Schema DB existant : availabilities, availability_exceptions, consultation_types, bookings
- [ ] **Migration 00016** : enums `consultation_location` + `booking_payment_method`, table `consultant_locations`, colonnes `bookings.location/payment_method/reason`, `consultation_types.available_locations`
- [ ] **Page publique de reservation** (`/reserver`) : flow en 7 etapes
  - [ ] Step 1 : Selection du service (dropdown consultation_types, dedupliques par titre)
  - [ ] Step 2 : Selection du lieu (cabinet / teleconsultation / domicile, filtre par consultant_locations)
  - [ ] Step 3 : Selection de la consultante (filtree par service + lieu)
  - [ ] Step 4 : Calendrier Calendly-like (creneaux dispos de la consultante)
  - [ ] Step 5 : Infos contact (prenom, nom, tel, email, motif) — guest checkout
  - [ ] Step 6 : Choix paiement (Stripe en ligne OU sur place)
  - [ ] Step 7 : Confirmation + creation auto du compte client
- [ ] Guest checkout : creation profil auto avec password_hash null, email pour finaliser le compte
- [ ] UI consultante : calendrier semaine, gestion dispos recurrentes + exceptions
- [ ] Logique annulation 48h (remboursement partiel Stripe pour online, annulation simple pour on_site)
- [ ] Notification email rappel RDV J-1 (cron)
- [ ] Email notification consultante : nouveau rdv a confirmer (pour on_site)

### Emails transactionnels (Resend)

- Client Resend configure (`src/lib/resend/client.ts`)
- Templates email en base (booking_confirmation, booking_reminder, etc.)
- Fonction d'envoi generique (`src/lib/emails/send.ts`)
- Integration dans les webhooks Stripe (envoi reel apres paiement)
- Email confirmation inscription
- Email rappel RDV J-1
- Email annulation avec details refund

### Supabase Storage

- Configuration buckets (avatars, formations, downloads, blog)
- Policies RLS sur les buckets
- Composant upload generique (image picker avec preview)
- Integration dans l'editeur admin (upload image dans Novel)

### Tests

- Tests manuels : inscription client → espace client
- Tests manuels : consultante → espace consultante (lecture seule formations)
- Tests manuels : admin → backoffice complet
- Tests manuels : marketing_manager → backoffice filtre
- Tests manuels : flow achat formation complet (Stripe)
- Tests manuels : flow reservation complet (Stripe)

---

## V1.5 (Phase 2 – 4-6 semaines)

### Blog

- Migration : tables `blog_categories`, `blog_posts` avec enum `blog_status`
- RLS policies pour blog
- Admin : CRUD articles avec editeur Novel (WYSIWYG)
- Admin : gestion categories
- Programmation de publication (`scheduled_at` + cron)
- Champs SEO par article (meta_title, meta_description, og_image)
- Page publique `/blog` avec liste articles
- Page publique `/blog/[slug]` avec article complet
- Sitemap dynamique pour le blog

### Evenements

- Admin : CRUD evenements (titre, description, date, type, prix, max participants)
- Inscription evenement + paiement Stripe
- Consultante : vue evenements qui lui sont associes
- Gestion places disponibles (max_participants - registrations count)

### Zoom OAuth

- OAuth flow complet (consultante connecte son Zoom)
- Creation automatique meeting Zoom a la confirmation de booking
- Stockage tokens (access, refresh, expires_at) dans `consultants`
- Refresh token automatique

### CRM basique

- Consultante : liste contacts (clients avec qui elle a interagi)
- Notes CRM : creation, edition, suppression (privees par consultante)
- Tags : creation, assignation a des clients
- Recherche / filtrage contacts

### Co-creation formations

- Admin : assigner des collaborateurs a une formation
- Revenue share configurable par collaborateur
- Stripe transfers automatiques apres paiement

### Analytics basiques

- Dashboard consultante : revenus, nombre d'enrollments, bookings
- Dashboard admin : revenus plateforme, top formations, top consultantes
- Graphiques temporels (derniers 30 jours, 90 jours, 12 mois)

---

## V2 (Phase 3 – 6-8 semaines)

- Email marketing (Brevo) : campagnes, listes, templates
- Automations (triggers : post-achat, post-inscription, rappels, sequences)
- CRM avance (historique interactions, scoring, segments)
- Analytics avances (funnel, retention, cohortes)
- Notifications in-app (cloche dans le header)
- Export RGPD (`/api/user/data-export`)
- Banner cookie avec consentement granulaire

---

## V3 (Phase 4 – Futur)

- App mobile (Expo) ou PWA
- API publique (optionnel)
- Avis / reviews sur formations et consultantes
- Programme de fidelite
- Multi-langue (i18next)


# Platform Architecture - Question d'Allaitement

> Document de reference architectural. Toutes les decisions structurantes sont documentees ici.
> Derniere mise a jour : 2026-02-24

---

## 1. Vision Produit

Plateforme SaaS multi-consultantes dans le domaine de la sante (lactation, sommeil, etc.) avec :

- Vente d'accompagnements en ligne (LMS) avec contenu WYSIWYG
- Reservation de consultations
- Evenements (visio / presentiel)
- Blog avec programmation de publication
- Paiement Stripe Connect avec commission plateforme variable
- CRM interne
- Email marketing (Brevo) + transactionnel (Resend)
- Automations
- Backoffice admin complet (gestion centralisee de tout le contenu)
- Dashboards (client, consultante, admin)

---

## 2. Decisions Architecturales (ADR)

### ADR-001 : Shared DB Multi-Tenant

**Decision** : Une seule base Supabase PostgreSQL, isolation par Row Level Security (RLS).
**Raison** : Simplicite operationnelle, cout reduit, coherence des donnees cross-tenant.
**Consequence** : Chaque table a des RLS policies strictes. Deny by default.

### ADR-002 : Server Actions > API Routes

**Decision** : Privilegier les Server Actions Next.js pour les mutations.
**Raison** : Type-safety end-to-end, moins de boilerplate, CSRF natif.
**Exception** : API Routes pour webhooks Stripe, callbacks OAuth (Zoom), endpoints health/cron.

### ADR-003 : Payments as Source of Truth

**Decision** : La table `payments` est la source de verite pour tout paiement.
**Raison** : Synchronisee via webhooks Stripe, evite les incoherences.
**Consequence** : Jamais de creation d'enrollment/booking sans webhook confirme.

### ADR-004 : JSONB pour les Blocs de Formation

**Decision** : Le contenu des blocs d'accompagnement est stocke en JSONB.
**Raison** : Flexibilite maximale pour les types de contenu (text, video, image, quiz, download).
**Consequence** : Validation Zod cote application, pas de contraintes SQL strictes sur le contenu.

### ADR-005 : Commission Variable par Consultante

**Decision** : Taux de commission stocke par consultante dans la table `consultants`.
**Raison** : Permet des accords commerciaux differents.
**Implementation** : Appliquee via `application_fee_amount` dans Stripe Checkout Session.

### ADR-006 : CRM Notes Privees

**Decision** : Les notes CRM d'une consultante ne sont JAMAIS visibles par une autre.
**Raison** : Confidentialite medicale, relation de confiance.
**Implementation** : RLS policy sur `crm_notes` filtrant par `consultant_id = auth.uid()`.

### ADR-007 : Soft Delete

**Decision** : Les entites critiques ne sont jamais supprimees physiquement.
**Raison** : Auditabilite, conformite RGPD (droit a l'effacement = anonymisation apres 30j).
**Tables concernees** : profiles, accompagnements, bookings, payments, blog_posts.

### ADR-008 : Migration Supabase Auth → NextAuth

**Date** : 2026-02
**Decision** : Remplacement de Supabase Auth par NextAuth v5 (Auth.js) avec provider credentials.
**Raison** : Controle total sur le flow d'authentification, compatibilite avec le schema profiles existant, pas de dependance a auth.users pour les FK.
**Implementation** :
- Session JWT (30 jours), pas de session DB
- Mots de passe hashes via bcryptjs dans `profiles.password_hash`
- La FK `profiles.id → auth.users(id)` a ete supprimee (migration 00014)
- Le trigger `on_auth_user_created` a ete supprime
- Les profils sont crees directement dans `profiles` lors de l'inscription
**Consequence** : Le client Supabase cote serveur utilise `createAdminClient()` (service role key) car il n'y a plus de JWT Supabase. Le RLS est contourne cote serveur, la securite repose sur le middleware RBAC + validation dans les Server Actions.

### ADR-009 : Admin = Seul Createur de Contenu (Formations)

**Date** : 2026-02
**Decision** : Seul l'admin peut creer et editer les accompagnements depuis le backoffice.
**Raison** : Controle editorial centralise, coherence du catalogue, workflow de publication maitrise.
**Consequence** :
- L'espace consultante affiche les accompagnements en lecture seule (stats, enrollments)
- Le CRUD accompagnements est dans `/admin/accompagnements/`
- Les consultantes sont associees aux accompagnements comme `consultant_id` (proprietaire) ou `accompagnement_collaborators`
- L'admin peut assigner n'importe quelle consultante comme proprietaire

### ADR-010 : Novel (Tiptap) pour l'Edition WYSIWYG

**Date** : 2026-02
**Decision** : Utilisation de Novel (basee sur Tiptap, UX Notion-like) pour l'edition de contenu riche.
**Raison** : Integration React headless, extensions (images, videos, embeds), output HTML/JSON, UX intuitive pour un non-developpeur.
**Utilisation** :
- Blocs d'accompagnement de type `text` : contenu HTML riche
- Articles de blog : corps de l'article en HTML riche
- Descriptions longues (formations, accompagnements)

### ADR-011 : Systeme Blog avec Programmation

**Date** : 2026-02
**Decision** : Table `blog_posts` avec statuts draft/scheduled/published, gestion depuis l'admin.
**Raison** : SEO, content marketing, programmation de publication.
**Implementation** :
- Table `blog_posts` avec `scheduled_at`, `published_at`, `status`
- Cron job (`/api/cron`) publie les articles schedules
- Champs SEO : `meta_title`, `meta_description`, `og_image_url`
- Categories via table `blog_categories`
- Admin WYSIWYG (Novel) pour la redaction

### ADR-012 : Supabase Storage

**Date** : 2026-02
**Decision** : Supabase Storage pour tous les fichiers uploades.
**Raison** : Integration native avec Supabase, RLS sur les buckets, CDN inclus.
**Buckets** :
- `avatars` : Photos de profil (public read, authenticated write own)
- `formations` : Thumbnails et images d'accompagnements (public read, admin write) — nom historique, conserve : il est incruste dans les URLs publiques deja stockees
- `downloads` : Fichiers telechargeables des blocs accompagnement (authenticated read enrolled, admin write)
- `blog` : Images d'articles de blog (public read, admin write)

### ADR-013 : Flow de Reservation (Booking)

**Date** : 2026-02
**Decision** : Reservation en 7 etapes avec guest checkout, choix du lieu, et paiement optionnel.
**Raison** : UX optimale pour les mamans, pas de friction (pas de compte obligatoire), flexibilite paiement.

**Flow complet** :
1. **Service** : Dropdown de tous les types de consultation actifs (cross-consultantes, dedupliques par titre)
2. **Lieu** : Cabinet | Teleconsultation | Domicile (filtre selon la configuration de chaque consultante)
3. **Consultante** : Dropdown filtre (consultantes qui proposent ce service a ce lieu)
4. **Creneau** : Calendrier Calendly-like (creneaux dispos de la consultante selectionnee)
5. **Infos contact** : Prenom, nom, telephone, email, motif (champ requis)
6. **Paiement** : Choix entre paiement en ligne (Stripe) ou paiement sur place (especes/CB au rdv)
7. **Confirmation** : Recap complet + compte client cree automatiquement (guest checkout)

**Schema** :
- Enum `consultation_location` : cabinet, teleconsultation, domicile
- Enum `booking_payment_method` : online, on_site
- Table `consultant_locations` : configuration des lieux par consultante (adresse cabinet, zone domicile, supplement)
- `consultation_types.available_locations` : array de lieux ou ce service est proposable
- `bookings.location` : lieu choisi pour ce rdv
- `bookings.payment_method` : mode de paiement choisi
- `bookings.reason` : motif du rdv (requis)

**Guest checkout** :
- Un profil `client` est cree automatiquement avec les infos contact fournies
- `password_hash` est null (le compte est "dormant")
- Un email est envoye pour finaliser le compte (choisir un mot de passe)
- Les futurs rdv avec le meme email reutilisent le profil existant

**Domicile** :
- Desactive par defaut pour toutes les consultantes
- Configurable dans l'espace consultante (parametres → lieux)
- Supplement de prix possible (`consultant_locations.surcharge_cents`)
- Zone geographique definissable (ville, rayon km)

**Paiement on_site** :
- Booking cree avec `payment_method = 'on_site'` et `status = 'pending'`
- Pas de Stripe Checkout, pas de `stripe_payment_intent_id`
- La consultante confirme manuellement le rdv depuis son espace
- Pas d'entree dans la table `payments` tant que le paiement n'est pas effectue

**Paiement online** :
- Redirect vers Stripe Checkout
- Webhook `checkout.session.completed` → `status = 'confirmed'`
- Entree dans `payments` via webhook (source of truth, ADR-003)

---

## 3. Stack Technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16+ App Router |
| Langage | TypeScript strict |
| Styling | Tailwind CSS v4 |
| Composants UI | Shadcn/ui + Radix |
| Base de donnees | Supabase PostgreSQL |
| Auth | NextAuth v5 (Auth.js) credentials provider |
| Storage | Supabase Storage |
| Paiements | Stripe Connect Express |
| Email transactionnel | Resend |
| Email marketing | Brevo |
| Video conferencing | Zoom OAuth API |
| Video embed | Vimeo / YouTube |
| WYSIWYG Editor | Novel (Tiptap-based) |
| State management | Zustand |
| Data fetching | TanStack React Query |
| Validation | Zod |
| Hebergement | Vercel |
| Monitoring | Sentry |

---

## 4. Design System

### Fonts

- **Titres** : Noto Serif (`font-serif`)
- **Paragraphes** : DM Sans (`font-sans`)

### Couleurs

| Token | Valeur | Usage |
|-------|--------|-------|
| primary-red | #A0283E | CTAs, accents, liens actifs |
| primary-red-light | #C4566A | Hover states, backgrounds legers |
| primary-red-dark | #7A1E2F | Active states, texte sur fond clair |
| primary-green | #203634 | Headers, texte principal, sidebar |
| primary-green-light | #2D4A47 | Hover states secondaires |
| primary-green-dark | #162523 | Active states secondaires |
| background-beige | #FFF8F6 | Background principal |
| background-beige-dark | #F5EBE8 | Cards, sections alternees |

### Radius

- sm: 0.375rem | md: 0.5rem | lg: 0.75rem | xl: 1rem

### Integration Tailwind v4

Design tokens integres dans `globals.css` via `@theme inline` :
- `--color-primary-red`, `--color-primary-green`, `--color-background-beige` etc.
- Variables Shadcn/ui mappees sur la palette custom dans `:root`
- `font-sans` → DM Sans, `font-serif` → Noto Serif

---

## 5. Roles & Permissions

### Roles

| Role | Description |
|------|-------------|
| visitor | Utilisateur non authentifie |
| client | Client authentifie, peut acheter et reserver |
| consultant | Consultante complete, acces a son espace (lecture accompagnements, gestion bookings, CRM, emails) |
| consultant_limited | Consultante restreinte (pas CRM, pas formations, accompagnements read-only) |
| marketing_manager | Acces emails marketing et analytics marketing uniquement |
| admin | Acces total : creation de contenu, gestion plateforme, supervision |

### Matrice de Permissions

| Permission | visitor | client | consultant | consultant_limited | marketing_manager | admin |
|------------|---------|--------|------------|-------------------|-------------------|-------|
| view_public_pages | x | x | x | x | x | x |
| book_consultation | guest* | x | - | - | - | x |
| buy_formation | - | x | - | - | - | x |
| manage_formations (CRUD) | - | - | - | - | - | x |
| view_own_formations | - | - | x | read only | - | x |
| manage_bookings | - | - | x | x | - | x |
| manage_events (CRUD) | - | - | - | - | - | x |
| view_own_events | - | - | x | - | - | x |
| manage_blog | - | - | - | - | - | x |
| access_crm | - | - | x | - | - | x |
| manage_emails | - | - | x | - | x | x |
| manage_automations | - | - | x | - | - | x |
| view_analytics | - | - | x | limited | marketing | x |
| manage_consultants | - | - | - | - | - | x |
| manage_platform | - | - | - | - | - | x |

*guest = la reservation est possible sans compte. Un profil client est cree automatiquement (ADR-013).

### Changement cle (ADR-009)

Les consultantes ne creent plus d'accompagnements. Elles voient leurs accompagnements (stats, enrollments, revenus) en lecture seule dans leur espace. Tout le CRUD accompagnements, blog, formations est centralise dans l'admin.

---

## 6. Schema Base de Donnees

### Enums

- `user_role` : visitor, client, consultant, consultant_limited, marketing_manager, admin
- `booking_status` : pending, confirmed, cancelled, completed, no_show
- `accompagnement_status` : draft, published, archived
- `block_type` : text, video, image, quiz, download
- `formation_type` : online, in_person, hybrid
- `payment_status` : pending, succeeded, failed, refunded, partially_refunded
- `payment_type` : accompagnement, booking, event
- `consultation_location` : cabinet, teleconsultation, domicile *(nouveau - ADR-013)*
- `booking_payment_method` : online, on_site *(nouveau - ADR-013)*
- `blog_status` : draft, scheduled, published, archived *(nouveau - ADR-011)*

### Tables principales

Voir migrations SQL dans `supabase/migrations/` pour le schema complet.

**Existantes** : profiles, consultants, availabilities, availability_exceptions, consultation_types, bookings, accompagnements, accompagnement_collaborators, accompagnement_sections, accompagnement_blocks, accompagnement_enrollments, accompagnement_progress, formations, formation_registrations, payments, crm_notes, crm_tags, crm_contact_tags, email_templates, email_campaigns, automations, automation_logs, audit_logs, platform_settings.

**A creer (MVP - Booking flow ADR-013)** :

```
consultant_locations
  id UUID PK
  consultant_id UUID FK → consultants ON DELETE CASCADE
  location_type consultation_location NOT NULL
  label TEXT                    -- ex: "Cabinet Paris 15e"
  address TEXT                  -- adresse postale (cabinet, domicile)
  city TEXT
  postal_code TEXT
  radius_km INT                 -- pour domicile : rayon de deplacement
  surcharge_cents INT DEFAULT 0 -- supplement domicile
  is_active BOOLEAN DEFAULT true
  created_at TIMESTAMPTZ
  UNIQUE (consultant_id, location_type)
```

**Modifications tables existantes (MVP)** :

```
consultation_types
  + available_locations consultation_location[] DEFAULT '{teleconsultation}'
  -- remplace is_online BOOLEAN (migration : is_online=true → '{teleconsultation}', false → '{cabinet}')

bookings
  + location consultation_location NOT NULL DEFAULT 'teleconsultation'
  + payment_method booking_payment_method NOT NULL DEFAULT 'online'
  + reason TEXT                 -- motif du rdv (requis dans le flow)
  -- notes reste pour des notes internes
  -- client_id reste NOT NULL : le profil guest est cree AVANT le booking
```

**A creer (V1.5 - Blog ADR-011)** :

```
blog_categories
  id UUID PK
  name TEXT NOT NULL
  slug TEXT UNIQUE NOT NULL
  description TEXT
  position INT DEFAULT 0
  created_at TIMESTAMPTZ

blog_posts
  id UUID PK
  title TEXT NOT NULL
  slug TEXT UNIQUE NOT NULL
  excerpt TEXT
  body_html TEXT NOT NULL
  thumbnail_url TEXT
  category_id UUID FK → blog_categories
  author_id UUID FK → profiles (admin qui ecrit)
  consultant_id UUID FK → consultants (consultante associee, optionnel)
  status blog_status DEFAULT 'draft'
  meta_title TEXT
  meta_description TEXT
  og_image_url TEXT
  tags TEXT[] DEFAULT '{}'
  scheduled_at TIMESTAMPTZ
  published_at TIMESTAMPTZ
  deleted_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

### Migrations a prevoir

**Cleanup + password reset (migration 00015)** : *(fait)*
- Supprime la fonction orpheline `handle_new_user()` (le trigger a ete drop en 00014)
- Corrige la policy `profiles_insert_own` (retire `auth.uid() IS NULL`)
- Ajoute `password_reset_token` et `password_reset_expires` sur `profiles`

**Booking flow (migration 00016)** :
- Creer enums `consultation_location` et `booking_payment_method`
- Creer table `consultant_locations`
- Ajouter `available_locations` a `consultation_types` + migrer `is_online`
- Ajouter `location`, `payment_method`, `reason` a `bookings`
- RLS policies pour `consultant_locations`

**Blog (migration 00017 - V1.5)** :
- Creer enum `blog_status`
- Creer tables `blog_categories` et `blog_posts`
- RLS policies pour blog

---

## 7. Architecture Backoffice Admin

### Principe

L'admin est le hub central. Toutes les operations de creation/edition de contenu passent par `/admin/`.

### Pages admin

| Route | Fonctionnalite |
|-------|---------------|
| `/admin` | Dashboard global (stats, revenus, activite recente) |
| `/admin/consultantes` | Liste, creation, activation, commission, Stripe Connect status |
| `/admin/accompagnements` | CRUD accompagnements avec WYSIWYG (Novel), sections, blocs |
| `/admin/accompagnements/[id]/edit` | Editeur complet : metadata + sections + blocs drag & drop |
| `/admin/blog` | Articles de blog : CRUD, WYSIWYG, programmation, categories |
| `/admin/blog/[id]/edit` | Editeur article avec Novel, SEO fields, scheduling |
| `/admin/formations` | CRUD formations, programmation, gestion inscriptions |
| `/admin/paiements` | Vue consolidee, filtres, export, refunds |
| `/admin/marketing` | Campagnes email (Brevo), templates, stats |
| `/admin/parametres` | Settings plateforme, commission default, annulation, maintenance |
| `/admin/utilisateurs` | Gestion profiles, roles, RGPD |

### Espace consultante (lecture + gestion propre)

| Route | Fonctionnalite |
|-------|---------------|
| `/espace-consultante` | Dashboard personnel (stats, prochains RDV) |
| `/espace-consultante/accompagnements` | Lecture seule : mes accompagnements, stats, enrollments |
| `/espace-consultante/reservations` | Gestion de ses bookings (confirmer rdv on_site, annuler, voir details) |
| `/espace-consultante/crm` | Notes clients, tags |
| `/espace-consultante/emails` | Templates et campagnes personnelles |
| `/espace-consultante/analytics` | Stats personnelles |
| `/espace-consultante/parametres` | Profil, lieux de consultation (cabinet/teleconsult/domicile), disponibilites, types de consultation, Stripe Connect, Zoom |

---

## 8. Stripe Connect Model

### Onboarding

1. Admin cree la consultante dans le backoffice
2. Consultante accede a ses parametres -> "Connecter Stripe"
3. `stripe.accounts.create({ type: 'express' })` -> `account_id`
4. Redirect vers Stripe Express onboarding
5. Webhook `account.updated` -> maj `stripe_account_status`

### Paiement (accompagnements, formations, bookings online)

1. Client choisit accompagnement/booking/event
2. Creation Checkout Session avec `application_fee_amount` et `transfer_data.destination`
3. Webhook `checkout.session.completed` -> fulfillment (enrollment, booking confirmation, event registration)
4. Stripe transfere automatiquement les fonds
5. Emails transactionnels envoyes via Resend

### Booking paiement on_site (ADR-013)

1. Client reserve avec `payment_method = 'on_site'`
2. Booking cree avec `status = 'pending'`, pas de Stripe
3. La consultante recoit une notification email (nouveau rdv a confirmer)
4. La consultante confirme manuellement depuis son espace → `status = 'confirmed'`
5. Le paiement est effectue sur place (especes, CB physique)
6. Pas d'entree automatique dans `payments` — si necessaire, la consultante peut marquer le rdv comme "paye" (mise a jour manuelle ou future fonctionnalite)

### Commission

- Taux variable par consultante (champ `commission_rate` dans `consultants`)
- Appliquee via `application_fee_amount = montant * commission_rate / 100`
- Sur remboursement : `application_fee` reverse proportionnellement par defaut

### Co-creation Formations

- Paiement au compte de la consultante principale (`accompagnements.consultant_id`)
- Split entre co-creatrices via `stripe.transfers.create()`
- Revenue shares dans `accompagnement_collaborators.revenue_share`

---

## 9. Politique d'Annulation

### Bookings payes en ligne (payment_method = online)

- **>= 48h avant** : Remboursement total via `stripe.refunds.create()`
- **< 48h avant** : Penalite 50% (remboursement partiel)
- La plateforme conserve sa commission proportionnelle sur la partie non remboursee
- Email automatique au client et a la consultante
- Audit log de l'annulation

### Bookings paiement sur place (payment_method = on_site)

- **>= 48h avant** : Annulation simple, pas de frais
- **< 48h avant** : Pas de refund Stripe (pas de paiement). Penalite a gerer hors plateforme (conditions generales) ou future implementation.
- Booking passe en `status = 'cancelled'`
- Email automatique au client et a la consultante

---

## 10. Securite

- **NextAuth v5** (credentials provider) avec JWT custom claims (id, role)
- **Middleware Next.js RBAC** sur routes protegees (`/espace-client`, `/espace-consultante`, `/admin`)
- **RLS sur toutes les tables** (deny by default)
  - **Attention** : Cote serveur, `createAdminClient()` bypass RLS. Usage restreint aux Server Actions/API Routes avec verification de role en amont.
- **Validation Zod** sur toutes les entrees (Server Actions)
- **CSRF natif** via Server Actions
- Rate limiting in-memory sur les routes auth (login, register, forgot/reset password), swappable vers @upstash/ratelimit pour la prod *(implemente)*
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) *(implemente)* — CSP a ajouter post-MVP
- Verification signature webhooks Stripe *(implementee)*
- Validation MIME type uploads *(a implementer avec Supabase Storage)*

---

## 11. RGPD

- Banner cookie avec consentement explicite
- Droit d'acces : endpoint `/api/user/data-export`
- Droit a l'effacement : soft delete 30j puis hard delete
- Droit de rectification : edition profil
- Portabilite : export JSON
- Retention : audit_logs 2 ans, automation_logs 6 mois
- DPA avec chaque consultante
- Breach notification : procedure 72h CNIL

---

## 12. Monitoring

- **Sentry** : Error tracking frontend + server
- **Vercel Analytics** : Web Vitals
- **audit_logs table** : Actions critiques
- **Stripe Dashboard** : Paiements, disputes, webhooks
- **Uptime Robot** : Endpoint `/api/health`
- **Cron** (`/api/cron`) : Nettoyage logs, rappels RDV, publication articles schedules

---

## 13. Storage (Supabase Storage)

| Bucket | Acces | Usage |
|--------|-------|-------|
| `avatars` | Public read, authenticated write own | Photos de profil |
| `formations` | Public read, admin write | Thumbnails, images d'accompagnement |
| `downloads` | Authenticated read (enrolled), admin write | PDFs, fichiers telechargeables des blocs |
| `blog` | Public read, admin write | Images d'articles |

Policies Supabase Storage a configurer avec RLS sur chaque bucket.

---

## 14. Roadmap

### MVP (Phase 1 - 8-10 semaines)

Auth, roles, middleware RBAC, pages publiques, backoffice admin complet (accompagnements CRUD + WYSIWYG Novel), booking client, Stripe Connect, webhooks, dashboards (client + consultante lecture + admin), emails transactionnels, annulation 48h, RLS, Supabase Storage.

### V1.5 (Phase 2 - 4-6 semaines)

Blog (CRUD + WYSIWYG + scheduling + SEO), formations CRUD admin, Zoom OAuth, CRM basique, co-creation accompagnements, analytics.

### V2 (Phase 3 - 6-8 semaines)

Email marketing Brevo, automations, CRM avance, analytics avance, templates email, notifications in-app, export RGPD.

### V3 (Phase 4 - Futur)

App mobile, API publique, avis/reviews, fidelite, multi-langue.

---

## 15. Migration Wix

Le plan et les scripts de migration sont dans `scripts/migration/` :

- **README.md** : Phases (audit, export, transformation, import, redirects, tests, DNS, post-migration)
- **wix-formations.ts** : Structure des formations pro Wix scrapees (sections, steps)
- **scrape-wix-formations.ts** : Scraping des formations pro depuis le site Wix
- **transform-contacts.ts** : Transforme un CSV de contacts Wix en JSON profils
- **import-data.ts** : Importe les profils dans Supabase
- Les redirections anciennes URLs -> nouvelles routes se configurent dans `next.config.ts` (redirects)
- **seed.sql** : Donnees Wix transformees pour le developpement local

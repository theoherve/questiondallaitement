# Platform Architecture - Question d'Allaitement

> Document de reference architectural. Toutes les decisions structurantes sont documentees ici.

---

## 1. Vision Produit

Plateforme SaaS multi-consultantes dans le domaine de la sante (lactation, sommeil, etc.) avec :

- Vente de formations en ligne (LMS)
- Reservation de consultations
- Evenements (visio / presentiel)
- Paiement Stripe Connect avec commission plateforme variable
- CRM interne
- Email marketing (Brevo) + transactionnel (Resend)
- Automations
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
**Exception** : API Routes pour webhooks Stripe, callbacks OAuth (Zoom, Supabase Auth).

### ADR-003 : Payments as Source of Truth

**Decision** : La table `payments` est la source de verite pour tout paiement.
**Raison** : Synchronisee via webhooks Stripe, evite les incoherences.
**Consequence** : Jamais de creation d'enrollment/booking sans webhook confirme.

### ADR-004 : JSONB pour les Blocs de Formation

**Decision** : Le contenu des blocs de formation est stocke en JSONB.
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
**Tables concernees** : profiles, formations, bookings, payments.

---

## 3. Stack Technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14+ App Router |
| Langage | TypeScript strict |
| Styling | Tailwind CSS v4 |
| Composants UI | Shadcn/ui + Radix |
| Base de donnees | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Paiements | Stripe Connect Express |
| Email transactionnel | Resend |
| Email marketing | Brevo |
| Video conferencing | Zoom OAuth API |
| Video embed | Vimeo / YouTube |
| State management | Zustand |
| Data fetching | TanStack React Query |
| Validation | Zod |
| Hebergement | Vercel |
| Monitoring | Sentry |

---

## 4. Design System

### Fonts

- **Titres** : Noto Serif
- **Paragraphes** : DM Sans

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

---

## 5. Roles & Permissions

### Roles

| Role | Description |
|------|-------------|
| visitor | Utilisateur non authentifie |
| client | Client authentifie, peut acheter et reserver |
| consultant | Consultante complete, acces total a son espace |
| consultant_limited | Consultante restreinte (pas CRM, pas events, formations read-only) |
| marketing_manager | Acces emails marketing et analytics marketing uniquement |
| admin | Acces total a la plateforme |

### Matrice de Permissions

| Permission | visitor | client | consultant | consultant_limited | marketing_manager | admin |
|------------|---------|--------|------------|-------------------|-------------------|-------|
| view_public_pages | x | x | x | x | x | x |
| book_consultation | - | x | - | - | - | x |
| buy_formation | - | x | - | - | - | x |
| manage_own_formations | - | - | x | read only | - | x |
| manage_bookings | - | - | x | x | - | x |
| manage_events | - | - | x | - | - | x |
| access_crm | - | - | x | - | - | x |
| manage_emails | - | - | x | - | x | x |
| manage_automations | - | - | x | - | - | x |
| view_analytics | - | - | x | limited | marketing | x |
| manage_consultants | - | - | - | - | - | x |
| manage_platform | - | - | - | - | - | x |

---

## 6. Schema Base de Donnees

### Enums

- `user_role` : visitor, client, consultant, consultant_limited, marketing_manager, admin
- `booking_status` : pending, confirmed, cancelled, completed, no_show
- `formation_status` : draft, published, archived
- `block_type` : text, video, image, quiz, download
- `event_type` : online, in_person, hybrid
- `payment_status` : pending, succeeded, failed, refunded, partially_refunded
- `payment_type` : formation, booking, event

### Tables

Voir migrations SQL dans `supabase/migrations/` pour le schema complet.

Tables principales : profiles, consultants, availabilities, availability_exceptions, consultation_types, bookings, formations, formation_collaborators, formation_sections, formation_blocks, formation_enrollments, formation_progress, events, event_registrations, payments, crm_notes, crm_tags, crm_contact_tags, email_templates, email_campaigns, automations, automation_logs, audit_logs, platform_settings.

---

## 7. Stripe Connect Model

### Onboarding

1. Consultante s'inscrit -> profil cree avec role `consultant`
2. Parametres -> "Connecter Stripe"
3. `stripe.accounts.create({ type: 'express' })` -> `account_id`
4. Redirect vers Stripe Express onboarding
5. Webhook `account.updated` -> maj `stripe_account_status`

### Paiement

1. Client choisit formation/booking/event
2. Creation Checkout Session avec `application_fee_amount` et `transfer_data.destination`
3. Webhook `checkout.session.completed` -> fulfillment
4. Stripe transfere automatiquement les fonds

### Commission

- Taux variable par consultante (champ `commission_rate` dans `consultants`)
- Appliquee via `application_fee_amount = montant * commission_rate / 100`
- Sur remboursement : `application_fee` reverse proportionnellement par defaut

### Co-creation Formations

- Paiement au compte de la consultante principale
- Split entre co-creatrices via `stripe.transfers.create()`
- Revenue shares dans `formation_collaborators.revenue_share`

---

## 8. Politique d'Annulation

- **>= 48h avant** : Remboursement total
- **< 48h avant** : Penalite 50% (remboursement partiel)
- Gestion automatique via `stripe.refunds.create()`
- Decision : la plateforme conserve sa commission proportionnelle sur la partie non remboursee

---

## 9. Securite

- Supabase Auth (email/password + magic link) avec JWT custom claims
- Middleware Next.js RBAC sur routes protegees
- RLS sur toutes les tables (deny by default)
- Validation Zod sur toutes les entrees
- CSRF natif via Server Actions
- Rate limiting via Vercel Edge / @upstash/ratelimit
- Security headers (CSP, HSTS, X-Frame-Options)
- Verification signature webhooks Stripe
- Validation MIME type uploads

---

## 10. RGPD

- Banner cookie avec consentement explicite
- Droit d'acces : endpoint `/api/user/data-export`
- Droit a l'effacement : soft delete 30j puis hard delete
- Droit de rectification : edition profil
- Portabilite : export JSON
- Retention : audit_logs 2 ans, automation_logs 6 mois
- DPA avec chaque consultante
- Breach notification : procedure 72h CNIL

---

## 11. Monitoring

- **Sentry** : Error tracking frontend + server
- **Vercel Analytics** : Web Vitals
- **audit_logs table** : Actions critiques
- **Stripe Dashboard** : Paiements, disputes, webhooks
- **Uptime Robot** : Endpoint `/api/health`
- **Cron** (`/api/cron`) : Nettoyage logs, rappels RDV

---

## 12. Roadmap

### MVP (Phase 1 - 8-10 semaines)

Auth, roles, pages publiques, formations CRUD, booking, Stripe Connect, webhooks, dashboards (client + consultante + admin), emails transactionnels, annulation 48h, RLS.

### V1.5 (Phase 2 - 4-6 semaines)

Evenements, Zoom OAuth, CRM basique, co-creation formations, analytics.

### V2 (Phase 3 - 6-8 semaines)

Email marketing Brevo, automations, CRM avance, analytics avance, templates email, notifications in-app, export RGPD.

### V3 (Phase 4 - Futur)

App mobile, API publique, avis/reviews, fidelite, multi-langue, blog SEO.

---

## 13. Migration Wix

Le plan et les scripts de migration sont dans `scripts/migration/` :

- **README.md** : Phases (audit, export, transformation, import, redirects, tests, DNS, post-migration)
- **transform-contacts.ts** : Transforme un CSV de contacts Wix en JSON profils
- **import-data.ts** : Importe les profils dans Supabase (auth.admin.createUser)
- Les redirections anciennes URLs -> nouvelles routes se configurent dans `next.config.ts` (redirects)

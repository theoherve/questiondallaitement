# Roadmap – Question d'Allaitement

Suivi de l’avancée du projet via des task lists (cocher avec `[x]` au fur et à mesure).  
Référence : [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md).

---

## Refonte architecture (espace client + backoffice)

- [x] Déplacer les pages espace client sous le layout public (`(public)/espace-client/`)
- [x] Supprimer le layout sidebar dédié espace client
- [x] Layout public : récupérer la session (`getSessionUser`), passer `user` au Header
- [x] Header auth-aware : menu déroulant (Tableau de bord, Mes formations, Mes réservations, Mon profil)
- [x] Lien Backoffice dans le menu déroulant (affiché selon rôle)
- [x] Déconnexion dans le menu déroulant
- [x] Constantes `BACKOFFICE_ROLES`, `getBackofficeRedirectUrl`, `canAccessBackoffice` (`constants/roles.ts`)
- [x] Middleware : autoriser `marketing_manager` sur `/admin`
- [x] Admin : nav filtrée pour `marketing_manager` (Tableau de bord + Marketing uniquement)
- [x] Admin : redirection des `marketing_manager` sur les pages Consultantes, Formations, Paiements, Paramètres vers `/admin`
- [x] Fichier `docs/roadmap.md` avec task lists

---

## MVP (Phase 1 – 8–10 semaines)

- [x] Auth (NextAuth + credentials, rôles)
- [x] Rôles et middleware RBAC
- [x] Pages publiques (landing, formations, consultantes, événements)
- [x] CRUD formations (consultante)
- [x] Booking (réservations, créneaux)
- [x] Stripe Connect (onboarding, paiements)
- [x] Webhooks Stripe (fulfillment, enrollment, booking)
- [x] Dashboards client, consultante, admin
- [x] Emails transactionnels (Resend)
- [x] Politique annulation 48h (logique)
- [x] RLS (politiques de base)
- [ ] Finaliser annulation 48h (remboursement partiel, emails, audit)
- [ ] Vérifier RLS sur toutes les tables critiques (profiles, consultants, bookings, formations, payments, crm_notes)
- [ ] Rate limiting (Vercel Edge / Upstash)
- [ ] Security headers (CSP, HSTS)
- [ ] Tests manuels ou E2E (inscription client → espace client ; consultante → backoffice ; admin / marketing_manager → backoffice)

---

## V1.5 (Phase 2 – 4–6 semaines)

- [ ] Événements : CRUD, inscriptions, paiement Stripe
- [ ] Zoom OAuth (visio consultations / événements)
- [ ] CRM basique (notes, tags, liaison client)
- [ ] Co-création formations (revenue share, transfers Stripe)
- [ ] Analytics (consultante + admin)

---

## V2 (Phase 3 – 6–8 semaines)

- [ ] Email marketing (Brevo), campagnes, templates
- [ ] Automations (triggers, actions)
- [ ] CRM avancé
- [ ] Analytics avancés
- [ ] Notifications in-app
- [ ] Export RGPD (`/api/user/data-export`)

---

## V3 (Phase 4 – Futur)

- [ ] App mobile (Expo) ou PWA
- [ ] API publique (optionnel)
- [ ] Avis / reviews
- [ ] Fidélité, multi-langue, blog SEO

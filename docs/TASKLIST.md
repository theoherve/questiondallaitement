# Tasklist – Question d'Allaitement

> Suivi projet structure en **Epics** et **Stories**.
> Reference : [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md) | [roadmap.md](./roadmap.md)
>
> Derniere mise a jour : 2026-04-03 (EPIC-24 terminé)

## Legende

| Symbole | Signification                              |
| ------- | ------------------------------------------ |
| ✅      | Termine et fonctionnel                     |
| 🔶      | Partiellement fait (scaffold ou incomplet) |
| ⬜      | A faire                                    |
| 🔴 P0   | Bloquant — a faire en priorite             |
| 🟠 P1   | Important — necessaire pour la phase       |
| 🟡 P2   | Souhaitable — amelioration qualite         |

## Vue d'ensemble par phase

| Phase      | Epics             | Statut global                             |
| ---------- | ----------------- | ----------------------------------------- |
| **MVP**    | EPIC-01 a EPIC-14 | ✅ Terminé                                |
| **V1.5**   | EPIC-15 a EPIC-20 | ✅ Terminé                                |
| **V2**     | EPIC-21 a EPIC-23 | 🔶 Partiel (EPIC-21-22 ✅, EPIC-23 ⬜)    |
| **V2.5**   | EPIC-25 a EPIC-26 | 🔶 Partiel (EPIC-25 ✅, EPIC-26 ✅)       |
| **V3**     | EPIC-24, EPIC-27  | 🔶 Partiel (EPIC-24 ✅, EPIC-27 ⬜)       |

---

# MVP (Phase 1 – 8-10 semaines)

---

## EPIC-01 : Fondations & Infrastructure ✅

> Setup projet, schema DB, design system, seeds.

| ID    | Story                                                                                    | Statut | Prio |
| ----- | ---------------------------------------------------------------------------------------- | ------ | ---- |
| 01-01 | Setup Next.js 16 + TypeScript strict + Tailwind v4 + Shadcn/ui                           | ✅     | —    |
| 01-02 | Design system : tokens couleurs, fonts (Noto Serif / DM Sans), radius dans `globals.css` | ✅     | —    |
| 01-03 | Schema DB complet : 14 migrations SQL (enums, tables, indexes, triggers)                 | ✅     | —    |
| 01-04 | Types TypeScript manuels (`src/types/database.ts`)                                       | ✅     | —    |
| 01-05 | Seeds de dev : consultante, formations, events, templates email (`seed.sql`)             | ✅     | —    |
| 01-06 | Scripts migration Wix (scrape, transform, import)                                        | ✅     | —    |
| 01-07 | Configuration Vercel (deployment)                                                        | ✅     | —    |
| 01-08 | Configuration ESLint + PostCSS                                                           | ✅     | —    |

---

## EPIC-02 : Auth & Securite

> Authentification, roles, middleware RBAC, securite applicative.

| ID    | Story                                                                                                        | Statut | Prio  |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------ | ----- |
| 02-01 | NextAuth v5 credentials provider (email/password + bcryptjs)                                                 | ✅     | —     |
| 02-02 | JWT session avec claims custom (id, role), maxAge 30j                                                        | ✅     | —     |
| 02-03 | Middleware RBAC : routes protegees `/espace-client`, `/espace-consultante`, `/admin`                         | ✅     | —     |
| 02-04 | Page connexion (`/connexion`)                                                                                | ✅     | —     |
| 02-05 | Page inscription (`/inscription`) avec creation profil + hash password                                       | ✅     | —     |
| 02-06 | Page mot de passe oublie — flow complet (envoi email Resend + page `/reset-password` + update password_hash) | ✅     | —     |
| 02-07 | Systeme permissions constants-based (`src/constants/permissions.ts`, `roles.ts`)                             | ✅     | —     |
| 02-08 | RLS activee sur toutes les tables (deny by default) + 25 tables couvertes                                    | ✅     | —     |
| 02-09 | Helpers SQL : `is_admin()`, `is_consultant()`, `get_user_role()`                                             | ✅     | —     |
| 02-10 | Migration 00015 : cleanup — supprimer `handle_new_user()` orpheline                                          | ✅     | —     |
| 02-11 | Migration 00015 : revoir policy `profiles_insert_own` (retirer `auth.uid() IS NULL`)                         | ✅     | —     |
| 02-12 | Rate limiting sur les routes sensibles (in-memory, swappable Upstash pour prod)                              | ✅     | —     |
| 02-13 | Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)                            | 🔶     | 🟡 P2 |
| 02-14 | Validation MIME type sur les uploads (Supabase Storage policies)                                             | ⬜     | 🟡 P2 |
| 02-15 | Migration 00031 : refactorisation systeme de roles en tableaux multi-roles (`user_role[]`)                   | ✅     | —     |
| 02-16 | Refactorisation auth.ts, JWT session (`roles[]`), middleware RBAC, constants/permissions pour multi-role     | ✅     | —     |

> **02-13 note** : HSTS, X-Frame-Options, X-Content-Type-Options et Referrer-Policy sont en place. CSP manquant (reporter apres MVP pour eviter les faux positifs avec les CDN/embeds).
> **02-14 note** : Bloque par EPIC-13 (Supabase Storage non encore configure).
> **02-15/16 note** : Introduit PR #17 (multi-role). Un utilisateur peut desormais cumuler plusieurs roles (ex: `consultant` + `marketing_manager`). Helpers `hasRole()`, `hasAnyRole()` utilises partout.

---

## EPIC-03 : Backoffice Admin – Formations ✅

> CRUD complet des formations avec editeur WYSIWYG Novel, depuis `/admin/formations`. (ADR-009, ADR-010)

| ID    | Story                                                                                                                                             | Statut | Prio  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 03-01 | Installer Novel (`pnpm add novel`) + `@dnd-kit` et creer composant `<WysiwygEditor>` reutilisable                                                 | ✅     | —     |
| 03-02 | Page `/admin/formations` : liste de toutes les formations (toutes consultantes) avec filtres (status, consultante) et recherche                   | ✅     | —     |
| 03-03 | Page `/admin/formations/nouveau` : formulaire creation formation (titre, slug auto, description, prix, consultante associee, thumbnail)           | ✅     | —     |
| 03-04 | Page `/admin/formations/[id]/edit` : formulaire edition metadata (titre, description courte, description longue WYSIWYG, prix, status, thumbnail) | ✅     | —     |
| 03-05 | Editeur sections : ajouter, renommer, reordonner (drag & drop), supprimer une section                                                             | ✅     | —     |
| 03-06 | Editeur blocs — type `text` : editeur Novel inline avec output HTML                                                                               | ✅     | —     |
| 03-07 | Editeur blocs — type `video` : formulaire (provider vimeo/youtube, video_id, titre)                                                               | ✅     | —     |
| 03-08 | Editeur blocs — type `image` : upload Supabase Storage + alt + caption                                                                            | ✅     | —     |
| 03-09 | Editeur blocs — type `quiz` : question + N options (texte, is_correct) + explication                                                              | ✅     | —     |
| 03-10 | Editeur blocs — type `download` : upload fichier Supabase Storage + filename                                                                      | ✅     | —     |
| 03-11 | Reordonnancement blocs (drag & drop @dnd-kit) au sein d'une section                                                                               | ✅     | —     |
| 03-12 | Publication / depublication / archivage depuis la page edit + confirmation modale                                                                 | ✅     | —     |
| 03-13 | Preview formation (vue publique en mode preview, non indexee)                                                                                     | ✅     | 🟡 P2 |
| 03-14 | Server Actions admin formations : `createFormation`, `updateFormation`, `deleteFormation`, `reorderSections`, `reorderBlocks`                     | ✅     | —     |
| 03-15 | Retirer le CRUD formations de l'espace consultante (`/espace-consultante/formations`) — passage en lecture seule (ADR-009)                        | ✅     | —     |

---

## EPIC-04 : Backoffice Admin – Consultantes ✅

> Gestion des consultantes depuis `/admin/consultantes`.

| ID    | Story                                                                                                                                                     | Statut | Prio  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 04-01 | Page `/admin/consultantes` : liste consultantes avec colonnes (nom, email, specialites, status Stripe, commission, active)                                | ✅     | 🟠 P1 |
| 04-02 | Promotion utilisateur → consultante : recherche user existant + formulaire (slug, bio, specialites, commission_rate) → update role + insert `consultants` | ✅     | 🟠 P1 |
| 04-03 | Edition consultante : modifier commission_rate, bio, specialites, is_active, slug                                                                         | ✅     | 🟠 P1 |
| 04-04 | Vue detail consultante : stats (nombre formations, bookings, revenus), status Stripe Connect, formations associees                                        | ✅     | 🟡 P2 |
| 04-05 | Activation / desactivation consultante (toggle `is_active`)                                                                                               | ✅     | 🟠 P1 |
| 04-06 | Server Actions admin consultantes : `promoteToConsultant`, `updateConsultant`, `toggleActive`, `searchUsers`, `getConsultantStats`                        | ✅     | 🟠 P1 |
| 04-07 | Admin : upload avatar consultante depuis la fiche admin (`admin-avatar-upload`, upload Supabase Storage)                                                  | ✅     | 🟡 P2 |
| 04-08 | Admin : templates types de consultation — creation rapide depuis modeles predefined (composant `admin-consultation-types` enrichi)                        | ✅     | 🟡 P2 |
| 04-09 | Admin : gestion complete des disponibilites consultante depuis la fiche admin (creneaux recurrents + exceptions)                                          | ✅     | 🟡 P2 |

---

## EPIC-05 : Backoffice Admin – Paiements ✅

> Vue consolidee et gestion des paiements depuis `/admin/paiements`.

| ID    | Story                                                                                                                                | Statut | Prio  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----- |
| 05-01 | Page `/admin/paiements` : tableau de tous les paiements avec colonnes (date, client, consultante, montant, commission, type, status) | ✅     | 🟠 P1 |
| 05-02 | Filtres : par status (succeeded, refunded...), par type (formation, booking, event), par consultante, par plage de dates             | ✅     | 🟠 P1 |
| 05-03 | Detail paiement : vue complete avec metadata, lien Stripe, historique refunds                                                        | ✅     | 🟡 P2 |
| 05-04 | Action refund depuis l'admin : refund total ou partiel via Server Action + `stripe.refunds.create()` + confirmation modale           | ✅     | 🟠 P1 |
| 05-05 | Export CSV des paiements filtres (avec BOM UTF-8 pour compatibilite Excel)                                                           | ✅     | 🟡 P2 |

---

## EPIC-06 : Backoffice Admin – Parametres ✅

> Settings globaux de la plateforme depuis `/admin/parametres`.

| ID    | Story                                                                                                                                        | Statut | Prio  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 06-01 | Page `/admin/parametres` : formulaire edition `platform_settings` (commission par defaut, seuil annulation, taux penalite, mode maintenance) | ✅     | 🟠 P1 |
| 06-02 | Server Action `updatePlatformSettings` avec validation Zod + audit log                                                                       | ✅     | 🟠 P1 |
| 06-03 | Mode maintenance : si active, les pages publiques affichent un message "site en maintenance" (sauf `/admin` et admins connectes)             | ✅     | 🟡 P2 |

---

## EPIC-07 : Booking System ✅

> Flow de reservation en 7 etapes avec guest checkout. (ADR-013)

| ID                          | Story                                                                                                                                                               | Statut | Prio  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| **DB & Schema**             |                                                                                                                                                                     |        |       |
| 07-01                       | Migration 00020 : creer enum `consultation_location` (cabinet, teleconsultation, domicile)                                                                          | ✅     | 🔴 P0 |
| 07-02                       | Migration 00020 : creer enum `booking_payment_method` (online, on_site)                                                                                             | ✅     | 🔴 P0 |
| 07-03                       | Migration 00020 : creer table `consultant_locations` (id, consultant_id, location_type, label, address, city, postal_code, radius_km, surcharge_cents, is_active)   | ✅     | 🔴 P0 |
| 07-04                       | Migration 00020 : ajouter `available_locations consultation_location[]` a `consultation_types` + migrer `is_online`                                                 | ✅     | 🔴 P0 |
| 07-05                       | Migration 00020 : ajouter `location`, `payment_method`, `reason` a `bookings`                                                                                       | ✅     | 🔴 P0 |
| 07-06                       | Migration 00020 : RLS policies pour `consultant_locations` (public read active, consultant write own, admin all)                                                    | ✅     | 🔴 P0 |
| 07-07                       | Types TypeScript : `ConsultantLocation`, `ConsultationLocation`, `BookingPaymentMethod` dans `database.ts`                                                          | ✅     | 🔴 P0 |
| 07-08                       | Mettre a jour les seeds pour inclure `consultant_locations` et `available_locations`                                                                                | ⬜     | 🟠 P1 |
| **Page publique /reserver** |                                                                                                                                                                     |        |       |
| 07-09                       | Route publique `/reserver` ajoutee au middleware (pas d'auth requise)                                                                                               | ✅     | 🔴 P0 |
| 07-10                       | Composant multi-step form (state local) avec barre de progression                                                                                                   | ✅     | 🔴 P0 |
| 07-11                       | Step 1 — Service : cards des `consultation_types` actifs, dedupliques par titre                                                                                     | ✅     | 🔴 P0 |
| 07-12                       | Step 2 — Lieu : boutons cabinet / teleconsultation / domicile, filtres par `available_locations` du service choisi                                                  | ✅     | 🔴 P0 |
| 07-13                       | Step 3 — Consultante : liste consultantes qui offrent ce service a ce lieu, avec avatar + bio                                                                       | ✅     | 🔴 P0 |
| 07-14                       | Step 4 — Calendrier : vue mois Calendly-like, calcul creneaux dispos (cross `availabilities` + `availability_exceptions` + `bookings` existants + `buffer_minutes`) | ✅     | 🔴 P0 |
| 07-15                       | Step 5 — Contact : formulaire prenom, nom, telephone, email, motif (validation Zod)                                                                                 | ✅     | 🔴 P0 |
| 07-16                       | Step 6 — Paiement : choix Stripe en ligne OU sur place. Afficher prix (base + surcharge domicile si applicable)                                                     | ✅     | 🔴 P0 |
| 07-17                       | Step 7 — Confirmation : recapitulatif complet (service, lieu, consultante, creneau, prix, mode paiement)                                                            | ✅     | 🔴 P0 |
| **Backend booking**         |                                                                                                                                                                     |        |       |
| 07-18                       | Server Action `createBooking` : creation profil guest si nouveau email, creation booking, redirect Stripe ou confirmation directe                                   | ✅     | 🔴 P0 |
| 07-19                       | Guest checkout : creation profil auto (`password_hash = null`, role `client`), reutilisation si email existant                                                      | ✅     | 🔴 P0 |
| 07-20                       | Si paiement online : creation Stripe Checkout Session (type booking) → redirect                                                                                     | ✅     | 🔴 P0 |
| 07-21                       | Si paiement on_site : booking `status = 'pending'`, email notification a la consultante                                                                             | ✅     | 🔴 P0 |
| 07-22                       | Email confirmation au client apres booking (Resend)                                                                                                                 | ✅     | 🟠 P1 |
| 07-23                       | Email "finalisez votre compte" au guest (choisir mot de passe)                                                                                                      | ✅     | 🟠 P1 |
| **Annulation**              |                                                                                                                                                                     |        |       |
| 07-24                       | Logique annulation 48h : calcul si >= 48h avant `starts_at`, refund total ou partiel 50% (online)                                                                   | ✅     | 🟠 P1 |
| 07-25                       | Annulation on_site : `status = 'cancelled'`, pas de refund Stripe                                                                                                   | ✅     | 🟠 P1 |
| 07-26                       | Server Action `cancelBooking` avec audit log                                                                                                                        | ✅     | 🟠 P1 |
| 07-27                       | Email annulation au client et a la consultante avec details refund                                                                                                  | ✅     | 🟠 P1 |
| **Cron & notifications**    |                                                                                                                                                                     |        |       |
| 07-28                       | Cron `/api/cron` : email rappel RDV J-1 pour les bookings confirmed de demain                                                                                       | ✅     | 🟡 P2 |
| **Tarification par duree**  |                                                                                                                                                                     |        |       |
| 07-29                       | Migration 00028 : table `consultation_type_durations` (duree_minutes, prix_cents, surcharge_weekend_cents, surcharge_ferie_cents, is_default)                       | ✅     | 🟠 P1 |
| 07-30                       | Migration 00029 : seed durees par defaut pour tous les types de consultation existants                                                                              | ✅     | 🟠 P1 |
| 07-31                       | Step Duration (nouveau step wizard entre Service et Lieu) : selection duree + affichage prix calcule en temps reel                                                  | ✅     | 🟠 P1 |
| 07-32                       | Tarification weekend et jours feries : surcharge configurable, detection via `french-holidays.ts`, calcul dans `lib/booking/pricing.ts`                            | ✅     | 🟠 P1 |
| 07-33                       | Consultante : CRUD des durees par type de consultation depuis l'onglet Parametres (consultation-types-tab enrichi)                                                 | ✅     | 🟠 P1 |
| **Configuration lieux (admin)** |                                                                                                                                                                 |        |       |
| 07-34                       | Migration 00033 : table `location_configs` (config globale plateforme par type de lieu : cabinet, teleconsultation, domicile)                                      | ✅     | 🟠 P1 |
| 07-35                       | Page `/admin/reservation` : configuration globale des lieux (activer/desactiver chaque type de lieu, parametres par defaut)                                        | ✅     | 🟠 P1 |
| 07-36                       | Server Actions `getLocationConfigs`, `updateLocationConfig` dans `/admin/reservation/actions.ts`                                                                   | ✅     | 🟠 P1 |
| 07-37                       | Integration `location_configs` dans le wizard de reservation (filtrage types de lieux selon config plateforme)                                                     | ✅     | 🟠 P1 |
| 07-38                       | Tests unitaires `actions.spec.ts` pour les configurations de lieux (`getLocationConfigs`, `updateLocationConfig`)                                                  | ✅     | 🟡 P2 |

---

## EPIC-08 : Espace Consultante ✅

> Dashboard et gestion propre pour les consultantes.

| ID                             | Story                                                                                                                                | Statut | Prio  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----- |
| **Layout & nav**               |                                                                                                                                      |        |       |
| 08-01                          | Layout dashboard consultante avec sidebar + header                                                                                   | ✅     | —     |
| 08-02                          | Navigation filtree selon role (`consultant` vs `consultant_limited`)                                                                 | ✅     | —     |
| **Dashboard**                  |                                                                                                                                      |        |       |
| 08-03                          | Dashboard consultante : prochains RDV (5 prochains bookings), stats rapides (revenus, RDV, formations, clients)                      | ✅     | 🟠 P1 |
| **Formations (lecture seule)** |                                                                                                                                      |        |       |
| 08-04                          | Page formations : liste des formations de la consultante en lecture seule (titre, status, prix)                                      | ✅     | 🟠 P1 |
| 08-05                          | Retirer bouton "Nouvelle formation" et liens "Modifier" (ADR-009) — deja fait                                                        | ✅     | 🟠 P1 |
| 08-06                          | Stats par formation : nombre enrollments, revenus generes                                                                            | ✅     | 🟡 P2 |
| **Reservations**               |                                                                                                                                      |        |       |
| 08-07                          | Page reservations : liste des bookings avec lieu, motif, paiement, boutons d'action + lien detail                                    | ✅     | 🟠 P1 |
| 08-08                          | Action confirmer un rdv on_site (`pending` → `confirmed`) — bouton + Server Action                                                   | ✅     | 🔴 P0 |
| 08-09                          | Action annuler un rdv avec raison — dialog + Server Action                                                                           | ✅     | 🟠 P1 |
| 08-10                          | Vue detail booking : infos client, service, lieu, creneau, mode paiement, notes, paiement, annulation                                | ✅     | 🟠 P1 |
| **Parametres**                 |                                                                                                                                      |        |       |
| 08-11                          | Onglet Profil : edition bio, specialites, photo (upload avatar Supabase Storage)                                                     | ✅     | 🟠 P1 |
| 08-12                          | Onglet Lieux : configurer cabinet (label, adresse), teleconsultation (actif/inactif), domicile (actif/inactif, rayon km, supplement) | ✅     | 🔴 P0 |
| 08-13                          | Onglet Types de consultation : CRUD des `consultation_types` (titre, description, duree, prix, lieux disponibles)                    | ✅     | 🔴 P0 |
| 08-14                          | Onglet Disponibilites : creneaux recurrents par jour de semaine (ajout/suppression)                                                  | ✅     | 🔴 P0 |
| 08-15                          | Onglet Disponibilites : exceptions (conge, jour ferie, creneau supplementaire)                                                       | ✅     | 🟠 P1 |
| 08-16                          | Onglet Stripe Connect : bouton onboarding / status du compte / lien dashboard Stripe                                                 | ✅     | 🟠 P1 |
| 08-17                          | Onglet Zoom : bouton connexion OAuth / status connexion                                                                              | ✅     | 🟡 P2 |

---

## EPIC-09 : Espace Client

> Dashboard, formations achetees, reservations, profil.

| ID               | Story                                                                                                            | Statut | Prio  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| **Layout**       |                                                                                                                  |        |       |
| 09-01            | Layout client avec header auth-aware + tabs navigation                                                           | ✅     | —     |
| **Dashboard**    |                                                                                                                  |        |       |
| 09-02            | Dashboard client : prochains RDV, formations en cours, progression globale                                       | ✅     | 🟠 P1 |
| **Formations**   |                                                                                                                  |        |       |
| 09-03            | Page "Mes formations" : liste des formations achetees (via `formation_enrollments`) avec progression             | ✅     | 🟠 P1 |
| 09-04            | Lecteur de formation : vue sections + blocs avec navigation section                                              | ✅     | 🔴 P0 |
| 09-05            | Rendu bloc `text` : affichage HTML riche                                                                         | ✅     | 🔴 P0 |
| 09-06            | Rendu bloc `video` : embed Vimeo ou YouTube responsive                                                           | ✅     | 🔴 P0 |
| 09-07            | Rendu bloc `image` : image + alt + caption                                                                       | ✅     | 🔴 P0 |
| 09-08            | Rendu bloc `quiz` : question, options cliquables, feedback correct/incorrect, explication                        | ✅     | 🔴 P0 |
| 09-09            | Rendu bloc `download` : lien de telechargement fichier (signed URL Supabase Storage)                             | ✅     | 🔴 P0 |
| 09-10            | Suivi progression : marquer un bloc comme termine, barre de progression par section et global                    | ✅     | 🟠 P1 |
| **Reservations** |                                                                                                                  |        |       |
| 09-11            | Page "Mes reservations" : liste des bookings du client (a venir, passes, annules)                                | ✅     | 🟠 P1 |
| 09-12            | Action annuler un rdv depuis l'espace client (logique 48h)                                                       | ✅     | 🟠 P1 |
| **Profil**       |                                                                                                                  |        |       |
| 09-13            | Page "Mon profil" : edition prenom, nom, telephone, email, avatar                                                | ✅     | 🟠 P1 |
| 09-14            | Changement de mot de passe                                                                                       | ✅     | 🟠 P1 |
| **Achat**        |                                                                                                                  |        |       |
| 09-15            | Flow achat formation : bouton "Acheter" sur page detail → Stripe Checkout → redirect `/espace-client/formations` | ✅     | 🔴 P0 |

---

## EPIC-10 : Pages Publiques

> Vitrine publique : landing, catalogue, detail, legal.

| ID    | Story                                                                                            | Statut | Prio  |
| ----- | ------------------------------------------------------------------------------------------------ | ------ | ----- |
| 10-01 | Landing page (hero, features, CTA, temoignages, consultantes, newsletter)                        | ✅     | —     |
| 10-02 | Page liste formations (`/formations`) : cards avec thumbnail, titre, prix, consultante           | ✅     | —     |
| 10-03 | Page detail formation (`/formations/[slug]`) : description, sections, prix, bouton acheter       | ✅     | —     |
| 10-04 | Page liste consultantes (`/consultantes`) : cards avec photo, nom, specialites                   | ✅     | —     |
| 10-05 | Page detail consultante (`/consultantes/[slug]`) : bio, specialites, formations, bouton reserver | ✅     | —     |
| 10-06 | Page liste evenements (`/evenements`)                                                            | ✅     | —     |
| 10-07 | Page detail evenement (`/evenements/[slug]`)                                                     | ✅     | —     |
| 10-08 | Footer avec liens utiles                                                                         | ✅     | —     |
| 10-09 | Page mentions legales (`/mentions-legales`) — contenu placeholder                                | ✅     | 🟡 P2 |
| 10-10 | Page politique de confidentialite (`/politique-de-confidentialite`) — contenu placeholder        | ✅     | 🟡 P2 |
| 10-11 | SEO : meta tags dynamiques par page (title, description, og:image, Twitter Cards)                | ✅     | 🟡 P2 |
| 10-12 | Bouton "Acheter" sur page detail formation connecte a Stripe Checkout                            | ✅     | 🔴 P0 |
| 10-13 | Bouton "Reserver" sur page detail consultante → redirect `/reserver?consultant=slug`             | ✅     | 🟠 P1 |
| 10-14 | Extension middleware : routes publiques supplementaires ajoutees (`/replay-lives`, etc.)         | ✅     | —     |

---

## EPIC-11 : Stripe & Paiements

> Integration Stripe Connect, webhooks, fulfillment.

| ID    | Story                                                                          | Statut | Prio  |
| ----- | ------------------------------------------------------------------------------ | ------ | ----- |
| 11-01 | Client Stripe configure (`src/lib/stripe/client.ts`)                           | ✅     | —     |
| 11-02 | Stripe Connect : creation compte Express + onboarding                          | ✅     | —     |
| 11-03 | Checkout Session avec `application_fee_amount` + `transfer_data`               | ✅     | —     |
| 11-04 | Commission variable par consultante                                            | ✅     | —     |
| 11-05 | Refunds (total et partiel)                                                     | ✅     | —     |
| 11-06 | Transfers pour co-creation                                                     | ✅     | —     |
| 11-07 | Dashboard link pour consultantes                                               | ✅     | —     |
| 11-08 | Webhook route avec verification signature                                      | ✅     | —     |
| 11-09 | Handler `checkout.session.completed` (enrollment, booking, event registration) | ✅     | —     |
| 11-10 | Handler `payment_intent.succeeded`                                             | ✅     | —     |
| 11-11 | Handler `charge.refunded` / `charge.partially_refunded`                        | ✅     | —     |
| 11-12 | Handler `account.updated` (status Connect)                                     | ✅     | —     |
| 11-13 | Handler `account.application.deauthorized`                                     | ✅     | —     |
| 11-14 | Enregistrement dans `payments` (source of truth) + audit log                   | ✅     | —     |
| 11-15 | Envoi emails transactionnels dans les handlers webhook (Resend)                | ✅     | 🔴 P0 |

---

## EPIC-12 : Emails Transactionnels (Resend)

> Templates, envoi, integration avec les events applicatifs.

| ID    | Story                                                                                                          | Statut | Prio  |
| ----- | -------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 12-01 | Client Resend configure (`src/lib/resend/client.ts`)                                                           | ✅     | —     |
| 12-02 | Templates email en base (booking_confirmation, booking_reminder, booking_cancelled, formation_access, welcome) | ✅     | —     |
| 12-03 | Fonction d'envoi generique avec remplacement variables (`src/lib/emails/send.ts`)                              | ✅     | —     |
| 12-04 | Email confirmation inscription (apres signup)                                                                  | ✅     | 🟠 P1 |
| 12-05 | Email acces formation (apres achat confirme par webhook)                                                       | ✅     | 🔴 P0 |
| 12-06 | Email confirmation booking (apres paiement online ou confirmation on_site)                                     | ✅     | 🔴 P0 |
| 12-07 | Email rappel RDV J-1 (via cron)                                                                                | ✅     | 🟡 P2 |
| 12-08 | Email annulation booking avec details refund                                                                   | ✅     | 🟠 P1 |
| 12-09 | Email notification consultante : nouveau rdv on_site a confirmer                                               | ✅     | 🟠 P1 |
| 12-10 | Email guest checkout : "finalisez votre compte" (choisir mot de passe)                                         | ✅     | 🟠 P1 |

---

## EPIC-13 : Supabase Storage ✅

> Configuration buckets, policies, composant upload.

| ID    | Story                                                                                        | Statut | Prio |
| ----- | -------------------------------------------------------------------------------------------- | ------ | ---- |
| 13-01 | Creer bucket `avatars` (public read, authenticated write own)                                | ✅     | —    |
| 13-02 | Creer bucket `formations` (public read, admin write)                                         | ✅     | —    |
| 13-03 | Creer bucket `downloads` (authenticated read enrolled, admin write)                          | ✅     | —    |
| 13-04 | Creer bucket `blog` (public read, admin write)                                               | ✅     | —    |
| 13-05 | Policies RLS sur chaque bucket (MIME type validation via allowed_mime_types)                 | ✅     | —    |
| 13-06 | Composant upload generique (`<FileUpload>`) : image picker, preview, drag & drop, validation | ✅     | —    |
| 13-07 | Helper server-side : `uploadFile`, `deleteFile`, `getPublicUrl`, `getSignedUrl`              | ✅     | —    |
| 13-08 | Integration upload dans l'editeur admin formations (thumbnails, images blocs, downloads)     | ✅     | —    |

---

## EPIC-14 : Tests MVP

> Validation end-to-end des flows critiques avant mise en production.

| ID    | Story                                                                                                           | Statut | Prio  |
| ----- | --------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 14-01 | Test : inscription client → connexion → espace client                                                           | ✅     | 🟠 P1 |
| 14-02 | Test : consultante → connexion → espace consultante (formations lecture seule, reservations)                    | ✅     | 🟠 P1 |
| 14-03 | Test : admin → connexion → backoffice complet (formations CRUD, consultantes, paiements, parametres)            | ✅     | 🟠 P1 |
| 14-04 | Test : marketing_manager → connexion → backoffice filtre (dashboard + marketing uniquement)                     | ✅     | 🟡 P2 |
| 14-05 | Test : flow achat formation (page detail → Stripe Checkout → webhook → enrollment → acces formation)            | ✅     | 🔴 P0 |
| 14-06 | Test : flow reservation en 7 steps (service → lieu → consultante → creneau → contact → paiement → confirmation) | ✅     | 🔴 P0 |
| 14-07 | Test : flow reservation guest (sans compte) → compte cree automatiquement                                       | ✅     | 🟠 P1 |
| 14-08 | Test : annulation rdv (>= 48h → refund total, < 48h → penalite 50%)                                             | ✅     | 🟠 P1 |
| 14-09 | Test : booking on_site (pas de Stripe, confirmation manuelle consultante)                                       | ✅     | 🟠 P1 |
| 14-10 | Configuration Vitest (`vitest.config.ts`) + premiers tests unitaires (`vimeo.spec.ts`, `actions.spec.ts`)       | ✅     | 🟠 P1 |

---

# V1.5 (Phase 2 – 4-6 semaines)

---

## EPIC-15 : Blog ✅

> Systeme blog avec WYSIWYG, programmation de publication, SEO. (ADR-011)

| ID    | Story                                                                                                 | Statut | Prio  |
| ----- | ----------------------------------------------------------------------------------------------------- | ------ | ----- |
| 15-01 | Migration 00021 : enum `blog_status`, tables `blog_categories` + `blog_posts`                         | ✅     | 🟠 P1 |
| 15-02 | Migration 00021 : RLS policies pour blog (public read published, admin write)                         | ✅     | 🟠 P1 |
| 15-03 | Types TypeScript : `BlogPost`, `BlogCategory`, `BlogStatus`                                           | ✅     | 🟠 P1 |
| 15-04 | Admin : page `/admin/blog` — liste articles (titre, status, categorie, date publication) avec filtres | ✅     | 🟠 P1 |
| 15-05 | Admin : page `/admin/blog/nouveau` — creation article                                                 | ✅     | 🟠 P1 |
| 15-06 | Admin : page `/admin/blog/[id]/edit` — editeur WYSIWYG (Novel) + metadata SEO + scheduling            | ✅     | 🟠 P1 |
| 15-07 | Admin : gestion categories (CRUD simple)                                                              | ✅     | 🟠 P1 |
| 15-08 | Programmation publication : champ `scheduled_at`, cron publie automatiquement                         | ✅     | 🟠 P1 |
| 15-09 | Champs SEO : `meta_title`, `meta_description`, `og_image_url` editables dans le formulaire            | ✅     | 🟠 P1 |
| 15-10 | Nav admin : ajouter entree "Blog" dans la sidebar admin                                               | ✅     | 🟠 P1 |
| 15-11 | Page publique `/blog` : liste articles publies, pagination, filtre par categorie                      | ✅     | 🟠 P1 |
| 15-12 | Page publique `/blog/[slug]` : article complet avec meta tags SEO dynamiques                          | ✅     | 🟠 P1 |
| 15-13 | Sitemap dynamique pour le blog (`/sitemap.xml`)                                                       | ✅     | 🟡 P2 |

---

## EPIC-16 : Evenements (Admin)

> CRUD evenements depuis l'admin, inscriptions, paiement.

| ID    | Story                                                                                                                                     | Statut | Prio  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 16-01 | Admin : page `/admin/evenements` — liste evenements avec filtres (type, date, consultante)                                                | ✅     | 🟠 P1 |
| 16-02 | Admin : creation evenement (titre, description, date debut/fin, type online/presentiel/hybrid, lieu, prix, max participants, consultante) | ✅     | 🟠 P1 |
| 16-03 | Admin : edition evenement + publication / depublication                                                                                   | ✅     | 🟠 P1 |
| 16-04 | Nav admin : ajouter entree "Evenements" dans la sidebar                                                                                   | ✅     | 🟠 P1 |
| 16-05 | Inscription evenement : bouton "S'inscrire" sur page publique → Stripe Checkout (si payant) ou inscription directe (si gratuit)           | ✅     | 🟠 P1 |
| 16-06 | Gestion places disponibles (max_participants - count registrations)                                                                       | ✅     | 🟠 P1 |
| 16-07 | Consultante : vue evenements associes dans son espace (lecture seule)                                                                     | ✅     | 🟡 P2 |

---

## EPIC-17 : Zoom OAuth ✅

> Connexion Zoom par consultante, creation automatique de meetings.

| ID    | Story                                                                                                                                              | Statut | Prio  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 17-01 | OAuth flow : route `/api/zoom/callback`, stockage tokens dans `consultants`                                                                        | ✅     | 🟠 P1 |
| 17-02 | Bouton "Connecter Zoom" dans parametres consultante (onglet Integrations)                                                                          | ✅     | 🟠 P1 |
| 17-03 | Creation automatique meeting Zoom a la confirmation d'un booking teleconsultation (webhook Stripe, non-bloquant)                                   | ✅     | 🟠 P1 |
| 17-04 | Refresh token automatique via `getValidToken()` dans `lib/zoom/client.ts`                                                                          | ✅     | 🟠 P1 |
| 17-05 | Stockage `zoom_meeting_id`, `zoom_join_url`, `zoom_host_url` dans le booking apres creation du meeting                                             | ✅     | 🟠 P1 |
| 17-06 | Suppression automatique du meeting Zoom a l'annulation (consultante et client)                                                                     | ✅     | 🟠 P1 |
| 17-07 | Envoi du lien `zoom_join_url` au client et `zoom_host_url` a la consultante dans les emails de confirmation                                        | ✅     | 🟠 P1 |
| 17-08 | Template email `booking_confirmation` ameliore (mise en forme, bouton Zoom conditionnel via `{{zoom_block}}`) — migration 00034                    | ✅     | 🟡 P2 |
| 17-09 | Validation serveur : paiement `on_site` bloque pour les teleconsultations                                                                          | ✅     | 🟠 P1 |

---

## EPIC-18 : CRM Basique

> Notes clients, tags, liste contacts pour les consultantes.

| ID    | Story                                                                                                    | Statut | Prio  |
| ----- | -------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 18-01 | Page `/espace-consultante/crm` : liste contacts (clients avec bookings ou enrollments de la consultante) | ✅     | 🟠 P1 |
| 18-02 | Vue detail contact : historique bookings, formations, notes, tags                                        | ✅     | 🟠 P1 |
| 18-03 | Notes CRM : creer, editer, supprimer une note sur un client (privees par consultante, ADR-006)           | ✅     | 🟠 P1 |
| 18-04 | Tags CRM : creer tags, assigner a des clients, filtrer par tag                                           | ✅     | 🟠 P1 |
| 18-05 | Recherche contacts par nom, email                                                                        | ✅     | 🟡 P2 |

---

## EPIC-19 : Co-creation Formations

> Plusieurs consultantes sur une formation, partage de revenus.

| ID    | Story                                                                                      | Statut | Prio  |
| ----- | ------------------------------------------------------------------------------------------ | ------ | ----- |
| 19-01 | Admin : assigner des collaborateurs (`formation_collaborators`) depuis l'editeur formation | ✅     | 🟠 P1 |
| 19-02 | Revenue share configurable par collaborateur (pourcentage)                                 | ✅     | 🟠 P1 |
| 19-03 | Stripe transfers automatiques apres paiement (webhook → split entre co-creatrices)         | ✅     | 🟠 P1 |
| 19-04 | Consultante : voir formations co-creees dans son espace                                    | ✅     | 🟡 P2 |

---

## EPIC-20 : Analytics Basiques

> Dashboards avec metriques cles pour consultantes et admin.

| ID    | Story                                                                                       | Statut | Prio  |
| ----- | ------------------------------------------------------------------------------------------- | ------ | ----- |
| 20-01 | Dashboard consultante : revenus total et par mois, nombre d'enrollments, nombre de bookings | ✅     | 🟠 P1 |
| 20-02 | Dashboard admin : revenus plateforme (commissions), top formations, top consultantes        | ✅     | 🟠 P1 |
| 20-03 | Graphiques temporels (derniers 30j, 90j, 12 mois) — librairie chart (Recharts ou Chart.js)  | ✅     | 🟡 P2 |

---

# V2 (Phase 3 – 6-8 semaines)

---

## EPIC-21 : Email Marketing (Brevo)

> Campagnes, listes, templates marketing.

| ID    | Story                                                       | Statut | Prio  |
| ----- | ----------------------------------------------------------- | ------ | ----- |
| 21-01 | Integration API Brevo : gestion contacts, listes, campagnes | ✅     | 🟠 P1 |
| 21-02 | Sync contacts Supabase → Brevo (webhook ou batch)           | ✅     | 🟠 P1 |
| 21-03 | Admin / consultante : creer et envoyer des campagnes email  | ✅     | 🟠 P1 |
| 21-04 | Templates email marketing editables (WYSIWYG)               | ✅     | 🟠 P1 |
| 21-05 | Stats campagnes (opens, clicks) depuis Brevo API            | ✅     | 🟡 P2 |

---

## EPIC-22 : Automations ✅

> Triggers, actions automatiques, sequences.

| ID    | Story                                                                              | Statut | Prio  |
| ----- | ---------------------------------------------------------------------------------- | ------ | ----- |
| 22-01 | Moteur d'automations : trigger → condition → action                                | ✅     | 🟠 P1 |
| 22-02 | Triggers : post-achat formation, post-inscription, post-booking, delai apres event | ✅     | 🟠 P1 |
| 22-03 | Actions : envoyer email (Resend/Brevo), ajouter tag CRM, webhook externe           | ✅     | 🟠 P1 |
| 22-04 | UI consultante : creer / activer / desactiver des automations                      | ✅     | 🟠 P1 |
| 22-05 | Logs d'execution (`automation_logs`) consultables                                  | ✅     | 🟡 P2 |

---

## EPIC-23 : RGPD & Compliance

> Conformite, export, consentement.

| ID    | Story                                                                            | Statut | Prio  |
| ----- | -------------------------------------------------------------------------------- | ------ | ----- |
| 23-01 | Banner cookie avec consentement granulaire (analytics, marketing)                | ✅     | 🟠 P1 |
| 23-02 | Export RGPD : endpoint `/api/user/data-export` (JSON toutes les donnees du user) | ✅     | 🟠 P1 |
| 23-03 | Droit a l'effacement : soft delete 30j → hard delete (cron)                      | ✅     | 🟠 P1 |
| 23-04 | Notifications in-app (badge sur icone user, table `notifications`)               | ✅     | 🟡 P2 |

---

# V2.5 (Phase intermediaire – fonctionnalites ajoutees en continu)

---

## EPIC-25 : Replay Lives ✅

> Gestion et diffusion de lives enregistres (replays Vimeo) depuis l'admin et page publique.

| ID    | Story                                                                                                                             | Statut | Prio  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 25-01 | Migration 00032 : table `replay_lives` (titre, description, vimeo_id, thumbnail_url, is_published, published_at, consultante_id) | ✅     | 🟠 P1 |
| 25-02 | Types TypeScript : `ReplayLive` dans `database.ts`                                                                                | ✅     | 🟠 P1 |
| 25-03 | Lib Vimeo : `src/lib/vimeo.ts` — helpers `getVideoMetadata`, `getVideoThumbnail`, validation video_id                            | ✅     | 🟠 P1 |
| 25-04 | Tests unitaires : `src/lib/vimeo.spec.ts` (couverture helpers Vimeo)                                                             | ✅     | 🟡 P2 |
| 25-05 | Admin : page `/admin/replay-lives` — liste des replays (titre, status, date publication, consultante)                            | ✅     | 🟠 P1 |
| 25-06 | Admin : page `/admin/replay-lives/nouveau` — formulaire creation replay (titre, vimeo_id, thumbnail auto-fetch, description)     | ✅     | 🟠 P1 |
| 25-07 | Admin : page `/admin/replay-lives/[id]/edit` — edition + publication / depublication                                             | ✅     | 🟠 P1 |
| 25-08 | Server Actions admin : `createReplayLive`, `updateReplayLive`, `deleteReplayLive`, `togglePublished`                             | ✅     | 🟠 P1 |
| 25-09 | Nav admin : entree "Replay Lives" dans la sidebar                                                                                 | ✅     | 🟠 P1 |
| 25-10 | Page publique `/replay-lives` : hero + carousel des replays publies (composants `replay-hero`, `replay-carousel`, `replay-card`) | ✅     | 🟠 P1 |
| 25-11 | Embed Vimeo responsive sur la page publique (player integre dans la replay-card)                                                  | ✅     | 🟠 P1 |
| 25-12 | Route `/replay-lives` ajoutee au middleware (acces public sans auth)                                                              | ✅     | 🟠 P1 |

---

## EPIC-26 : Ameliorations Formations & Booking ✅

> Fonctionnalites avancees ajoutees sur le systeme de formations et de reservation.

| ID    | Story                                                                                                                                  | Statut | Prio  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 26-01 | Migration 00030 : table `training_providers` (organismes de formation, gestion multi-provider)                                         | ✅     | 🟡 P2 |
| 26-02 | Page formations publique : ordre des modules configurable, refactorisation en composant `FormationsList`                               | ✅     | 🟡 P2 |
| 26-03 | Notification admin a la publication d'un article de blog (`blog post published`)                                                       | ✅     | 🟡 P2 |
| 26-04 | Editeur WYSIWYG : support alignement texte (gauche, centre, droite) dans Novel                                                         | ✅     | 🟡 P2 |
| 26-05 | Slugification automatique des slugs d'articles de blog a la creation                                                                   | ✅     | 🟡 P2 |
| 26-06 | Validation date de programmation blog (scheduled_at doit etre dans le futur)                                                           | ✅     | 🟡 P2 |
| 26-07 | Mise a jour footer et liens de navigation (clarification labels, liens sociaux)                                                        | ✅     | 🟡 P2 |

---

# V3 (Phase 4 – Futur)

---

## EPIC-24 : CRM & Analytics avances ✅

> Fonctionnalites CRM et analytics avancees (deplacees depuis EPIC-23).

| ID    | Story                                                                                             | Statut | Prio  |
| ----- | ------------------------------------------------------------------------------------------------- | ------ | ----- |
| 24-01 | CRM avance : timeline interactions unifiee, score client auto (0-100), segments par regles JSONB  | ✅     | 🟡 P2 |
| 24-02 | Analytics avances : funnel conversion, retention par cohorte (heatmap), LTV / top clients        | ✅     | 🟡 P2 |

---

## EPIC-27 : Futur

> Fonctionnalites long-terme.

| ID    | Story                                         | Statut | Prio  |
| ----- | --------------------------------------------- | ------ | ----- |
| 27-01 | App mobile (Expo) ou PWA                      | ⬜     | 🟡 P2 |
| 27-02 | API publique (REST ou GraphQL)                | ⬜     | 🟡 P2 |
| 27-03 | Avis / reviews sur formations et consultantes | ⬜     | 🟡 P2 |
| 27-04 | Programme de fidelite                         | ⬜     | 🟡 P2 |
| 27-05 | Multi-langue (i18next)                        | ⬜     | 🟡 P2 |

---

## Compteur global

| Statut            | Nombre   |
| ----------------- | -------- |
| ✅ Termine        | ~159     |
| 🔶 Partiel        | ~2       |
| ⬜ A faire        | ~6       |
| **Total stories** | **~167** |

### Prochaines priorites

1. **EPIC-14** : Tests MVP — validation end-to-end des flows critiques
2. **EPIC-17** : Zoom OAuth — ✅ terminé (configurer les clés Zoom en prod pour activer)
3. **07-08** : Seeds `consultant_locations` manquantes dans `seed.sql`

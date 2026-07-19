# Prod Readiness — Stripe & E2E

> Suivi de la mise en production : branchement Stripe reel et validation end-to-end
> des flux d'argent.
>
> Reference : [TASKLIST.md](./TASKLIST.md) | [REDESIGN_TASKLIST.md](./REDESIGN_TASKLIST.md)
>
> Derniere mise a jour : 2026-07-20

## Legende

| Symbole | Signification                              |
| ------- | ------------------------------------------ |
| ✅      | Termine et verifie                         |
| 🔶      | En cours / partiellement fait              |
| ⬜      | A faire                                    |
| 🚫      | Bloque (dependance externe)                |

## Decisions actees (2026-07-20)

| Sujet          | Decision                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------- |
| Compte Stripe  | Compte existant, **mode test d'abord**, bascule live seulement apres validation E2E complete |
| Modele Connect | Confirme : plateforme = Question d'Allaitement, comptes **Express** par consultante,          |
|                | commission plateforme via `application_fee_amount` (destination charge)                       |
| Perimetre E2E  | N1 + N2 + N3, **entierement sur donnees de test**                                            |
| Priorite       | Stripe + E2E avant refonte design et contenu                                                  |

## Vue d'ensemble

| Phase                                   | Statut | Bloque par |
| --------------------------------------- | ------ | ---------- |
| Phase 0 — Prerequis externes            | ⬜     | —          |
| Phase 1 — Verification config Connect   | 🚫     | Phase 0-1  |
| Phase 2 — E2E N1 (seed + webhook simule) | ✅     | —          |
| Phase 3 — E2E N2 (Playwright navigateur) | ⬜     | Phase 0-2  |
| Phase 4 — E2E N3 (consultante + refund)  | ⬜     | Phase 3    |
| Phase 5 — Durcissement avant live        | ⬜     | Phase 4    |

---

## Phase 0 — Prerequis externes

> A faire hors session Claude (OAuth et installation locale).

| ID  | Tache                                                                     | Statut | Responsable |
| --- | ------------------------------------------------------------------------- | ------ | ----------- |
| 0-1 | `/mcp` en session interactive → autoriser `plugin:stripe:stripe`          | ⬜     | Theo        |
| 0-2 | `brew install stripe/stripe-cli/stripe` puis `stripe login`               | ⬜     | Theo        |
| 0-3 | Confirmer que les cles `sk_test_` / `whsec_` de `.env.local` sont les bonnes | ⬜   | Theo        |

> **0-3 note** : `.env.local` contient deja une cle `sk_test_`. A confirmer qu'elle
> vient bien du compte Stripe cible et non d'un compte jetable — sinon les comptes
> Express crees ne seront pas rattaches.

---

## Phase 1 — Verification config Connect

> Necessite le MCP Stripe authentifie (0-1).

| ID  | Tache                                                                                   | Statut | Prio  |
| --- | --------------------------------------------------------------------------------------- | ------ | ----- |
| 1-1 | Verifier que Connect est active en mode test + profil plateforme rempli                 | ⬜     | 🔴 P0 |
| 1-2 | Verifier `country: "FR"` / `business_type: "individual"` vs consultantes en societe      | ⬜     | 🟠 P1 |
| 1-3 | Verifier que `commission_rate` couvre les frais Stripe (1,5 % + 0,25 €)                 | ⬜     | 🔴 P0 |
| 1-4 | Definir la responsabilite des pertes / chargebacks (plateforme sur destination charge)   | ⬜     | 🔴 P0 |
| 1-5 | Calendrier de payout des comptes Express                                                 | ⬜     | 🟠 P1 |
| 1-6 | TVA sur la commission plateforme + facturation                                           | ⬜     | 🟠 P1 |

> **1-2 note** : [connect.ts](../src/lib/stripe/connect.ts) force `business_type: "individual"`.
> Une consultante en societe fera echouer l'onboarding Express → rendre le champ dynamique.
>
> **1-3 note** : avec `application_fee_amount` + `transfer_data.destination`, la plateforme
> supporte les frais Stripe. Sur les petits montants, une commission trop basse devient
> negative en net.

---

## Phase 2 — E2E N1 : seed + webhooks simules

> Objectif : rejouer les payloads Stripe signes sur `/api/webhooks/stripe` sans
> navigateur, et verifier le fulfillment en base. Cible : < 30 s, executable en CI.

| ID  | Tache                                                                          | Statut | Prio  |
| --- | ------------------------------------------------------------------------------ | ------ | ----- |
| 2-1 | `scripts/e2e/lib/env.mjs` — chargement env + client Supabase admin             | ✅     | 🔴 P0 |
| 2-2 | `scripts/e2e/seed-test-data.mjs` — fixtures deterministes (client, consultante, service, duree, accompagnement, evenement) | ✅ | 🔴 P0 |
| 2-3 | `scripts/e2e/lib/stripe-events.mjs` — construction + signature des payloads     | ✅     | 🔴 P0 |
| 2-4 | Scenario `formation` : checkout.session.completed → `formation_enrollments` + `payments` | ✅ | 🔴 P0 |
| 2-5 | Scenario `booking` : checkout.session.completed → `bookings` (confirmed) + `payments` | ✅ | 🔴 P0 |
| 2-6 | Scenario `event` : checkout.session.completed → `event_registrations`           | ✅     | 🟠 P1 |
| 2-7 | Scenario `charge.refunded` total → `payments.status = refunded`                 | ✅     | 🔴 P0 |
| 2-8 | Scenario `charge.refunded` partiel → `payments.status = partially_refunded`     | ✅     | 🟠 P1 |
| 2-9 | Scenario `account.updated` → `consultants.stripe_account_status` (3 transitions) | ✅     | 🟠 P1 |
| 2-10 | Test signature invalide → 400 + mauvais secret → 400                          | ✅     | 🔴 P0 |
| 2-11 | `scripts/e2e/cleanup-test-data.mjs` — suppression des fixtures                 | ✅     | 🟠 P1 |
| 2-12 | Runner `scripts/e2e/run-n1.mjs` + script npm `test:e2e:n1`                     | ✅     | 🔴 P0 |
| 2-13 | Ajouter `test:e2e:n1` a la CI GitHub Actions                                   | ⬜     | 🟠 P1 |

### Utilisation

```bash
pnpm dev                # dans un terminal
pnpm test:e2e:n1        # dans un autre
```

Variables optionnelles : `E2E_APP_URL` (defaut `http://localhost:3000`),
`E2E_KEEP_DATA=1` pour conserver les fixtures apres la passe.

**Resultat au 2026-07-20 : 9/9 scenarios passes** (+ `pnpm lint` clean,
214 tests unitaires verts).

Le harnais a ete valide par mutation : avec un `STRIPE_WEBHOOK_SECRET` errone,
7 scenarios sur 9 tombent — les assertions mordent reellement, la suite n'est
pas verte a vide.

### Fixtures

Tous les IDs partagent le prefixe `e2e00000-0000-4000-8000-`, reperables en base
et supprimables en bloc. Le compte Connect (`acct_e2e_test_consultant`) est fictif
et n'est jamais envoye a Stripe — N1 ne fait aucun appel reseau vers Stripe.
`assertTestMode()` refuse de demarrer si `STRIPE_SECRET_KEY` commence par `sk_live_`.

### Constats releves pendant la Phase 2

| # | Constat                                                                                              | A traiter en |
| - | ---------------------------------------------------------------------------------------------------- | ------------ |
| A | `handleBookingConfirmation` ne verifie pas que le creneau est toujours libre → double booking possible si deux clients paient le meme creneau | Phase 4      |
| B | L'insert du booking utilise `.insert()` sans `onConflict`, et l'erreur retournee n'est pas lue : une redelivery Stripe echoue en silence | Phase 4      |
| C | `/api/stripe/connect` ne verifie pas que l'utilisateur a le role consultante — il se contente de chercher la ligne `consultants` | Phase 5 (5-8) |

---

## Phase 3 — E2E N2 : Playwright navigateur

> `playwright` est en devDependencies mais **aucun `playwright.config.ts` ni dossier
> `e2e/` n'existe**. Tout est a creer.
>
> Necessite `stripe listen --forward-to localhost:3000/api/webhooks/stripe` en parallele.

| ID  | Scenario                                                                             | Statut | Prio  |
| --- | ------------------------------------------------------------------------------------ | ------ | ----- |
| 3-1 | `playwright.config.ts` + dossier `e2e/` + webServer Next                             | ⬜     | 🔴 P0 |
| 3-2 | A — Reservation : `/reserver` 7 steps → Checkout `4242…` → `/reserver/confirmation`  | ⬜     | 🔴 P0 |
| 3-3 | B — Guest checkout : sans compte → creation auto + email "finalisez votre compte"    | ⬜     | 🟠 P1 |
| 3-4 | C — Accompagnement en ligne : `/accompagnements/[slug]` → achat → acces contenu      | ⬜     | 🔴 P0 |
| 3-5 | D — Booking `on_site` : pas de Stripe, confirmation manuelle consultante             | ⬜     | 🟠 P1 |
| 3-6 | Verification post-checkout en base (le webhook a bien tourne)                         | ⬜     | 🔴 P0 |

---

## Phase 4 — E2E N3 : boucle consultante + refund

| ID  | Scenario                                                                          | Statut | Prio  |
| --- | --------------------------------------------------------------------------------- | ------ | ----- |
| 4-1 | Login consultante → voit le RDV → confirme                                        | ⬜     | 🔴 P0 |
| 4-2 | Annulation ≥ 48 h → refund total, montant verifie via l'API Stripe (pas juste la DB) | ⬜   | 🔴 P0 |
| 4-3 | Annulation < 48 h → penalite 50 %, montant verifie via l'API Stripe                | ⬜     | 🔴 P0 |
| 4-4 | `charge.refunded` remet `payments` **et** `bookings` en coherence                  | ⬜     | 🔴 P0 |
| 4-5 | Onboarding Connect : `/api/stripe/connect` → Express test → `account.updated` → `active` | ⬜ | 🔴 P0 |
| 4-6 | Splits collaborateurs (`processCollaboratorSplits`) sur achat d'accompagnement     | ⬜     | 🟠 P1 |

---

## Phase 5 — Durcissement avant live

| ID  | Tache                                                                        | Statut | Prio  | Ref TASKLIST |
| --- | ---------------------------------------------------------------------------- | ------ | ----- | ------------ |
| 5-1 | Rate limiting : in-memory → Upstash (casse en serverless multi-instance)     | ⬜     | 🔴 P0 | 02-12        |
| 5-2 | CSP (Content-Security-Policy) manquant                                       | ⬜     | 🟠 P1 | 02-13        |
| 5-3 | Validation MIME type sur les uploads Storage                                 | ⬜     | 🟡 P2 | 02-14        |
| 5-4 | Seeds `consultant_locations` + `available_locations`                         | ⬜     | 🟠 P1 | 07-08        |
| 5-5 | Cles live sur Vercel (`sk_live`, `pk_live`)                                  | ⬜     | 🔴 P0 | —            |
| 5-6 | Webhook endpoint prod enregistre + `whsec_` prod                             | ⬜     | 🔴 P0 | —            |
| 5-7 | CGV / mentions legales coherentes avec le modele commission                   | ⬜     | 🔴 P0 | —            |
| 5-8 | Relire `/api/stripe/connect` : pas de verification de role consultante        | ⬜     | 🟠 P1 | —            |

---

## Hors perimetre immediat

Reportes apres la mise en prod du flux de paiement :

- Refonte design phases 5 a 7 — voir [REDESIGN_TASKLIST.md](./REDESIGN_TASKLIST.md)
- Contenu Carole (C-01 a C-09) : photos, temoignages, bio, chiffres, liens sociaux
- EPIC-27 (mobile, API publique, reviews, fidelite, multi-langue)

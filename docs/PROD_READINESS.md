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
| Phase 0 — Prerequis externes            | ✅     | —          |
| Phase 1 — Verification config Connect   | ⬜     | —          |
| Phase 2 — E2E N1 (seed + webhook simule) | ✅     | —          |
| Phase 3 — E2E N2 (Playwright navigateur) | ⬜     | Phase 0-2  |
| Phase 4 — E2E N3 (consultante + refund)  | ⬜     | Phase 3    |
| Phase 5 — Durcissement avant live        | ⬜     | Phase 4    |

---

## Phase 0 — Prerequis externes

> A faire hors session Claude (OAuth et installation locale).

| ID  | Tache                                                                     | Statut | Responsable |
| --- | ------------------------------------------------------------------------- | ------ | ----------- |
| 0-1 | `/mcp` en session interactive → autoriser `plugin:stripe:stripe`          | 🔶     | Theo        |
| 0-2 | `brew install stripe/stripe-cli/stripe` puis `stripe login`               | ✅     | Theo        |
| 0-4 | Recuperer la vraie `pk_test_` de la sandbox → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Theo |

> **0-1** : OAuth autorise sur une autre session, mais le serveur MCP n'est pas
> rebranche sur la session courante. Non bloquant : tout ce que demande la Phase 1
> se lit via le CLI / l'API REST.
>
> **0-2 fait le 2026-07-20** : `stripe` 1.43.8. Attention, `stripe login` a pointe sur
> le compte **parent** `acct_1TH8BiDSUwnGIIxE` (« caroleherve.fr »), pas sur la sandbox,
> et le CLI stocke une `rk_live_` (expire le 2026-10-18). Toujours passer
> `--api-key "$STRIPE_SECRET_KEY"` pour rester sur la sandbox :
>
> ```bash
> stripe listen --api-key "$STRIPE_SECRET_KEY" --forward-to localhost:3000/api/webhooks/stripe
> ```
>
> **0-4 resolu le 2026-07-20** : `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` valait
> `pk_test_placeholder`. Sans vraie cle publique, Checkout / Elements ne se chargent pas
> dans le navigateur. La `pk_test_` du CLI (`pk_test_51TH8Bi…`) appartient au compte
> parent — **ne pas l'utiliser** : il faut celle de la sandbox `acct_1TH8C3DSQDjxnDDN`,
> a copier depuis le dashboard (Developers → API keys, sandbox selectionnee).
| 0-3 | Confirmer que les cles `sk_test_` / `whsec_` de `.env.local` sont les bonnes | ✅   | Theo        |

> **0-3 verifie le 2026-07-20** : la cle `sk_test_` pointe sur `acct_1TH8C3DSQDjxnDDN`
> — « Environnement de test caroleherve.fr (Theo) », `country: FR`, `default_currency: eur`,
> email `carole.herve@questiondallaitement.com`. C'est bien le compte cible.
> Connect est actif : deux comptes connectes existent deja
> (`acct_1TO0AEDjYyOKzuau`, `acct_1TO08DDSQDoa8N5c`), tous deux `charges_enabled: false`
> (onboarding non termine). Creation de PaymentIntent OK.
>
> ⚠️ A verifier en 1-1 : sur la plateforme, `charges_enabled: false`,
> `payouts_enabled: false` et `card_payments` / `transfers` en `inactive`.
> Comportement normal en Sandbox, mais a lever avant tout test de payout reel.
> Aussi : `business_type: "company"` cote plateforme, alors que
> [connect.ts](../src/lib/stripe/connect.ts) force `individual` cote consultante (cf. 1-2).

---

## Phase 1 — Verification config Connect

> Necessite le MCP Stripe authentifie (0-1).

| ID  | Tache                                                                                   | Statut | Prio  |
| --- | --------------------------------------------------------------------------------------- | ------ | ----- |
| 1-1 | Verifier que Connect est active en mode test + profil plateforme rempli                 | ✅     | 🔴 P0 |
| 1-2 | Verifier `country: "FR"` / `business_type: "individual"` vs consultantes en societe      | ✅     | 🟠 P1 |
| 1-3 | Verifier que `commission_rate` couvre les frais Stripe (1,5 % + 0,25 €)                 | ✅     | 🔴 P0 |
| 1-4 | Definir la responsabilite des pertes / chargebacks (plateforme sur destination charge)   | ✅     | 🔴 P0 |
| 1-5 | Calendrier de payout des comptes Express                                                 | ✅     | 🟠 P1 |
| 1-6 | TVA sur la commission plateforme + facturation                                           | ⬜     | 🟠 P1 |

> **1-2 note** : [connect.ts](../src/lib/stripe/connect.ts) force `business_type: "individual"`.
> Une consultante en societe fera echouer l'onboarding Express → rendre le champ dynamique.
>
### Constats du 2026-07-20 (lus via l'API, sandbox `acct_1TH8C3DSQDjxnDDN`)

**1-1** — Connect actif, deux comptes crees. Profil plateforme incomplet mais non bloquant
en sandbox : `branding.display_name`, `branding.logo` et `branding.icon` sont vides.
A remplir avant le live (c'est ce que voit la consultante pendant l'onboarding Express).
`statement_descriptor` = `ENVIRONNEMENT DE TEST` — a changer avant le live.

**1-2** — Le compte Express de Carole est bien `country: FR`, `business_type: individual`,
coherent avec [connect.ts](../src/lib/stripe/connect.ts). Le risque reste theorique tant
qu'il n'y a qu'une consultante en nom propre ; il se materialise a la premiere consultante
en societe. Rendre le champ dynamique reste a faire.

**1-4 — tranche** : `controller.losses.payments = "application"` sur le compte Express.
La **plateforme** supporte les chargebacks, conformement au modele destination charge.
A repercuter dans les CGV (5-7).

**1-5 — tranche** : payout `interval: daily`, `delay_days: 7` sur les comptes Express
(defaut FR). Cote plateforme : `daily` / `delay_days: 3`. Rien a changer.

**1-3 — calcul.** Frais Stripe cartes EEE : 1,5 % + 0,25 €, a la charge de la plateforme
(`controller.fees.payer = "application_express"`). Net plateforme :

```
net = prix x (taux - 0,015) - 0,25
seuil de rentabilite : prix = 0,25 / (taux - 0,015)
```

| Taux | Seuil au-dela duquel la commission est nette positive |
| ---- | ----------------------------------------------------- |
| 15 % | 1,85 €                                                |
| 10 % | 2,94 €                                                |
| 5 %  | 7,14 €                                                |
| 2 %  | 50,00 €                                               |
| 1,5 %| jamais                                                |

A 15 % sur les prix reels du catalogue (27 € a 519 €), la marge est large :
27 € → 3,40 € net ; 90 € → 11,90 € net ; 519 € → 69,82 € net. **Le taux de 15 % est sain.**

> ⚠️ **Le vrai probleme n'est pas le taux, c'est la ligne a 0 %.**
> `carole-herve` (compte reel, `acct_1TO0AEDjYyOKzuau`) a `commission_rate = 0.00`.
> Avec un destination charge et `application_fee_amount = 0`, l'integralite du montant
> part vers le compte Express, mais les frais Stripe restent debites du solde
> **plateforme** — qui devient negatif a chaque vente (-0,66 € sur une vente a 27 €,
> -8,04 € sur le pack a 519 €) et devra etre reapprovisionne.
>
> C'est logique sur le fond (Carole ne se prend pas de commission a elle-meme), mais la
> forme est mauvaise. Trois sorties possibles, **decision metier a prendre** :
>
> 1. Fixer un `commission_rate` plancher pour Carole : couvre les frais Stripe, solde
>    plateforme a l'equilibre, l'argent lui revient quand meme via son compte Express.
>    **Attention : 2 % ne suffit pas** — seuil a 50 €, alors que le catalogue commence
>    a 27 €. Minimum reel 2,43 %.
> 2. Sortir Carole du flux Connect : paiement direct sur le compte plateforme, sans
>    `transfer_data`. Plus propre comptablement, mais c'est un chemin de code separe.
> 3. Assumer le solde negatif et provisionner la plateforme. Deconseille.

> **Tranche le 2026-07-20 : option 1, taux fixe a 5 %.** `consultants.commission_rate`
> de `carole-herve` passe de `0.00` a `5.00` (ecriture directe sur le projet Supabase
> `chhrhrijtelevozjccqj`, pas de migration — a rejouer si la base est reseedee).
> Marge nette plateforme : 27 € → +0,70 € ; 90 € → +2,90 € ; 519 € → +17,95 €.

**Compte orphelin** : `acct_1TO08DDSQDoa8N5c` est de type **Standard**, pas Express
(`fees.payer = "account"`, `losses.payments = "stripe"`) et n'est rattache a aucune ligne
`consultants`. Incoherent avec le modele acte. A supprimer avant le live.

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
| 3-1 | `playwright.config.ts` + dossier `e2e/` + webServer Next                             | ✅     | 🔴 P0 |
| 3-2 | A — Reservation : `/reserver` 8 steps → session Checkout verifiee cote API           | ✅     | 🔴 P0 |
| 3-3 | B — Guest checkout : sans compte → creation auto + email "finalisez votre compte"    | ⬜     | 🟠 P1 |
| 3-4 | C — Accompagnement en ligne : `/accompagnements/[slug]` → achat → acces contenu      | ⬜     | 🔴 P0 |
| 3-5 | D — Booking `on_site` : pas de Stripe, confirmation manuelle consultante             | ⬜     | 🟠 P1 |
| 3-6 | Verification post-checkout en base (le webhook a bien tourne)                         | 🚫     | 🔴 P0 |

### Constats de la Phase 3 (2026-07-20)

**🔴 Bug production trouve et corrige — la reservation en ligne etait cassee.**
`createBooking` faisait un embed PostgREST ambigu `profiles (...)` sur `consultants`.
Depuis l'ajout de `crm_contact_tags`, deux relations `consultants`↔`profiles` existent,
donc PostgREST repond `PGRST201`. L'erreur n'etait pas lue (`const { data: consultant }`
sans `error`), `consultant` tombait a `null`, et la cliente recevait
« La consultante n'a pas configure son compte Stripe » — un message qui envoie
diagnostiquer Stripe alors que le probleme est une requete SQL.

**11 sites corriges** en `profiles!consultants_id_fkey` : reservation, page de
confirmation, espace consultante (reservations, emails), admin (blog x2, marketing x2,
paiements x3). Aucun test N1 ne pouvait le trouver : le harnais injecte les payloads
apres la creation de session et court-circuite exactement le chemin casse.

**3-6 bloque : le Checkout hebergee n'est pas pilotable de facon fiable.** Les champs
carte ne sont dans aucune frame accessible, l'accordeon des moyens de paiement est
present a certains runs et absent a d'autres, et la page charge des frames hCaptcha.
Completer une session par API est impossible : `payment_intent` reste `null` tant que
la session est ouverte.

**Decision : N2 s'arrete a la redirection** et verifie la session cote API (montant,
devise, email, `metadata.type`, `reference_id`, `starts_at`, `platform_fee_cents`).
Le fulfillment post-paiement reste couvert par N1, qui rejoue les webhooks signes.
Le trou de couverture assume : personne ne verifie de bout en bout qu'un vrai paiement
carte declenche le webhook. A lever manuellement une fois avant le live.

**Piege d'enchainement** : N1 supprime les fixtures partagees en fin de passe, donc
`test:e2e:n1` suivi de `test:e2e:n2` faisait echouer N2 sur une base vide — en timeout
d'UI, pas en erreur explicite. `e2e/global-setup.ts` resseme avant chaque passe N2.

**Utilisation** :

```bash
pnpm dev            # terminal 1
pnpm test:e2e:n2    # terminal 2 (seed automatique)
```

`stripe listen` n'est pas necessaire pour 3-2 : aucun webhook n'est declenche puisque
la session n'est jamais completee.

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

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
| Phase 1 — Verification config Connect   | 🔶     | reste 1-6 (TVA) |
| Phase 2 — E2E N1 (seed + webhook simule) | ✅    | —          |
| Phase 3 — E2E N2 (Playwright navigateur) | 🔶     | 3-1 a 3-5 faits ; 3-6 bloque |
| Phase 4 — E2E N3 (consultante + refund)  | ✅     | —          |
| Phase 5 — Durcissement avant live        | 🔶     | 5-2 fait ; 5-5/5-6/5-7 dependent de Theo |
| Phase 6 — Templates d'email en admin     | ✅     | —          |

---

## Phase 0 — Prerequis externes

> A faire hors session Claude (OAuth et installation locale).

| ID  | Tache                                                                     | Statut | Responsable |
| --- | ------------------------------------------------------------------------- | ------ | ----------- |
| 0-1 | `/mcp` en session interactive → autoriser `plugin:stripe:stripe`          | 🔶     | Theo        |
| 0-2 | `brew install stripe/stripe-cli/stripe` puis `stripe login`               | ✅     | Theo        |
| 0-3 | Confirmer que les cles `sk_test_` / `whsec_` de `.env.local` sont les bonnes | ✅   | Theo        |
| 0-4 | ~~Recuperer la vraie `pk_test_` de la sandbox~~ — **sans objet**, la variable n'est jamais lue | ✅ | Theo |

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
>
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
| 2-13 | Ajouter `test:e2e:n1` a la CI GitHub Actions                                   | ✅     | 🟠 P1 |

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

### N1 en CI (2-13, fait le 2026-07-21)

Job `e2e-n1` dans [ci.yml](../.github/workflows/ci.yml), separe de `test` pour ne pas
ralentir lint et build.

> ⚠️ **N1 ecrit dans la base de production.** Il n'existe pas de base dediee aux
> tests : le harnais seed ses fixtures dans `chhrhrijtelevozjccqj`, joue les scenarios
> et nettoie. Deux consequences assumees le 2026-07-21 :
>
> - la `SUPABASE_SERVICE_ROLE_KEY` — celle qui contourne toutes les RLS — vit dans les
>   secrets du depot, lisible par tout workflow ;
> - les IDs de fixtures sont fixes, donc deux runs simultanes se marchent dessus. Le
>   job declare `concurrency: e2e-n1` avec `cancel-in-progress: false` pour les
>   serialiser — annuler un run en plein scenario laisserait ses fixtures derriere lui.
>
> L'alternative propre reste un projet Supabase dedie a la CI. Ecartee pour l'instant :
> il faudrait y rejouer les migrations et maintenir deux schemas alignes.

Le job refuse de demarrer sur une cle `sk_live_`, avant meme de lancer l'application,
et nettoie les fixtures avec `if: always()` — un echec en plein scenario ne doit pas
laisser de lignes derriere lui. Les PR venant d'un fork sont exclues : GitHub ne leur
expose pas les secrets, le job echouerait sans raison utile.

Secrets attendus : `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`,
`E2E_SUPABASE_SERVICE_ROLE_KEY`, `E2E_STRIPE_SECRET_KEY`, `E2E_STRIPE_WEBHOOK_SECRET`.

### Fixtures

Tous les IDs partagent le prefixe `e2e00000-0000-4000-8000-`, reperables en base
et supprimables en bloc. Le compte Connect (`acct_e2e_test_consultant`) est fictif
et n'est jamais envoye a Stripe — N1 ne fait aucun appel reseau vers Stripe.
`assertTestMode()` refuse de demarrer si `STRIPE_SECRET_KEY` commence par `sk_live_`.

### Constats releves pendant la Phase 2

| # | Constat                                                                                              | A traiter en |
| - | ---------------------------------------------------------------------------------------------------- | ------------ |
| A | `handleBookingConfirmation` ne verifie pas que le creneau est toujours libre → double booking possible si deux clients paient le meme creneau | ✅ Phase 4 (4-7) |
| B | L'insert du booking utilise `.insert()` sans `onConflict`, et l'erreur retournee n'est pas lue : une redelivery Stripe echoue en silence | ✅ Phase 4 (4-8) |
| C | `/api/stripe/connect` ne verifie pas que l'utilisateur a le role consultante — il se contente de chercher la ligne `consultants` | ✅ 4-5 |

---

## Phase 3 — E2E N2 : Playwright navigateur

> Harnais en place : [playwright.config.ts](../playwright.config.ts), dossier `e2e/`,
> `pnpm test:e2e:n2`. `@playwright/test` remplace le paquet `playwright` (les deux
> cohabitaient en versions differentes, ce qui cassait la resolution du binaire).
>
> `stripe listen` n'est necessaire que pour les scenarios qui completent un paiement —
> ce que 3-2 ne fait pas (voir plus bas).

| ID  | Scenario                                                                             | Statut | Prio  |
| --- | ------------------------------------------------------------------------------------ | ------ | ----- |
| 3-1 | `playwright.config.ts` + dossier `e2e/` + webServer Next                             | ✅     | 🔴 P0 |
| 3-2 | A — Reservation : `/reserver` 8 steps → session Checkout verifiee cote API           | ✅     | 🔴 P0 |
| 3-3 | B — Guest checkout : sans compte → creation auto + email "finalisez votre compte"    | ✅     | 🟠 P1 |
| 3-4 | C — Accompagnement en ligne : `/accompagnements/[slug]` → achat → session Checkout    | ✅     | 🔴 P0 |
| 3-5 | D — Booking `on_site` : pas de Stripe, confirmation manuelle consultante             | ✅     | 🟠 P1 |
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

### Constats de 3-4 (2026-07-21)

**🟠 Bug corrige — l'achat d'accompagnement echouait en silence.**
`purchase-button.tsx` faisait `if (result.success && ...) redirect` sans jamais lire
le cas `success: false`. Or `purchaseFormation` echoue sur six chemins (deja inscrite,
accompagnement depublie, consultante sans compte Connect, erreur Stripe…). Dans tous
ces cas le bouton cessait simplement de tourner : aucun message, aucune trace. La
cliente reclique indefiniment sans savoir pourquoi. Le composant affiche desormais
`result.error` dans un `role="alert"` (`data-testid="purchase-error"`).

Le scenario « consultante sans compte Connect » du spec existe pour prouver que ce
garde-fou n'est pas du code mort : il a ete verifie rouge en desactivant l'affichage.

**Connexion requise** : contrairement a la reservation, `purchaseFormation` refuse les
anonymes. Le spec passe par le vrai formulaire `/connexion`, ce qui couvre au passage
`handleLogin` → NextAuth. Deux consequences sur les fixtures :

- La cliente fixture porte desormais `email_verified: true` — `handleLogin` refuse les
  comptes non verifies avant meme d'appeler NextAuth.
- Son `password_hash` vient de `E2E_CLIENT_PASSWORD`, **jamais d'une valeur en dur** :
  les fixtures vivent dans une vraie base, donc un mot de passe lisible dans le depot
  ouvrirait ce compte a quiconque le clone. Variable absente → pas de hash pose, et
  seuls les scenarios connectes echouent (N1 n'ouvre jamais de session).

**Piege PostgREST** : un `upsert` multi-lignes part en un seul INSERT, et les colonnes
absentes d'une ligne y sont remplies par NULL. Ajouter `email_verified` a la seule
cliente violait la contrainte NOT NULL sur la ligne consultante. Les deux lignes d'un
upsert doivent porter exactement les memes cles.

**N2 n'est pas en CI** (contrairement a N1, cf. 2-13) : le job aurait besoin d'un vrai
compte Connect onboarde comme destinataire — Stripe rejette une session dont la
destination est fictive — et de `E2E_CLIENT_PASSWORD`. A trancher avant le live.

### Constats de 3-3 et 3-5 (2026-07-21)

**🔴 Le parcours invitee ne fonctionnait pas du tout.** Trois defauts qui se composent,
chacun suffisant a rendre le compte inaccessible :

1. **L'email ne partait jamais aux clientes payant en ligne.** `createBooking` cree le
   profil puis rend la main a Stripe ; l'envoi de `sendGuestAccountEmail` n'existait
   que dans la branche « paiement sur place ». Une invitee payait, sa reservation
   existait, un compte portait son adresse — et personne ne lui disait comment y
   acceder. L'envoi part desormais du webhook, avec les autres emails de checkout.
2. **Le lien de l'email etait mort.** Il pointait sur `/reset-password?email=...` alors
   que la page ne lit que `token` : toutes les invitees tombaient sur « Lien invalide ».
   Un vrai token a usage unique est maintenant pose sur le profil, valable 72 h.
3. **Meme avec un lien valide, la connexion echouait.** Les profils invites naissent
   `email_verified: false` et `handleResetPassword` ne touchait pas ce champ ; or
   `handleLogin` refuse les comptes non verifies. L'invitee posait son mot de passe
   puis se faisait renvoyer vers un email de confirmation qu'elle n'avait jamais recu.
   Poser son mot de passe via un lien recu par email vaut preuve de possession de
   l'adresse : le champ passe desormais a `true` a cette occasion.

La decision d'envoi porte sur l'absence de `password_hash`, pas sur « le profil vient
d'etre cree » : une cliente qui reserve deux fois en invitee sans finaliser son compte
doit recevoir le lien les deux fois. La logique est isolee dans
[`src/lib/auth/password-setup.ts`](../src/lib/auth/password-setup.ts), partagee par
`createBooking` et le webhook.

**🟠 Le paiement sur place etait propose en teleconsultation.** `createBooking` le
refuse — il n'y a pas de « place » ou regler — mais `StepPayment` affichait les deux
options quel que soit le lieu. La cliente ne decouvrait le refus qu'a la derniere
etape, apres avoir tout saisi. L'option est desormais filtree.

**Fixture ajoutee : `consultant_locations` (cabinet).** `/reserver` traite cette table
comme la source de verite pour cabinet et domicile ; seule la teleconsultation s'en
passe. Sans cette ligne, `available_locations` du type de consultation est filtre a
vide et le scenario « paiement sur place » n'a aucun lieu ou se derouler.

**Pourquoi 3-3 et 3-5 tiennent dans une seule passe** : `on_site` est le seul chemin ou
tout se joue en synchrone — pas de Stripe, pas de webhook, la reservation et le compte
existent des le retour de `createBooking`. Le meme parcours paye en ligne ne pourrait
rien affirmer de plus au navigateur, son email de finalisation partant du webhook.

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
| 4-1 | Login consultante → voit le RDV → confirme                                        | ✅     | 🔴 P0 |
| 4-2 | Annulation ≥ 48 h → refund total, montant verifie via l'API Stripe (pas juste la DB) | ✅   | 🔴 P0 |
| 4-3 | Annulation < 48 h → penalite 50 %, montant verifie via l'API Stripe                | ✅     | 🔴 P0 |
| 4-4 | `charge.refunded` remet `payments` **et** `bookings` en coherence                  | ✅     | 🔴 P0 |
| 4-5 | Onboarding Connect : `/api/stripe/connect` → Express test → `account.updated` → `active` | ✅ | 🔴 P0 |
| 4-6 | Splits collaborateurs sur achat d'accompagnement                                   | ✅     | 🟠 P1 |
| 4-7 | Constat A — double booking : contrainte d'unicite + remboursement automatique      | ✅     | 🔴 P0 |
| 4-8 | Constat B — l'insert du booking avale l'erreur : redelivery Stripe silencieuse     | ✅     | 🔴 P0 |
| 4-9 | Email prevenant la cliente du conflit de creneau et du remboursement               | ✅     | 🔴 P0 |

### 4-7 / 4-8 — decision du 2026-07-20

**4-8** : `handleBookingConfirmation` fait un `.insert()` sans lire `error`. Une
redelivery Stripe (retry sur timeout, ou rejeu manuel) heurte la cle primaire et
echoue en silence — Stripe croit l'evenement traite. Correctif : rendre l'insert
idempotent et faire remonter toute autre erreur pour que Stripe retente.

**4-7** : rien ne garantit que le creneau est encore libre au moment du fulfillment.
Une verification applicative laisse une fenetre entre le `SELECT` et l'`INSERT` : le
seul correctif etanche est une **contrainte d'unicite en base** sur (consultante,
creneau) pour les reservations actives.

**Tranche : remboursement automatique.** Quand le conflit est detecte, la cliente a
deja paye. Le webhook declenche un refund total via l'API Stripe et envoie un email
d'excuse. Ecarte : creer la reservation en statut « conflit » pour traitement manuel.

**4-9 — email de conflit, fait le 2026-07-21.** Le template `booking_slot_conflict`
est cree par [migration 00049](../supabase/migrations/00049_booking_slot_conflict_template.sql)
en **insertion seule** (regle 6-5), protege par `REQUIRED_TEMPLATES` (6-4), et editable
depuis l'admin comme les autres. Il annonce le montant rembourse et propose de choisir
un autre creneau.

L'envoi est non bloquant : le remboursement est deja parti quand il se declenche, et
faire echouer le webhook ferait retenter Stripe sur un evenement dont la partie argent
est terminee.

> **Trouve en ecrivant la migration** : `email_templates.name` n'avait **aucune
> contrainte d'unicite**, alors que `getTemplate()` fait un `.single()` dessus. Deux
> templates homonymes — que `createTemplate` n'empechait pas — auraient fait echouer la
> lecture, donc l'envoi, en silence. La migration 00049 ajoute
> `email_templates_name_unique`.

### Constats de 4-1 (2026-07-21)

**🔴 `cancelBooking` n'appartenait a personne.** L'action chargeait la reservation par
son seul ID :

```ts
.from("bookings").select(...).eq("id", bookingId).single()
```

`getSupabaseAndUser` ne verifie que l'authentification et rend un client **admin qui
contourne les RLS** — son propre commentaire dit que c'est a l'appelant de filtrer.
N'importe quel compte connecte, y compris une cliente, pouvait donc annuler la
reservation d'autrui a partir de son identifiant, et **declencher un vrai
remboursement Stripe**. `cancelBookingClient`, cote cliente, filtrait deja par
`client_id` : le motif etait connu, il manquait a un seul endroit.

Ajout de `.eq("consultant_id", user.id)`, plus le verrou de statut que la version
cliente appliquait deja (`cancelled`, `completed`, `no_show`) — sans quoi une
consultation honoree pouvait etre « annulee » et remboursee. La suppression de la
reunion Zoom passe apres ce controle : elle s'executait meme quand l'annulation etait
ensuite refusee.

**🟠 Six actions du module formations acceptaient n'importe quel identifiant.**
`createSection`, `updateSection`, `deleteSection`, `createBlock`, `updateBlock` et
`deleteBlock` ne verifiaient aucune appartenance : on pouvait modifier ou supprimer le
contenu de l'accompagnement d'une autre consultante. Meme cause, meme correctif —
[`src/lib/formations/authorization.ts`](../src/lib/formations/authorization.ts). La
regle autorise la proprietaire **ou** une collaboratrice declaree, ce que l'espace
consultante affiche deja ; `formation_collaborators` n'a pas de niveau de permission.

**Le rate limit de connexion cassait la suite.** `handleLogin` autorise 5 tentatives
par 5 minutes. Avec un login par scenario, la cinquieme echouait et les tests suivants
tombaient pour une raison etrangere a ce qu'ils verifiaient. `e2e/auth.setup.ts` ouvre
desormais une session par role, une seule fois, et les specs la reutilisent via
`storageState`. Deux passes consecutives tiennent.

> **A traiter en Phase 5** : `/espace-consultante` est protege par le middleware
> (`ROLE_ROUTE_MAP`), pas par son layout — celui-ci ne lit les roles que pour composer
> la navigation. La protection tient, mais elle repose sur une seule couche.

### 4-4 — coherence apres remboursement (2026-07-21)

**🔴 `handleChargeRefunded` ne touchait que `payments`.** Un remboursement emis depuis
le **dashboard Stripe** ne passe pas par `cancelBooking` : cet evenement est le seul a
en informer l'application. La ligne `payments` passait bien en `refunded`, mais la
reservation restait active — la consultante gardait le rendez-vous a son agenda, le
creneau restait bloque par l'index d'unicite de 4-7, et la cliente croyait sa place
reservee alors que son argent lui avait ete rendu.

Regles retenues :

| Cas                                       | Effet sur `bookings`                         |
| ----------------------------------------- | -------------------------------------------- |
| Remboursement **integral**, resa active    | `cancelled` + `cancelled_at` + montant        |
| Remboursement **partiel**                  | montant seul — c'est la penalite d'annulation tardive, la consultation reste due |
| Resa deja `cancelled`                      | montant seul (chemin applicatif, idempotent)  |
| Resa `completed` / `no_show`               | montant seul — la consultation a eu lieu, l'effacer de l'agenda serait faux |
| Paiement de type `formation` / `event`     | aucune reservation concernee                  |

Couvert en unitaire (5 scenarios) **et** en N1, ou les deux scenarios de remboursement
verifient desormais `bookings` en plus de `payments`. Verifie rouge en desactivant
l'appel : 7/9.

> **Effet de bord evite** : les scenarios de remboursement N1 visaient `IDS.booking`,
> la reservation creee par un scenario anterieur. Depuis que `charge.refunded` annule,
> le remboursement total aurait annule la reservation que le remboursement partiel
> s'attend a trouver active — deux tests devenus dependants de leur ordre. Chacun a
> maintenant sa propre reservation (`bookingRefundFull`, `bookingRefundPartial`), sur
> des creneaux distincts pour ne pas heurter l'index d'unicite.

### 4-2 / 4-3 — remboursements verifies chez Stripe (2026-07-21)

**🔴 Chaque remboursement coutait a la plateforme 85 % de la reservation.**
`createRefund` se contentait de `refunds.create({ payment_intent })`. Sur une charge
destination, cela rembourse la cliente **depuis le solde de la plateforme** : le
virement vers la consultante n'est pas renverse, la commission n'est pas rendue.

Mesure sur Stripe en mode test, reservation de 80 € avec 15 % de commission :

| | Rembourse a la cliente | Transfert renverse | Commission rendue | Plateforme | Consultante |
| --- | --- | --- | --- | --- | --- |
| **Avant** | 8000 | **0** / 8000 | **0** / 1200 | **−6800** | **8000** |
| **Apres** | 8000 | 8000 / 8000 | 1200 / 1200 | 0 | 0 |

La consultante encaissait l'integralite d'une consultation qui n'avait pas lieu, et la
plateforme payait la difference. Les trois chemins de remboursement etaient touches :
annulation consultante, annulation cliente, et le remboursement automatique de conflit
de creneau (4-7).

**Regle produit tranchee le 2026-07-21 : la plateforme ne preleve rien sur une
annulation.** Sur une annulation tardive de 80 €, la penalite de 40 € revient
integralement a la consultante. `refund_application_fee: true` ne convenait pas — il
rembourse la commission au prorata et laisserait 6 € a la plateforme. La commission est
donc rendue en entier par un appel explicite, et seul le solde restant est demande pour
qu'un second remboursement sur le meme paiement n'echoue pas.

> **🔴 Piege d'API — la premiere version du correctif ne corrigeait rien.**
> La charge imbriquee dans un PaymentIntent ne porte **ni `transfer` ni
> `application_fee`**, meme avec `expand: ["latest_charge.transfer"]`. Ces champs
> n'existent qu'en recuperant la charge via `charges.retrieve`. Le code lisait donc
> toujours `undefined`, n'ajoutait jamais `reverse_transfer`, et repartait en silence
> sur l'ancien comportement.
>
> **Les tests unitaires passaient** : ils mockaient la forme supposee. Seule la suite
> sur charges reelles l'a vu — c'est exactement ce que 4-2/4-3 demandaient en exigeant
> une verification « via l'API Stripe, pas juste la DB ». Le mock reproduit desormais
> la forme reelle.

**`pnpm test:e2e:refunds`** ([run-refunds.mjs](../scripts/e2e/run-refunds.mjs)) cree de
vrais PaymentIntents en mode test sur le compte connecte de la fixture, appelle le
`createRefund` de l'application via `jiti`, puis relit les objets Stripe pour verifier
la repartition de chaque centime. Un troisieme scenario verifie que la somme des trois
parts egale toujours le montant encaisse : une repartition qui ne boucle pas signifie
que de l'argent a ete cree ou detruit.

La suite n'ecrit rien en base. Elle exige `E2E_CONNECT_ACCOUNT` pointant sur un compte
reellement onboarde — Stripe refuse une charge destination vers un compte fictif — et
refuse de demarrer sur une cle `sk_live_`.

### 4-6 — repartition entre plusieurs comptes (2026-07-21)

**🔴 Les splits collaborateurs ne fonctionnaient pas, et l'echec etait muet.**
L'achat etait une charge destination versant tout le net a la proprietaire ; la
plateforme virait ensuite la part des collaboratrices **depuis son propre solde**.
Or ce solde est vide par construction — les fonds sont partis avec la charge.

Mesure en mode test : `transfers.create` echoue en `balance_insufficient`. L'erreur
etait capturee et ecrite dans `audit_logs` comme `collaborator_transfer_failed`, que
personne ne lit. La collaboratrice n'etait jamais payee, sans alerte ni relance. Et si
le solde avait suffi, la plateforme aurait finance la part de sa poche : sur un
accompagnement a 99 €, commission 1485 contre 2525 verses, soit **−1040 par vente**.

**Fonctionnalite jamais utilisee** : zero ligne dans `formation_collaborators`, zero
entree d'audit. Le premier ajout d'une collaboratrice aurait revele le probleme en
production.

**Bascule de modele tranchee le 2026-07-21.** Une vente **avec** collaboratrices est
desormais encaissee par la plateforme (`holdOnPlatform`), puis chaque part est virée en
citant la charge source (`source_transaction`). Sans collaboratrice, la charge
destination actuelle est conservee — le modele ne change que la ou il le faut.

> **A retenir avant le live** : sur ces ventes partagees, la plateforme devient
> *merchant of record*. Chargebacks et libelle de releve la concernent directement. A
> repercuter dans les CGV (5-7), au meme titre que le constat 1-4.

Trois proprietes du nouveau modele, verifiees sur charges reelles
([run-splits.mjs](../scripts/e2e/run-splits.mjs), `pnpm test:e2e:splits`) :

- chaque part atteint son compte **en citant la charge source** — un virement sans
  `source_transaction` retomberait dans le `balance_insufficient` d'origine ;
- la plateforme conserve exactement sa commission, ni plus ni moins ;
- une redelivery Stripe ne verse pas les parts deux fois, grace a une cle
  d'idempotence par `(paiement, consultante)`.

Le calcul des parts est isole dans
[`revenue-split.ts`](../src/lib/stripe/revenue-split.ts), teste a l'unite : la
proprietaire prend le **reste** plutot qu'un pourcentage recalcule, de sorte que les
arrondis ne fassent jamais depasser le total de la charge — ce que Stripe refuserait
sur le dernier virement. Une repartition depassant 100 % est rejetee avant tout appel.

**Trou referme dans la foulee** : `reverse_transfer` ne connait que le transfert porte
par la charge, et une charge encaissee par la plateforme n'en a pas. Un remboursement
aurait donc rendu l'argent a la cliente pendant que les deux consultantes gardaient
leur part. `createRefund` reprend maintenant les virements du `transfer_group`, au
prorata du montant rembourse et sans jamais depasser ce qui reste sur chacun.

### Constats de 4-5 (2026-07-21)

**🟠 `onboarding_completed` etait lu partout, ecrit nulle part.** Trois ecrans admin
affichent un badge « onboarding termine / non termine » a partir de cette colonne. Rien
dans l'application ne l'ecrivait : elle restait a `false` a vie, y compris pour une
consultante encaissant deja. Seul `account.updated` sait quand Stripe a fini de valider
le compte — c'est desormais lui qui la met a jour.

Le drapeau se cale sur `charges_enabled`, pas sur `details_submitted` : le second veut
dire « formulaire envoye », pas « valide ». Stripe peut encore reclamer des pieces, et
le compte n'encaisse rien entre-temps. `account.application.deauthorized` le remet a
`false` — sans compte destinataire, afficher une consultante prete a encaisser serait
faux.

**Constat C / 5-8 traite.** `/api/stripe/connect` ne verifiait aucun role. La ligne
`consultants` peut survivre a une retrogradation : s'y fier revenait a rouvrir un
onboarding de paiement a quelqu'un qui n'est plus consultante. La route exige maintenant
`consultant` ou `consultant_limited`.

Deux autres fragilites de la meme route, sans test jusqu'ici :

- **`NEXT_PUBLIC_APP_URL!`** — l'assertion non-nulle fabriquait des URL de retour
  `undefined/espace-consultante…` que Stripe rejette avec un message sans rapport avec
  la cause. La variable est lue et validee avant tout appel a Stripe.
- **Aucune capture d'erreur** — une panne Stripe remontait en page 500. La consultante
  cliquait sur « connecter mon compte » et tombait sur un ecran illisible, sans rien a
  rapporter. La route renvoie desormais 502 avec un message exploitable.

> **Verifie, contrairement a ce que je supposais** : `createConnectAccount` enregistre
> bien `stripe_account_id` sur la fiche, et la route reutilise le compte existant. Les
> deux comptes Express orphelins de la sandbox ne viennent donc pas d'une creation en
> boucle. Un test fige ce comportement.

---

## Phase 6 — Repertoire des templates d'email en admin

> Demande formulee le 2026-07-20 en tranchant 4-7. Feature a part entiere,
> **volontairement sortie du correctif de bug** : melanger un ecran admin a un fix
> de flux d'argent rendrait la revue impossible.

> **Correction du 2026-07-20** : cette phase avait ete redigee en affirmant que
> l'ecran d'administration des templates n'existait pas. **C'etait faux.** Il est en
> place sous `/admin/marketing/templates`, avec liste, edition WYSIWYG et
> previsualisation. Carole peut deja corriger un template. Le perimetre reel n'est
> pas de construire cet ecran mais de le **proteger**.

| ID  | Tache                                                                            | Statut | Prio  |
| --- | -------------------------------------------------------------------------------- | ------ | ----- |
| 6-1 | Ecran admin : liste des `email_templates`                                        | ✅     | 🟠 P1 |
| 6-2 | Edition avec le WYSIWYG par blocs                                                | ✅     | 🟠 P1 |
| 6-3 | Previsualisation                                                                 | ✅     | 🟠 P1 |
| 6-4 | Garde-fou : empecher la suppression d'un template reference par le code          | ✅     | 🔴 P0 |
| 6-5 | Arbitrer migrations vs edition en base (une edition ne doit pas etre ecrasee)    | ✅     | 🔴 P0 |
| 6-6 | `restoreDefaultTemplates` ecrase sans confirmation — contredit 6-5               | ✅     | 🔴 P0 |
| 6-7 | Rendu des templates : `\n` sans effet, `<p>` imbrique, metadonnees desynchronisees | ✅   | 🔴 P0 |

### Ce qui existe deja

| Brique                        | Etat |
| ----------------------------- | ---- |
| Table `email_templates`       | ✅ `subject`, `body_html`, `type`, `variables` (00008) |
| Editeur WYSIWYG par blocs     | ✅ `src/components/editor/` + `render-block-email.ts` |
| Designs par defaut            | ✅ `src/lib/emails/default-template-designs.ts` |
| Previsualisation              | ✅ `src/lib/emails/preview-action.ts` |
| Ecran admin liste + edition   | ✅ `/admin/marketing/templates` |

### Ce qui a ete corrige

**6-4 — suppression protegee.** `deleteTemplate` supprimait n'importe quelle ligne
sans verifier si le code en dependait. Supprimer `booking_confirmation` faisait
echouer l'email de confirmation en silence — `.single()` renvoie `null`, l'envoi est
abandonne, rien n'est journalise. `REQUIRED_TEMPLATES` liste desormais les templates
dont l'absence casse un envoi, et le refus nomme ce qui casserait.
[required-templates.spec.ts](../src/lib/emails/required-templates.spec.ts) deduit cet
ensemble de `send.ts` lui-meme : `if (!template) return` signale un envoi sans filet,
`if (template) { ... }` un envoi avec repli. Lire la forme plutot que tenir une liste
fait qu'un envoi perdant son repli rejoint automatiquement les proteges.

**6-6 — verifie le 2026-07-20 : deja traite.** La confirmation existe, nomme les
templates concernes et previent que toute personnalisation sera ecrasee ; la
restauration unitaire existe aussi (`restoreTemplateDesign`, sur la page d'edition
de chaque template). Aucun developpement n'etait necessaire.

**6-7 — trois defauts de rendu, trouves en envoyant les sept templates pour de vrai.**

| Defaut | Consequence |
| ------ | ----------- |
| Maily ne substitue que ses noeuds `variable()` | un `{{x}}` en texte brut arrivait tel quel dans l'email ; c'est pourtant le seul moyen d'injecter un fragment HTML, un noeud `variable()` l'echapperait |
| `\n` dans un noeud texte | « À bientôt,\nL'équipe » s'affichait sur une seule ligne — les sept designs concernes |
| `zoom_block` etait un `<p>` injecte dans un `<p>` | HTML invalide ; les clients mail referment le paragraphe exterieur et decalent tout ce qui suit |

Corriges respectivement dans `resolveEmailHtml` (substitution reprise sur le HTML
final), par un noeud `hardBreak`, et par `buildZoomBlock` qui produit desormais de
l'inline.

**Metadonnees desynchronisees.** `restoreDefaultTemplates` fait
`TEMPLATE_DEFAULT_SUBJECTS[name] ?? name` : un design sans entree voyait son objet
remplace par son **nom brut**. Les deux tables vivent maintenant aupres des designs,
et trois tests verifient qu'elles restent d'accord — chaque design a un objet et des
variables, et les variables declarees correspondent aux placeholders reellement
rendus. `booking_confirmation` n'avait pas `zoom_block` dans ses variables par
defaut : une restauration l'aurait retire de l'editeur.

> Conception detaillee :
> [2026-07-20-protection-templates-email-design.md](./superpowers/specs/2026-07-20-protection-templates-email-design.md)

> **6-5 — tranche le 2026-07-20 : les migrations creent, elles ne modifient pas.**
>
> Le probleme : aujourd'hui les templates sont modifies par migration (00034 met a
> jour `booking_confirmation`, 00045 `formation_access`). Si Carole edite un template
> dans l'admin et qu'une migration ulterieure le reecrit, son travail disparait au
> deploiement suivant, sans avertissement, et personne ne le remarque avant qu'un
> client recoive l'ancien contenu.
>
> Ecarte : une colonne marquant les templates edites manuellement. Deux sources de
> verite pour le meme contenu, et la question « qui gagne » resurgit a chaque
> migration.
>
> **Consequence pratique** : corriger un template se fait desormais dans l'admin.
> Une migration ne peut qu'inserer un template absent (`ON CONFLICT DO NOTHING`).
>
> La regle est outillee, pas seulement ecrite :
> [migration-guard.spec.ts](../src/lib/emails/migration-guard.spec.ts) fait echouer
> la suite si une migration posterieure a 00048 contient un `UPDATE` ou un `DELETE`
> sur `email_templates`. 00034 et 00045 sont explicitement tolerees — elles sont deja
> appliquees en production, les reecrire ne changerait rien a l'etat de la base.
>
> Le detecteur est lui-meme teste (il doit mordre sur un `UPDATE`, ignorer le mot
> dans un commentaire, laisser passer une insertion idempotente) pour qu'il ne
> devienne pas un garde-fou toujours vert.

---

## Phase 5 — Durcissement avant live

| ID  | Tache                                                                        | Statut | Prio  | Ref TASKLIST |
| --- | ---------------------------------------------------------------------------- | ------ | ----- | ------------ |
| 5-1 | Rate limiting : in-memory → Postgres partage (casse en serverless multi-instance) | ✅ | 🔴 P0 | 02-12        |
| 5-2 | CSP (Content-Security-Policy) manquant                                       | ✅     | 🟠 P1 | 02-13        |
| 5-3 | Validation MIME type sur les uploads Storage                                 | ⬜     | 🟡 P2 | 02-14        |
| 5-4 | Seeds `consultant_locations` + `available_locations`                         | ⬜     | 🟠 P1 | 07-08        |
| 5-5 | Cles live sur Vercel (`sk_live`, `pk_live`)                                  | 🔶     | 🔴 P0 | guide : [GO_LIVE](./GO_LIVE.md) |
| 5-6 | Webhook endpoint prod enregistre + `whsec_` prod                             | 🔶     | 🔴 P0 | guide : [GO_LIVE](./GO_LIVE.md) |
| 5-7 | CGV / mentions legales coherentes avec le modele commission                   | 🔶     | 🔴 P0 | brouillon : [CGV](./CGV_MODELE_ECONOMIQUE.md) |
| 5-8 | Relire `/api/stripe/connect` : pas de verification de role consultante        | ✅     | 🟠 P1 | fait en 4-5  |

### 5-2 — CSP posee et verifiee au navigateur (2026-07-21)

**Portee reelle, pour ne pas se raconter d'histoires.** `script-src` autorise
`'unsafe-inline'` : sans lui, le bootstrap inline de Next.js ne s'execute pas. Cette
politique **n'arrete donc pas une injection de script inline**. Ce qu'elle ferme
quand meme :

- `connect-src` — une charge utile injectee ne peut exfiltrer que vers Supabase ou
  Stripe, pas vers un domaine arbitraire ;
- `frame-ancestors` / `object-src` / `base-uri` — clickjacking, plugins, detournement
  des URL relatives ;
- `form-action` — un formulaire injecte ne peut pas poster ailleurs.

Passer aux nonces via le middleware permettrait de retirer `'unsafe-inline'` et de
couvrir reellement le XSS. C'est le palier suivant, laisse de cote volontairement :
mal pose, un nonce casse le rendu statique.

**`img-src https:`** plutot qu'une liste d'hotes : les visuels importes depuis Wix
pointent sur des domaines quelconques, et une image bloquee laisse une page trouee
sans erreur visible.

**Verifiee au navigateur** ([csp.spec.ts](../e2e/csp.spec.ts)) : une CSP trop stricte
ne leve pas d'erreur, elle bloque discretement une ressource et la page s'affiche de
travers. Les scenarios parcourent les pages portant des dependances externes et
echouent sur la moindre violation signalee par le navigateur.

> **La verification a mordu deux fois.** D'abord sur le websocket de rafraichissement
> a chaud, bloque par `connect-src` — corrige par une exception limitee au
> developpement. Ensuite parce que la politique de developpement n'est pas celle de
> production : la suite a ete rejouee contre `pnpm build && pnpm start`, ou
> `'unsafe-eval'` et le websocket disparaissent. 10/10 dans les deux modes.

> **Constat annexe, qui renforce 5-1** : les passes repetees faisaient echouer la
> connexion des fixtures. Cause — le rate limit en memoire du processus, qui
> s'accumulait d'une passe a l'autre et repartait a zero au redemarrage. C'est le
> defaut meme que 5-1 doit corriger, observe ici sur un seul processus ; en
> production multi-instance, il rend la limite inoperante.

### 5-1 — comptage partage entre instances (2026-07-21)

**Ecarte : Upstash.** Le besoin est un **etat partage**, pas un produit particulier.
Supabase est deja interroge a chaque tentative de connexion (lecture de `profiles`) :
l'y adosser n'ajoute aucun nouveau mode de panne, aucun secret, aucun fournisseur — et
surtout, rien a creer avant de pouvoir s'en servir. Le volume, quelques ecritures par
tentative d'authentification, est sans commune mesure avec ce que Postgres encaisse.
Basculer vers Redis reste possible si le trafic change : seul le corps de `rateLimit`
bougerait.

Le comptage tient dans un unique `INSERT ... ON CONFLICT DO UPDATE`
([migration 00050](../supabase/migrations/00050_rate_limits.sql)). La ligne est
verrouillee le temps de l'operation, donc deux requetes simultanees ne peuvent pas
lire le meme compteur et se croire toutes deux sous la limite — ce qu'un `SELECT` puis
`UPDATE` separes autoriseraient.

**En cas d'indisponibilite de la base, la requete passe.** Choix assume : bloquer
verrouillerait la connexion pour tout le monde, et l'authentification interroge cette
meme base juste apres — si elle est tombee, rien ne fonctionne de toute facon. Un
`console.error` explicite evite que la degradation soit silencieuse.

> **✅ SQL verifie le 2026-07-21**, migration appliquee : `4/4 scenarios passes`,
> dont l'atomicite (20 appels simultanes contre une limite de 5 n'en laissent
> passer que 5). Le doute ci-dessous est leve, l'historique est conserve.
>
> **⚠️ SQL non verifie a l'ecriture.** L'application de la migration en production est
> une action protegee, et aucun Postgres local n'etait disponible (Docker absent). Le
> SQL de 00050 est donc **relu mais jamais execute** au moment du commit.
> [run-rate-limit.mjs](../scripts/e2e/run-rate-limit.mjs) (`pnpm test:rate-limit`)
> existe pour lever ce doute des que `pnpm db:push` est passe : il verifie la limite,
> la reouverture de la fenetre, l'independance des cles, et surtout l'atomicite — 20
> appels simultanes sur une limite de 5 doivent en laisser passer exactement 5.
>
> Tant que la migration n'est pas appliquee, le limiteur laisse tout passer en
> journalisant l'erreur : degrade, mais ni bloquant ni silencieux.

---

## Hors perimetre immediat

Reportes apres la mise en prod du flux de paiement :

- Refonte design phases 5 a 7 — voir [REDESIGN_TASKLIST.md](./REDESIGN_TASKLIST.md)
- Contenu Carole (C-01 a C-09) : photos, temoignages, bio, chiffres, liens sociaux
- EPIC-27 (mobile, API publique, reviews, fidelite, multi-langue)

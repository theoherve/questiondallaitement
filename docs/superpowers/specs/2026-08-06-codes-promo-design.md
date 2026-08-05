# Codes promo multi-services — design

Date : 2026-08-06

## Objectif

Permettre à une cliente d'appliquer un code de réduction avant paiement, sur les
trois familles de produits payants de la plateforme :

- **accompagnements** (table `formations`, achat direct) ;
- **formations / webinaires** (table `events`, inscription payante) ;
- **rendez-vous** (table `bookings`, prix calculé dynamiquement selon durée et
  majoration week-end/férié).

Le ciblage doit descendre jusqu'à l'item : « toutes les formations », mais aussi
« uniquement le pack Mon allaitement sur mesure ».

## Décisions structurantes

| Décision | Choix retenu |
|---|---|
| Qui supporte la remise | La consultante. La commission plateforme est recalculée sur le prix remisé. |
| Source de vérité | Table interne Supabase. Stripe reçoit un montant déjà remisé, pas de Coupon Stripe. |
| Ciblage v1 | Type de service **et** items spécifiques. Pas de ciblage par consultante. |
| Conditions v1 | Fenêtre de validité, quota global, quota par cliente, montant minimum, déclencheur « achat antérieur + délai ». |
| Saisie | Champ « J'ai un code promo » avant paiement, sur les trois flux. |
| Administration | Admin uniquement, `/admin/marketing/codes-promo`. Les consultantes ne créent pas de codes. |
| Cumul | Interdit — un seul code par commande. |

**Pourquoi pas les Coupons Stripe natifs** : la plateforme ne crée pas de
`Product`/`Price` Stripe (les sessions utilisent `price_data` inline), donc le
ciblage par produit côté Stripe est inopérant. Par ailleurs le prix d'un
rendez-vous est calculé à la volée, la commission dépend du montant, et le
reporting doit vivre dans l'admin. Une remise appliquée en amont du checkout
règle les trois points.

## Schéma — `00065_promo_codes.sql`

```sql
CREATE TYPE promo_discount_type AS ENUM ('percent', 'fixed_cents');
CREATE TYPE promo_target_type AS ENUM (
  'formations_all', 'events_all', 'bookings_all',
  'formation', 'event', 'booking_service'
);
CREATE TYPE promo_trigger_type AS ENUM ('event_purchase', 'formation_purchase');
CREATE TYPE promo_redemption_status AS ENUM ('pending', 'confirmed', 'cancelled');
```

### `promo_codes`

| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid pk | |
| `code` | text | Unique sur `upper(code)`. Saisie insensible à la casse. |
| `label` | text | Note interne : campagne, provenance (« réseau partenaire »). |
| `discount_type` | `promo_discount_type` | |
| `discount_value` | int | `15` pour −15 %, `3000` pour −30 €. |
| `scope_all` | bool | `true` = tout le catalogue, les `targets` sont alors ignorées. |
| `valid_from` / `valid_until` | timestamptz null | Fenêtre. `null` = sans borne. |
| `max_redemptions` | int null | Quota global. `null` = illimité. |
| `max_per_user` | int | Défaut `1`. |
| `min_order_cents` | int | Défaut `0`. Comparé au montant **avant** remise. |
| `trigger_delay_hours` | int null | Non-null uniquement si le code a des `triggers`. |
| `is_active` | bool | Défaut `true`. |
| `created_at`, `updated_at`, `created_by` | | |

Contrainte : `discount_value > 0` ; si `discount_type = 'percent'` alors
`discount_value <= 100`.

### `promo_code_targets`

`promo_code_id`, `target_type`, `target_id uuid null`.

`target_id` est requis pour `formation` / `event` / `booking_service`, et doit
être `null` pour les types `*_all`. Contrainte `CHECK` explicite. Ces lignes ne
sont lues que si `scope_all = false`. Un code peut porter plusieurs cibles, la
règle est un OU logique.

### `promo_code_triggers`

`promo_code_id`, `trigger_type`, `target_id uuid null`.

`target_id = null` signifie « n'importe quel produit de ce type ». Le code n'est
valable que si la cliente a un paiement confirmé correspondant à l'un des
triggers, daté de moins de `trigger_delay_hours`. Un code sans ligne de trigger
n'a pas de condition d'historique.

### `promo_code_redemptions`

| Colonne | Rôle |
|---|---|
| `promo_code_id`, `profile_id` | |
| `order_kind` (`payment_type`), `reference_id` | Produit acheté. |
| `stripe_session_id` | Unique. Idempotence face aux redeliveries. |
| `stripe_payment_intent_id` | Rempli à la confirmation. |
| `original_amount_cents`, `discount_cents`, `final_amount_cents` | Snapshot du calcul. |
| `status` | `pending` → `confirmed` \| `cancelled`. |
| `created_at`, `confirmed_at` | |

**Cycle de vie.** La redemption est créée en `pending` *avant* la création de la
session Stripe, passe en `confirmed` sur `checkout.session.completed`, et en
`cancelled` sur `checkout.session.expired`. Une redemption `pending` de plus de
24 h est considérée expirée par le calcul de quota (borne temporelle dans la
requête, pas de job balai nécessaire).

Les quotas comptent les `confirmed` **et** les `pending` récentes. Sans cela,
trois onglets ouverts épuiseraient un code à quota 1 sans qu'aucun paiement
aboutisse — ou pire, le dépasseraient.

**RLS.** Aucune politique publique sur les trois tables de configuration :
seul le service role y accède. Le catalogue de codes n'est jamais exposé au
client, sinon un curieux liste les codes actifs depuis la console. La lecture
admin passe par les server actions du back-office.
`promo_code_redemptions` : lecture admin, plus lecture par la cliente
propriétaire.

## Impact sur les tables existantes

`payments` gagne trois colonnes nullables : `promo_code_id`,
`discount_cents`, `original_amount_cents`. `amount_cents` reste le montant
réellement encaissé — aucune lecture existante ne change de sens.

`invoices` gagne `promo_code`, `discount_cents`, `gross_amount_ttc_cents`,
tous nullables. La facture est immuable et créée par la fonction
`SECURITY DEFINER` `create_invoice` : ces valeurs y sont passées à l'émission,
depuis le `payment`. Le PDF affiche une ligne « Remise CODE −X € » entre le
sous-total et le total quand `discount_cents` est non-null.

## Cœur métier — `src/lib/promo/`

### `evaluate.ts` — fonction pure

```ts
evaluatePromoCode(code: PromoCodeWithRules, ctx: PromoContext):
  | { ok: true; discountCents: number; finalCents: number }
  | { ok: false; reason: PromoRejection }
```

`PromoContext` : `{ serviceKind, itemId, consultantId, amountCents, profileId,
now, globalRedemptions, userRedemptions, triggeringPurchases }`.

Zéro I/O : tout le risque métier est ici et se teste sans base.

Ordre d'évaluation, premier échec gagne :

1. `is_active`
2. fenêtre `valid_from` / `valid_until`
3. ciblage (`scope_all` ou match d'au moins une target)
4. `amountCents >= min_order_cents`
5. quota global
6. quota par cliente
7. déclencheur : au moins un achat correspondant daté de moins de
   `trigger_delay_hours`
8. calcul : `percent` → `round(amount * value / 100)`, `fixed_cents` → `value`
9. clamp : `discount = min(discount, amountCents)`, donc `final >= 0`

Chaque rejet porte une raison typée, traduite en message utilisateur côté UI.
Un code inexistant, inactif ou hors cible renvoie le même message générique
(« Ce code n'est pas valable pour cet achat ») : détailler renseignerait un
attaquant sur l'existence des codes.

### `repository.ts`

Chargement du code par `upper(code)` avec ses targets, triggers et compteurs, et
lecture de l'historique d'achats de la cliente. Client admin Supabase.

### `actions.ts`

- `previewPromoCode({ code, serviceKind, itemId, amountCents })` — pour l'UI.
  Aucun effet de bord. Rate-limité (table `rate_limits`, migration 00050) pour
  empêcher le brute-force de codes.
- `reservePromoCode(...)` — recharge tout, ré-évalue, insère la redemption
  `pending`, renvoie le montant final. Appelée depuis les server actions
  d'achat, juste avant Stripe.

**Le montant remisé n'est jamais transmis par le client.** L'UI n'envoie que la
chaîne du code ; le serveur recalcule.

## Intégration checkout

`createCheckoutSession` ([src/lib/stripe/connect.ts](../../../src/lib/stripe/connect.ts))
reçoit `priceInCents` déjà remisé, et les metadata additionnelles
`promo_code`, `promo_code_id`, `original_price_cents`, `discount_cents`.

La commission (`platform_fee_cents`) est calculée sur le montant remisé — c'est
la traduction de « la consultante supporte la remise ». Les parts des
collaboratrices étant exprimées en pourcentage, elles suivent mécaniquement :
`distributeFormationRevenue` n'a pas à changer.

Trois points d'appel à modifier :

- [src/app/(public)/accompagnements/actions.ts](../../../src/app/(public)/accompagnements/actions.ts)
- [src/app/(public)/formations/actions.ts](../../../src/app/(public)/formations/actions.ts)
- [src/app/(public)/reserver/actions.ts](../../../src/app/(public)/reserver/actions.ts)

Chacun suit le même enchaînement : prix catalogue → `reservePromoCode` → prix
final → routage de vente inchangé → `createCheckoutSession`.

**Cas 0 €.** `MILKPOWER` (−30 €) sur un produit à 30 € donne un total nul.
`min_order_cents` rend le cas rare, mais le chemin doit exister : on
court-circuite Stripe et on accorde l'accès directement, comme le fait déjà
`formations/actions.ts` pour les events gratuits (`price_cents === 0`). La
redemption passe alors directement en `confirmed`, et un `payment` à
`amount_cents = 0` est enregistré pour la traçabilité.

**Rendez-vous invités.** Le flux de réservation crée déjà un profil pour les
clientes non connectées. Le quota par cliente s'appuie donc sur `profile_id`
dans les trois flux, sans traitement particulier.

## Webhook

[src/app/api/webhooks/stripe/route.ts](../../../src/app/api/webhooks/stripe/route.ts) :

- `checkout.session.completed` — passe la redemption en `confirmed`, renseigne
  `stripe_payment_intent_id`, et reporte `promo_code_id` / `discount_cents` /
  `original_amount_cents` sur le `payment` créé. Idempotent via l'unicité de
  `stripe_session_id`.
- `checkout.session.expired` — passe la redemption en `cancelled`.

## UI cliente

Composant partagé `src/components/promo/promo-code-field.tsx` :
bloc repliable « J'ai un code promo » → input + bouton Appliquer → appel de
`previewPromoCode` → récapitulatif `Prix initial / Remise CODE / Total`, avec
bouton Retirer. Le code retenu est remonté au parent via `onChange`, et transmis
comme simple chaîne à l'action d'achat.

Branchements :

- [purchase-button.tsx](../../../src/app/(public)/accompagnements/_components/purchase-button.tsx)
- [register-button.tsx](../../../src/app/(public)/formations/[slug]/register-button.tsx)
- [step-payment.tsx](../../../src/app/(public)/reserver/_components/step-payment.tsx)
  — le prix dépendant du créneau, le récapitulatif se recalcule si la cliente
  change de créneau ou de durée après avoir saisi son code.

## Back-office

`/admin/marketing/codes-promo` :

- **Liste** — code, remise, cible résumée, utilisations/quota, fenêtre, état.
  Filtres actif/inactif, recherche.
- **Formulaire** — création/édition, avec sélecteur de cibles (type de service,
  puis liste d'items) et section « déclencheur » optionnelle.
- **Détail/stats** — utilisations, CA généré, remise totale consentie,
  répartition par produit.

Un code déjà utilisé ne peut pas être supprimé, seulement désactivé : ses
redemptions référencent son `id` et portent l'historique comptable.

## Seed — `00066_promo_codes_seed.sql`

| Code | Remise | Cible | Particularité |
|---|---|---|---|
| SUPERMAMAN | −15 % | tout catalogue | |
| SAUVEZMESNUITS | −15 % | tout catalogue | |
| DECOUVERTE | −15 % | tout catalogue | |
| HAPPYMOM | −15 % | tout catalogue | |
| CAROLE15 | −15 % | tout catalogue | |
| MILKPOWER | −30 € | tout catalogue | `min_order_cents = 6000` |
| ALLAITEMENT15 | −15 % | `events_all` | |
| PREMIERSJOURS | −20 € | tout catalogue | trigger `event_purchase` sans cible (tout événement), `trigger_delay_hours = 48` |
| FLASH24 | −30 % | tout catalogue | `is_active = false` au seed ; fenêtre 24 h fixée à l'activation |
| VILLAGE | −20 % | tout catalogue | `label = 'réseau partenaire (sage-femme, doula)'` |
| SERENITE | −15 % | l'accompagnement `pack-mon-allaitement-sur-mesure` | cible résolue par `slug` dans le seed, pas d'UUID en dur |

## Tests

**Unitaires (`evaluate.spec.ts`)** — un cas par règle et par frontière :
code inactif, hors fenêtre (avant / après / bornes nulles), cible non
correspondante, cible correspondante via `*_all` et via item, montant sous le
minimum, quota global atteint, quota par cliente atteint, trigger absent,
trigger hors délai, trigger dans le délai, remise en pourcentage (arrondi),
remise fixe, remise fixe supérieure au montant (clamp à 0).

**Server actions** — les trois flux d'achat avec et sans code : montant Stripe
remisé, commission recalculée sur le montant remisé, redemption `pending`
créée, refus propre sur code invalide, chemin 0 €.

**Webhook** — confirmation, redelivery (idempotence), expiration.

**Remboursement** — un remboursement total après remise part du montant payé et
non du prix catalogue.

## Hors périmètre v1

- Codes créés par les consultantes.
- Cumul de plusieurs codes.
- Ciblage par consultante.
- Miroir Coupon Stripe pour la comptabilité Stripe.
- `PREMIERSJOURS` déclenché par une date de naissance déclarée : nécessiterait
  un nouveau champ de profil et repose sur du déclaratif. Le déclencheur retenu
  est l'achat d'un événement.

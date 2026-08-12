# Cartes cadeaux — Phase 1 (design)

Source : `docs/specs_lacteo/07_module_cartes_cadeaux-1.md`. Ce document ne couvre que le cœur du module — émission, application (réservation + facture), back-office manuel. Reportés en phase 2 (hors scope de ce doc) : rappel avant expiration (§7.5), procédure de remboursement exceptionnel après expiration (§7.6 Exception 2, valeurs "à définir").

## Contexte et décisions transverses

- Site solo-praticienne (Carole). Stripe déjà intégré (`src/lib/stripe/connect.ts`, webhooks, Connect, revenue-split). Module invoicing déjà en place (`src/lib/invoicing/`).
- **Rétractation légale (§7.6 Exception 1)** : même traitement que le module formations (voir mémoire `withdrawal-waiver-removed`) — pas de case à cocher, pas d'enforcement serveur. Risque légal assumé explicitement par l'utilisateur pour ce module aussi (décision prise pendant le brainstorming, 2026-08-12). Ne pas réintroduire le waiver sans redemander.
- Montants prédéfinis (carte "montant") : **90€ / 130€ / 170€**.
- Aucun nouveau paramètre booléen attaquable sur une server action exportée (cf mémoire `server-actions-parametre-autorisation-attaquable`) : la validité/le solde d'une carte cadeau ne sont jamais transmis par le client à une action d'écriture — toujours recalculés côté serveur depuis le ledger au moment de la redemption.

## 1. Modèle de données

### `gift_cards`
| Colonne | Type | Détail |
|---|---|---|
| id | uuid PK | |
| code | text unique | `CADEAU-XXXXXX`, généré serveur, 6 caractères alphanumériques non ambigus |
| type | enum `amount` \| `service` | |
| initial_amount | numeric, nullable | requis si type=amount, NULL si type=service |
| consultation_type_id | uuid FK → consultation_types, nullable | requis si type=service |
| buyer_name / buyer_email | text | |
| beneficiary_name / beneficiary_email | text, nullable | si envoi direct |
| personal_message | text, nullable | |
| delivery_mode | enum `email` \| `pdf` | |
| status | enum `active` \| `used` \| `expired` \| `cancelled` | `expired` dérivé de `expires_at < now()` en lecture, pas de cron en phase 1 |
| issued_at | timestamptz | |
| expires_at | timestamptz | `issued_at` + 12 mois |
| consultant_id | uuid FK → consultants | |
| invoice_id | uuid FK → invoices, nullable | |
| created_by | enum `purchase` \| `manual` | |
| created_by_admin_id | uuid, nullable | si `manual` |

### `gift_card_redemptions` (ledger append-only)
| Colonne | Type | Détail |
|---|---|---|
| id | uuid PK | |
| gift_card_id | uuid FK | |
| amount | numeric | |
| booking_id | uuid FK, nullable | |
| invoice_id | uuid FK, nullable | |
| redeemed_at | timestamptz | |
| redeemed_by_admin_id | uuid, nullable | si saisie back-office |

Solde carte "montant" = `initial_amount - SUM(redemptions.amount)`. Carte "service" : une seule ligne de redemption autorisée (contrainte applicative + éventuelle contrainte DB), consomme la carte entière → `status = used`.

### RLS
Pattern repris de `00099_manual_invoices_and_settlements.sql` : `ENABLE ROW LEVEL SECURITY` sur les deux tables, policies SELECT séparées (consultant via jointure `consultant_id = auth.uid()`, admin via `is_admin()`), **aucune policy INSERT/UPDATE/DELETE** — toutes les écritures passent par des server actions service-role / fonctions SECURITY DEFINER.

### Génération du code
Boucle : génère un code aléatoire, `INSERT ... ON CONFLICT (code) DO NOTHING`, retry si collision (retry count borné, échec après N tentatives = erreur explicite plutôt que boucle infinie).

## 2. Achat en ligne

Réutilise `createCheckoutSession` (`src/lib/stripe/connect.ts`). Métadonnées Checkout : type, montant/consultation_type_id, delivery_mode, beneficiary. Webhook Stripe (`checkout.session.completed`, idempotent — cf leçon `create_invoice`) :
1. Crée la `gift_card` (status=active, code généré).
2. Génère la facture immédiate (réutilise `build-invoice.ts` — même règles que le reste du module Facturation : numérotation, TVA, sync Pennylane).
3. Envoie l'email de confirmation à l'acheteur (+ email avec le code au bénéficiaire si `delivery_mode=email`), via `sendTransactionalEmail`.
4. Si `delivery_mode=pdf`, génère le PDF (nouveau template `gift-card-pdf.tsx` sur `@react-pdf/renderer`, même approche que `invoice-pdf.tsx`) et le joint à l'email envoyé à l'acheteur.

## 3. Application de la carte (réservation + facture)

Fonction serveur canonique unique : `redeemGiftCard({ code, amountRequested, bookingId | invoiceId })`, appelée depuis les deux points d'entrée (`/reserver` et création de facture en back-office, §6.5 du module Facturation). Comportement :
- Recharge la carte + calcule le solde depuis le ledger (jamais depuis une valeur transmise par le client).
- Vérifie : `status=active`, `expires_at > now()`, solde ≥ montant demandé (ou carte "service" non déjà utilisée).
- Écrit la ligne `gift_card_redemptions` dans une transaction atomique, retourne le montant réellement appliqué.
- La vérification "temps réel" affichée à l'utilisateur (avant soumission) est un appel en lecture seule séparé — la confirmation finale revalide systématiquement côté serveur, sans jamais faire confiance à un flag "carte valide" venu du client.

Cumul avec un autre moyen de paiement : le flux `/reserver` existant pointe déjà vers un prix ; on le fait pointer vers `prix - montantAppliqué`.

## 4. Back-office praticienne

Nouvelle page `/admin/cartes-cadeaux` : liste des cartes (statut, solde, historique de redemptions), émission manuelle. L'émission manuelle passe par la **même** fonction d'émission que l'achat en ligne (pas de Checkout, mais génère quand même une facture à 0€/avoir via `build-invoice.ts` — cohérent avec §7.7, traçabilité comptable d'un geste commercial). Pas de nouveau paramètre de contournement exposé : l'émission manuelle est réservée aux routes admin déjà protégées par `is_admin()`.

## 5. Notifications (phase 1)

- Email de confirmation d'achat à l'acheteur.
- Email avec le code au bénéficiaire si `delivery_mode=email`.
- Rappel avant expiration (§7.5) → **reporté phase 2**.

## 6. Tests (TDD)

- Génération de code : unicité, gestion de collision (retry), échec après N tentatives.
- Calcul de solde depuis le ledger (montant initial, plusieurs redemptions partielles, solde épuisé).
- `redeemGiftCard` : rejet si expirée / status≠active / solde insuffisant / carte "service" déjà utilisée ; application correcte du montant partiel ; atomicité (pas de double-redemption en cas d'appels concurrents).
- RLS : un consultant ne voit pas les cartes d'un autre consultant (même si un seul consultant actif aujourd'hui, la table `consultants` reste multi-tenant).
- Webhook Stripe : idempotence sur `checkout.session.completed` rejoué (pas de double émission de carte/facture) — cf leçon des migrations `create_invoice`/`correct_invoice`.

## Hors scope (phase 2)

- Rappel avant expiration (cron + template email).
- Procédure de remboursement/prolongation après expiration (§7.6 Exception 2) — valeurs "à définir" (délai de recours, frais de gestion, durée carte de remplacement, contact dédié) non tranchées, à cadrer séparément avec Carole/légal.

# Cartes cadeaux — Phase 2 (design)

Source : `docs/specs_lacteo/07_module_cartes_cadeaux-1.md` §7.5-7.6. Suite de la Phase 1 (voir `2026-08-12-cartes-cadeaux-phase1-design.md`, mergée en PR #93). Ce document couvre : rappel email avant expiration (§7.5), et la procédure de remboursement/prolongation après expiration (§7.6 Exception 2).

## Hors scope (assumé, pas un oubli)

- **Exception 1 — rétractation légale 14 jours** (§7.6) : traitée séparément, plus tard. Ne pas la mélanger avec Exception 2 ci-dessous.
- Aucun nouvel écran client-facing pour déposer une demande de remboursement/prolongation — la demande arrive par email à `contact@questiondallaitement.fr` (adresse existante, `NEXT_PUBLIC_CONTACT_EMAIL`, `src/config/site.ts:20`), traitée manuellement par Carole depuis le back-office.
- Aucun appel Stripe pour le remboursement exceptionnel — virement manuel par Carole avec l'IBAN/BIC reçu par email. Raison : à 12 mois + 90 jours, la fenêtre de remboursement Stripe/réseau carte est souvent déjà fermée ou incertaine selon la banque du client ; un virement manuel est fiable dans tous les cas.

## Valeurs actées (§7.6, "à définir" tranchées)

| Valeur | Décision |
|---|---|
| Délai de recours après expiration | 90 jours après `expires_at` |
| Frais de gestion sur remboursement exceptionnel | Aucun |
| Durée de la carte de remplacement (prolongation) | 9 mois |
| Contact dédié | `contact@questiondallaitement.fr` (existant, pas de nouvelle adresse) |
| Cadence du rappel avant expiration | Un seul envoi, 30 jours avant `expires_at` |

## 1. Rappel avant expiration (§7.5)

Job périodique bespoke, pas le système générique `src/lib/notifications/` — ce système suppose un compte/des préférences d'abonné ; l'acheteur/bénéficiaire d'une carte cadeau n'a pas forcément de compte, et un rappel sur l'expiration d'une valeur déjà payée ne doit pas être désinscriptible comme une notif marketing.

### Modèle de données
Migration : ajoute `reminder_sent_at TIMESTAMPTZ, NULL` sur `gift_cards`.

### Fonction
`sendGiftCardExpiryReminders()` dans `src/lib/gift-cards/emails.ts`, même style que `sendGiftCardPurchaseEmails` (HTML en dur, même point de passage `sendTransactionalEmail`).

Sélection :
```sql
status = 'active'
AND reminder_sent_at IS NULL
AND expires_at BETWEEN now() AND now() + interval '30 days'
AND solde_restant > 0   -- calculé depuis le ledger, pas une colonne stockée
```
Carte "service" non utilisée = solde plein (éligible) ; déjà utilisée → `status='used'`, donc déjà exclue par le filtre `status`.

Destinataire : `beneficiary_email` si renseigné, sinon `buyer_email`. Après envoi réussi, `UPDATE gift_cards SET reminder_sent_at = now()` (dédup — un seul envoi possible même si le job tourne plusieurs fois avant que la carte ne passe `expired`).

### Intégration cron
Ajouté comme job supplémentaire dans le tableau `results[...]` de `src/app/api/cron/route.ts` (cron horaire existant, `0 * * * *`) — pas de nouvelle route, même pattern que `runModuleReminders`.

## 2. Procédure après expiration (§7.6 Exception 2)

### Modèle de données
Migration : ajoute sur `gift_cards` :
| Colonne | Type | Détail |
|---|---|---|
| closed_reason | enum `refunded` \| `replaced`, NULL | NULL si carte non close par cette procédure |
| closed_at | timestamptz, NULL | |
| closed_note | text, NULL | libre, pour tracer la décision de Carole (n° facture reçu, référence virement, etc.) |
| replaces_gift_card_id | uuid FK → gift_cards, NULL | posé sur la **nouvelle** carte quand elle remplace une carte expirée |

Statut existant `cancelled` (enum `gift_card_status`) réutilisé comme statut final commun aux deux issues (remboursée ou remplacée) — `closed_reason` distingue laquelle. Pas de nouvelle valeur d'enum.

### Actions back-office
Sur `/admin/cartes-cadeaux`, deux actions suivant le pattern `correct-button.tsx` / `correctInvoice` (`src/app/(dashboard)/espace-consultante/facturation/actions.ts:74`) — dialog client + server action retournant `ActionResult`.

Éligibilité commune, **vérifiée côté serveur** (pas seulement un bouton caché côté client — même principe que le solde jamais transmis par le client en Phase 1) :
```
status = 'expired' AND expires_at + interval '90 days' >= now() AND closed_reason IS NULL
```

- **`refundExpiredGiftCard({ giftCardId, note })`** : vérifie l'éligibilité, `UPDATE gift_cards SET status='cancelled', closed_reason='refunded', closed_at=now(), closed_note=note`. Le virement lui-même est hors app (Carole, manuel). Pas de champ montant de frais — aucun frais dans cette phase.
- **`replaceExpiredGiftCard({ giftCardId, note })`** : vérifie l'éligibilité, calcule le solde restant depuis le ledger (jamais un montant saisi à la main), appelle la fonction d'émission déjà existante (celle utilisée par l'émission manuelle en Phase 1) avec `initial_amount = solde_restant`, `expires_at = now() + interval '9 months'`, `created_by='manual'`, `replaces_gift_card_id = giftCardId`. Puis `UPDATE` la carte d'origine : `status='cancelled', closed_reason='replaced', closed_at=now(), closed_note=note`.

Les deux actions envoient un email de confirmation à l'acheteur/bénéficiaire (non bloquant, `try/catch` — même pattern que `resendInvoice`).

### UI
Sur la liste des cartes, les boutons "Rembourser" / "Remplacer" n'apparaissent que pour une carte `status='expired'` dans la fenêtre des 90 jours (calcul d'affichage simple ; l'enforcement réel reste serveur). Au-delà, aucune action visible — cohérent avec "aucune demande recevable" passé ce délai.

## 3. Tests (TDD)

- `sendGiftCardExpiryReminders` : sélectionne bien les cartes à J-30, exclut les cartes déjà rappelées (`reminder_sent_at` non NULL), exclut les cartes à solde nul, exclut les cartes déjà expirées ou non actives, envoie au bénéficiaire si présent sinon à l'acheteur, pose `reminder_sent_at` après envoi réussi (pas avant, pour ne pas marquer "envoyé" en cas d'échec Resend).
- `refundExpiredGiftCard` : rejet si la carte n'est pas `expired`, rejet si la fenêtre de 90 jours est dépassée, rejet si `closed_reason` déjà posé (pas de double traitement), succès met à jour statut/closed_*.
- `replaceExpiredGiftCard` : mêmes rejets que ci-dessus, calcul du solde de la nouvelle carte depuis le ledger (pas un montant transmis par l'appelant), nouvelle carte a bien `expires_at = +9 mois` et `replaces_gift_card_id` correct, carte d'origine correctement fermée.
- Enforcement serveur de la fenêtre 90 jours indépendant de l'UI (test direct de l'action avec une date système simulée au-delà de la fenêtre).

## Hors scope (rappel)

- Exception 1 (rétractation 14 jours) — à cadrer séparément.
- REVOKE EXECUTE sur `redeem_gift_card()` (Phase 1) — toujours pas vérifié en conditions réelles, sans lien avec ce chantier mais à surveiller au premier déploiement avec Docker disponible.

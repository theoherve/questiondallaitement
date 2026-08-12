# Export comptable CSV + relances impayés — design

**Statut :** validé, prêt pour plan d'implémentation.
**Source :** `docs/specs_lacteo/06_module_facturation_paiements-1.md` §6.2, §6.4, §6.5 (module 6 du backlog Lactéo).
**Chantier précédent de la série :** [[tracabilite-notes-crm-shipped]] (mémoire projet).

## Contexte et constat de cadrage

La facturation existante (`src/lib/invoicing/`) ne génère une facture (`invoices`) qu'après un paiement Stripe déjà réussi (`payment_id NOT NULL UNIQUE REFERENCES payments(id)`, statut `issued`/`cancelled` uniquement). Il n'existe aujourd'hui **aucune notion de facture émise mais impayée**, ni de création manuelle de facture.

Carole a un vrai besoin de facturer hors Stripe (virement différé, pack de consultations, formation) et d'attendre le règlement — donc le sous-chantier "relances impayés" n'est pas un ajout mineur : il nécessite d'abord la facturation manuelle et un suivi de règlement. Décision de cadrage : construire l'ensemble (facture libre + statuts de règlement + saisie manuelle de règlement + relance + export CSV), pas seulement l'export.

## Décisions de cadrage retenues

- **Relance : déclenchement manuel**, pas de cascade automatique. Un bouton "Relancer" sur une facture en retard, envoyé quand Carole le juge utile. Volume trop faible pour justifier une automatisation à plusieurs paliers.
- **IBAN/BIC en clair** sur le profil de facturation, pas chiffré. Le champ est de toute façon imprimé en clair sur le PDF envoyé aux clientes — chiffrer la colonne en base n'apporterait aucune protection réelle, seulement de la complexité (pas d'infra de chiffrement existante dans ce projet).
- **Export CSV simple uniquement**, pas de FEC. Le FEC est une norme fiscale qui ne s'impose qu'à certains statuts/tailles — à valider avec le comptable de Carole avant d'investir dedans si le besoin se confirme un jour.
- **TVA à taux unique 20 %**, cohérent avec le reste de l'app (Carole IBCLC, non exonérée) — pas de double régime Consultation/Formation exonérée comme évoqué dans la spec Lactéo (nécessiterait une validation comptable, hors scope).
- **"En retard" n'est pas un statut stocké** : calculé à l'affichage (`payment_status != 'paid' AND due_date < aujourd'hui`) pour éviter un cron dédié à faire vieillir un statut.
- Hors scope explicite : devis, export FEC, fréquence de sync Pennylane, cascade de relances automatiques, exonération TVA formation, entités de facturation multiples.

## Modèle de données (nouvelle migration)

**`invoices`** (altération) :
- `payment_id` devient nullable (une facture manuelle n'a pas de paiement Stripe).
- `reference_id` devient nullable (pas de booking/formation/event associé pour une facture libre).
- `type` (colonne `payment_type`) devient nullable — une facture manuelle n'a pas d'origine `payment_type` réelle.
- `origin TEXT NOT NULL DEFAULT 'stripe' CHECK (origin IN ('stripe', 'manual'))` — distingue une facture auto-émise (Stripe) d'une facture libre. Choix d'une colonne dédiée plutôt que d'étendre l'enum `payment_type` : PostgreSQL interdit d'utiliser une valeur d'enum tout juste ajoutée dans la même transaction qui l'a créée, et chaque fichier de migration de ce projet s'exécute comme une seule transaction — ajouter puis utiliser `'manual'` dans le même fichier échouerait.
- `payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'))` — maintenu par trigger, jamais écrit directement par l'application.
- `due_date TIMESTAMPTZ` — nullable ; si absent à l'affichage/facturation, échéance = `issued_at` ("à réception").

**`invoice_settlements`** (nouvelle table) — règlements manuels enregistrés sur une facture :
```
id UUID PK
invoice_id UUID NOT NULL REFERENCES invoices(id)
method TEXT NOT NULL CHECK (method IN ('cash', 'check', 'transfer'))
amount_cents INT NOT NULL CHECK (amount_cents > 0)
paid_at TIMESTAMPTZ NOT NULL
note TEXT
recorded_by UUID NOT NULL REFERENCES profiles(id)
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```
- RLS activée. Policy SELECT : consultant propriétaire de la facture (jointure `invoices.consultant_id = auth.uid()`) + admin. **Aucune policy UPDATE/DELETE** — un règlement mal saisi se corrige par un nouveau règlement (ex. montant négatif interdit par le check, donc en pratique par une note explicative et un ajustement humain), jamais par une modification silencieuse de l'historique financier. Insertion uniquement via server action (service role), pas de policy INSERT cliente.
- Trigger `AFTER INSERT` sur `invoice_settlements` : recalcule `invoices.payment_status` en sommant les règlements de la facture face à `amount_ttc_cents` (`0` → `unpaid`, `< total` → `partial`, `>= total` → `paid`).

**`consultants`** (altération) : ajout `billing_iban TEXT`, `billing_bic TEXT`, nullables, en clair — mêmes garanties que les autres champs `billing_*` déjà sur cette table (SIREN, adresse, TVA), gérés par `src/lib/invoicing/billing-profile.ts` et la page `espace-consultante/parametres`.

**Numérotation** : une facture manuelle consomme la même séquence `invoice_sequences(consultant_id, year, month)` qu'une facture Stripe, via une nouvelle fonction `create_manual_invoice(p_content JSONB)` (SECURITY DEFINER, même structure que `create_invoice` mais sans exiger de `payment_id`/`reference_id`). Garantit la continuité légale de la numérotation entre les deux origines de facture.

## Composants applicatifs

**`src/lib/invoicing/manual-invoice.ts`** (nouveau, fonction pure testée comme `correction.ts`) :
```ts
buildManualInvoiceContent(input: {
  vatRate: number; description: string; ttcCents: number;
}): { vat_rate, description, amount_ttc_cents, amount_ht_cents, amount_vat_cents }
```
Mêmes validations que `buildCorrectionContent` (désignation non vide, montant strictement positif).

**`src/app/(dashboard)/espace-consultante/facturation/actions.ts`** (extension) :
- `createManualInvoice({ clientId, description, ttcCents, dueDate? })` — vérifie que `clientId` est bien un client de la consultante (même garde que pour toute action exportée touchant les données d'un tiers, voir [[server-actions-parametre-autorisation-attaquable]] : le contrôle de relation se fait **en interne** dans cette action composite, jamais via un paramètre fourni par l'appelant), construit le contenu via `buildManualInvoiceContent`, appelle le RPC `create_manual_invoice`, envoie l'email (réutilise `sendInvoiceEmail`).
- `recordSettlement({ invoiceId, method, amountCents, paidAt, note? })` — charge la facture en filtrant `.eq("consultant_id", user.id)` (même pattern que `resendInvoice`/`correctInvoice`), insère le règlement.
- `exportInvoicesCsv({ from, to, status?, clientId? })` — construit le CSV factures + règlements joints, filtré par période/statut/patiente (§6.4). Fonction de construction du CSV isolée et pure (`src/lib/invoicing/csv-export.ts`) pour être testable sans Supabase.
- Relance : réutilisation telle quelle de `resendInvoice` existante, déclenchée depuis un bouton "Relancer" visible uniquement sur une facture `en retard` — pas de nouvelle action ni de job cron.

## UI (`espace-consultante/facturation/page.tsx` et `_components/`)

- Bouton "Nouvelle facture" → formulaire (client, désignation, montant TTC, échéance optionnelle).
- Chaque ligne de facture affiche une pastille de statut de règlement (En attente / Partiellement payée / Payée / **En retard** si applicable) et, si non soldée, les actions "Enregistrer un règlement" (modal : montant, moyen, date, note) et "Relancer".
- Bouton "Exporter" sur la liste, avec filtres période/statut/patiente, déclenche le téléchargement du CSV.
- Paramètres de facturation (profil) : ajout des champs IBAN/BIC, affichés sur les factures manuelles marquées virement en attente.

## Erreurs et cas limites

- Montant de règlement supérieur au solde restant : refusé côté action (message explicite), pas de solde négatif.
- Facture manuelle sur un client sans relation avec la consultante : refusée par le contrôle interne de `createManualInvoice`.
- Correction d'une facture manuelle : réutilise `correctInvoice` existant, qui n'est pas impacté par `payment_id`/`reference_id` nullable (il ne les lit pas).
- Export CSV sur une période sans facture : fichier avec en-têtes seuls, pas d'erreur.

## Tests (TDD)

- `buildManualInvoiceContent` : désignation vide, montant ≤ 0, cas nominal (unitaire, pur).
- Le calcul de statut de règlement vit dans le trigger SQL (pas de logique dupliquée côté TS) ; couvert par les tests unitaires de `recordSettlement` avec un client Supabase mocké (même pattern que `crm/actions.spec.ts`), qui vérifient que l'action lit bien `payment_status` mis à jour après insertion — pas de test SQL direct du trigger, cohérent avec l'absence d'infra pgTAP dans ce projet.
- `createManualInvoice` : rejette un `clientId` sans relation avec la consultante ; rejette pour un autre consultant que l'appelant (client Supabase mocké).
- `recordSettlement` : rejette un montant dépassant le solde restant ; rejette sur une facture d'un autre consultant (client Supabase mocké).
- CSV export (fonction pure) : colonnes, filtrage période/statut/client, cas vide.
- RLS `invoice_settlements` : lecture limitée au consultant propriétaire + admin ; aucune policy update/delete active (test de régression, dans l'esprit de la revue finale du chantier précédent).

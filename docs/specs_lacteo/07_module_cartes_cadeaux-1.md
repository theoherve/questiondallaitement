# Module 7 — Cartes cadeaux

> Voir `00_cadrage_global.md` pour le contexte et les décisions transverses.

Intégration au parcours de réservation existant (Next.js), pour permettre l'achat, l'offre et l'utilisation de cartes cadeaux directement depuis le site.

---

## 7.1 Émission d'une carte cadeau

| Champ | Type | Détail |
|---|---|---|
| Type de carte | Choix unique | **Montants prédéfinis uniquement** (ex. 50€, 100€ — liste à définir) ou liée à une prestation spécifique (ex. "1 consultation initiale offerte") — pas de montant libre à la saisie |
| Code unique | Généré automatiquement | Format `CADEAU-XXXXXX`, non réutilisable |
| Date d'émission / d'expiration | Auto / **12 mois** | Durée de validité fixée à 12 mois à compter de l'achat |
| Acheteur | Nom, email | Pour la facture et les notifications |
| Bénéficiaire | Nom, email (optionnel) | Si envoi direct au destinataire plutôt qu'à l'acheteur |
| Message personnalisé | Texte libre | Affiché sur le PDF / l'email envoyé au bénéficiaire |
| Mode de remise | Choix unique | Envoi par email direct au bénéficiaire, ou PDF imprimable remis par l'acheteur lui-même |

## 7.2 Intégration au parcours de réservation

- Sur l'écran de réservation existant, ajout d'un champ "Vous avez un code cadeau ?" permettant de saisir le code.
- Vérification en temps réel : validité (non expiré), solde suffisant, code non déjà utilisé.
- Application automatique du montant ou de la prestation en réduction du prix affiché.
- Cumul possible avec un autre moyen de paiement pour la différence si le solde de la carte est inférieur au prix de la prestation.
- **Application également possible directement sur une facture** (pas seulement au moment de la réservation) : la praticienne peut saisir un code carte cadeau lors de la création d'une facture, avec vérification en temps réel (voir module Facturation §6.5).

## 7.3 Gestion des soldes

- **Carte "montant"** : utilisable comme un avoir sur n'importe quelle prestation ; solde restant suivi après usage partiel.
- **Carte "prestation"** : liée à un type de consultation précis (module Agenda §4.1), généralement à usage unique et non fractionnable.

## 7.4 Back-office praticien(ne)

- Vue "Cartes cadeaux" : liste des cartes émises, statut (active / utilisée / expirée), solde restant, historique d'utilisation.
- Émission manuelle d'une carte par la praticienne (ex. geste commercial, dédommagement), hors achat en ligne.
- Génération automatique d'une facture ou d'un reçu à l'achat (lien avec le module Facturation).

## 7.5 Notifications

- Email de confirmation d'achat à l'acheteur.
- Email avec le code au bénéficiaire si l'envoi direct a été choisi.
- Rappel avant expiration (ex. 1 mois avant échéance), pour inciter à l'utilisation.

## 7.6 Politique de remboursement et d'expiration

Politique à afficher dans les conditions générales de vente et à rappeler dans l'email de confirmation d'achat.

**Principe général**
- La carte cadeau est valable 12 mois à compter de l'achat (durée mentionnée sur la carte et dans l'email de confirmation).
- Utilisable en une ou plusieurs fois avant expiration.
- Passé ce délai, elle est par défaut périmée et non remboursable, sauf les deux cas ci-dessous.

**Exception 1 — Rétractation légale (achat en ligne)**
- Délai légal de **14 jours** à compter de l'achat pour se rétracter, à condition que la carte n'ait pas été activée ni utilisée (même partiellement).
- Remboursement intégral sur le moyen de paiement d'origine si la rétractation est exercée dans ce délai.

**Exception 2 — Demande après expiration (prolongation ou remboursement exceptionnel)**
- Demande recevable uniquement dans un délai de **[à définir]** jours suivant la date d'expiration — au-delà, aucune demande n'est recevable.
- Un remboursement exceptionnel peut faire l'objet d'une retenue pour frais de gestion de **[à définir]** (montant ou %).
- Alternative préférée au remboursement : émission d'une nouvelle carte de valeur équivalente, valable **[à définir]** (ex. 6 mois).

**Procédure de demande** (prolongation ou remboursement)
- Le porteur/l'acheteur fournit : le numéro de la carte, une copie de la facture d'achat, et si un remboursement est validé, un IBAN/BIC.
- Contact dédié à créer : email support et/ou adresse postale — **[à définir]**.

**Cas non remboursables dans tous les cas** : cartes issues d'opérations promotionnelles, de concours, ou offertes à titre gracieux (cartes nominatives promotionnelles).

## 7.7 Traitement comptable

**Facture immédiate à l'achat** : la facture de la carte cadeau est émise dès l'achat (pas de traitement différé type "produit constaté d'avance" jusqu'à l'utilisation). Cette facture suit les mêmes règles que les autres factures du module Facturation (numérotation, TVA, synchronisation Pennylane le cas échéant pour Carole Hervé — voir module Facturation §6.6).

---

## Points ouverts

- Liste des montants prédéfinis à proposer (ex. 30€ / 50€ / 100€ ?)
- Valeurs manquantes de la politique de remboursement (§7.6) : délai de recours après expiration, montant/pourcentage des frais de gestion, durée de la carte de remplacement, email et/ou adresse postale de contact pour les demandes

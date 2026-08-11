# Module 6 — Facturation et paiements

> Voir `00_cadrage_global.md` pour le contexte et les décisions transverses.

**Statut confirmé :** profession libérale, assujettie à la TVA, terme retenu **"facture"** (pas "note d'honoraires"). Le modèle de facture inclut une ligne de TVA (taux applicable précisé ci-dessous) en plus des mentions obligatoires standard.

---

## 6.1 Génération de factures

| Déclencheur | Détail |
|---|---|
| Automatique | Via une case à cocher **directement dans l'écran de consultation** ("Établir une facture — envoyée par email en fin de consultation"), reprenant le tarif du type de consultation (module Agenda §4.1) |
| Manuel | Facture libre (ex. pack de consultations, formation) créée par la praticienne depuis le module Facturation |

**Numérotation et mentions légales**

- Numérotation **séquentielle continue**, générée automatiquement, sans rupture ni suppression possible (obligation légale française).
- Mentions obligatoires à intégrer au modèle : numéro de facture, date d'émission, identité du praticien(ne) (nom, statut, adresse, SIREN/SIRET, mention TVA), identité de la patiente, date de la prestation, désignation précise (type de consultation), montant HT/TTC selon régime TVA, conditions de paiement, mention des pénalités de retard le cas échéant.
- **Deux régimes de TVA à gérer selon le type de prestation** : chaque ligne de facture porte une catégorie ("Consultation" ou "Formation") qui détermine automatiquement le taux applicable — **20 % pour les consultations**, **exonération de TVA pour les formations** (mention légale d'exonération à faire valider avec le comptable, ex. article du CGI applicable selon l'agrément formation professionnelle). Une même facture peut mélanger les deux régimes si besoin.
- **Identifiants professionnels affichés sous le SIRET** : champ libre dédié pour faire apparaître le n° IBCLC, le n° ADELI, le n° RPPS ou un agrément, sur chaque facture/devis.
- **Mention légale de pénalité de retard**, activable, avec texte par défaut modifiable : *"En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée, ainsi qu'une indemnité forfaitaire de 40€ pour frais de recouvrement."* (n'apparaît pas sur les devis/avoirs, uniquement sur les factures).
- **Recherche automatique par SIRET** à la création d'une entité de facturation : pré-remplit raison sociale, adresse et informations légales (via API type INSEE Sirene) pour limiter la saisie manuelle.
- **Entités de facturation multiples** : le système permet de créer plusieurs "entités" de facturation (ex. cabinet principal, SELARL) avec chacune ses propres SIRET/TVA/IBAN/préfixe de numérotation — utile si Théo ou une future collègue facture sous des structures juridiques différentes (ex. consultations vs formations).
- Format PDF, téléchargeable, envoyé automatiquement par email, et accessible depuis le portail patient (dossier famille → onglet factures).

## 6.2 Suivi des règlements

| Statut de facture | Déclenchement |
|---|---|
| En attente | Facture émise, non payée |
| Payée | Paiement reçu et rapproché |
| Partiellement payée | Paiement partiel enregistré |
| En retard | Date d'échéance dépassée sans paiement |
| Annulée | Avoir émis (voir §6.3) |

- Moyens de paiement enregistrés : carte bancaire via **Stripe Connect** (le paiement en ligne est encaissé directement sur le compte Stripe de la praticienne, l'outil ne stocke aucune donnée bancaire — à vérifier si le système de réservation déjà codé utilise déjà Stripe pour éviter une double intégration), virement (coordonnées bancaires IBAN/BIC stockées chiffrées), espèces, chèque — saisie manuelle du règlement pour ces trois derniers.
- Relances automatiques pour impayés : email à échéance + N jours (délai et nombre de relances à définir).
- Tableau de bord : chiffre d'affaires par période, factures en attente, impayés, taux de recouvrement.

## 6.3 Avoirs et annulations

- **Jamais de suppression d'une facture émise** (traçabilité légale). Toute correction ou annulation passe par l'émission d'un **avoir** (note de crédit), lié à la facture d'origine.
- Cas d'usage : consultation annulée après facturation, erreur de montant, remboursement partiel.

## 6.4 Export comptable

- Export des factures et règlements en CSV/Excel pour transmission au comptable, filtrable par période/statut/patiente.
- Option Fichier des Écritures Comptables (FEC) si une obligation légale l'impose selon le statut de la praticienne — à valider avec le comptable.
- Numérotation configurable avec préfixe personnalisable pour factures et devis (ex. `FACTURE-26-01-001`, `DEVIS-26-01-001`), délai de paiement par défaut paramétrable (ex. "à réception").
- **Devis** : en plus des factures et avoirs, génération de devis (utile pour un pack de plusieurs consultations ou une prestation de formation sur mesure), avec sa propre numérotation.

## 6.5 Liens avec les autres modules

- Facture rattachée au **Dossier famille** (visible depuis la vue Famille et la vue Enfant) et au **rendez-vous** correspondant (module Agenda).
- Une **carte cadeau** (module 7) peut s'appliquer directement à la création d'une facture : champ dédié pour saisir un code (format `CADEAU-XXXXXX`), avec vérification en temps réel de sa validité avant application en règlement total ou partiel.

## 6.6 Intégration comptable — Pennylane

Synchronisation des factures (et avoirs) vers Pennylane, **activable par praticien(ne), pas au niveau du cabinet entier** : dans le mode multi-praticien retenu, chaque praticien(ne) gère sa propre comptabilité et n'active la synchronisation que si elle le souhaite. À ce stade, seule l'utilisatrice **Carole Hervé** active cette intégration ; les autres praticien(ne)s n'ont aucune synchronisation Pennylane activée par défaut.

**Méthode de connexion (technique) :** Pennylane fonctionne avec une **clé API générée depuis Paramètres entreprise → Connectivité** dans son propre compte Pennylane, pas avec un identifiant/mot de passe de connexion partagé. Chaque praticien(ne) souhaitant activer la synchronisation génère sa propre clé API dans son compte Pennylane et la renseigne dans les paramètres de son profil sur la plateforme — aucune donnée de connexion personnelle ne doit être stockée côté site.

⚠️ **Point de sécurité :** des identifiants de connexion Pennylane en clair (email/mot de passe) ont été partagés à un moment de ce projet. Ils n'ont pas été utilisés ni stockés. Par précaution, ce mot de passe doit être changé sur Pennylane. Pour la mise en œuvre réelle, seule la clé API décrite ci-dessus doit être utilisée, générée directement par Carole Hervé depuis son compte Pennylane.

**Données synchronisées :** factures émises et avoirs, avec les champs légaux définis en §6.1.
**Fréquence :** à définir — synchronisation à chaque émission de facture, ou synchronisation automatique quotidienne (fonctionnement standard des connecteurs Pennylane).

---

## Points ouverts

- Moyen(s) de paiement en ligne à intégrer : le prestataire déjà utilisé pour la réservation en ligne (si paiement en ligne existant) peut-il être réutilisé pour le rapprochement automatique ?
- Politique de relance des impayés : délai avant première relance, nombre de relances, ton des messages
- Besoin ou non d'un export FEC en plus de l'export CSV/Excel simple
- Fréquence exacte de synchronisation Pennylane (§6.6)

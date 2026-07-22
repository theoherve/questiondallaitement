# Facturation — conception

> Facture emise **par la consultante** a la cliente, generation maison,
> modifiable pour les cas particuliers. TVA a 20 %, prix affiches TTC.
>
> Ce document fixe le cadre avant d'ecrire le reste. Le calcul HT/TVA est deja
> fait ([vat.ts](../src/lib/invoicing/vat.ts)) ; tout le reste attend les
> decisions et donnees ci-dessous.

---

## 🔴 Ce qui bloque, et qu'il me faut de toi

Une facture non conforme n'a aucune valeur, et certaines mentions sont
**obligatoires**. Impossible d'en generer une valable sans :

| Donnee | Pourquoi | Statut |
| --- | --- | --- |
| **N° de TVA intracommunautaire** | Des lors qu'on facture la TVA | ✅ `FR94540075819` |
| SIREN | Mention obligatoire | ✅ `540075819` (extrait du n° TVA) |
| Raison sociale / nom tel qu'immatricule | Emetteur de la facture | ⬜ saisie par la consultante |
| Adresse de l'etablissement | Mention obligatoire | ⬜ saisie par la consultante |
| Forme juridique | Selon le statut | ⬜ facultatif |

**L'identite de facturation est desormais un profil par consultante**
([billing-profile.ts](../src/lib/invoicing/billing-profile.ts), colonnes ajoutees
par [00053](../supabase/migrations/00053_billing_profile.sql)), saisi depuis
l'onglet « Facturation » de l'espace consultante. Une consultante ne peut pas
facturer — donc pas vendre en ligne — tant que raison sociale, adresse, SIREN et
n° de TVA ne sont pas remplis. Ce gate est applique a l'emission (PR B).

Le numero de TVA et le SIREN de Carole sont pre-remplis ; il lui reste sa raison
sociale et son adresse. Le placeholder `[Numéro TVA]` des mentions legales est
comble ; les autres (raison sociale, adresse, SIRET) attendent sa saisie.

---

## Contraintes qui dictent la conception

**Numerotation sequentielle, sans trou, sans doublon.** C'est une obligation
legale, et c'est le point le plus delicat techniquement : deux ventes
simultanees ne doivent jamais recevoir le meme numero, ni sauter un numero si
l'une echoue. Meme probleme d'atomicite que le limiteur de debit (5-1), meme
solution : un compteur en base, incremente dans une transaction. Le numero est
attribue **a l'emission**, pas a la creation d'un brouillon.

**Immuabilite une fois emise.** Une facture emise ne se modifie pas : on emet un
**avoir** puis une nouvelle facture. La demande « modifiable pour les cas
particuliers » se lit donc en deux temps :

- avant emission, tout est modifiable (c'est un brouillon) ;
- apres emission, la correction passe par un avoir. Le modele doit distinguer
  les deux etats des le depart, sinon on s'interdit la conformite plus tard.

**Prix TTC → HT + TVA.** Deja resolu : `breakdownFromTTC` garantit
HT + TVA = TTC au centime, y compris sur les montants impairs.

---

## Decisions a prendre

| # | Question | Proposition |
| --- | --- | --- |
| 1 | Format du numero | `AAAA-MM-NNNN` (`2026-07-0001`) — sequence remise a zero **chaque mois**, choix acte |
| 2 | Quand emettre ? | **Automatiquement a chaque achat** — webhook `checkout.session.completed` en ligne, creation pour le paiement sur place — acte |
| 3 | Rendu | HTML (consultable en ligne) **et** PDF telechargeable, acte |
| 4 | Consultation + edition | Espace facturation : consulter chaque achat avec sa facture rattachee, la modifier et la renvoyer. Une facture emise etant immuable, « modifier » = emettre un avoir puis une facture corrigee. Acte |
| 5 | Envoi a la cliente | Lien dans l'email de confirmation, ou piece jointe ? |
| 6 | Consultantes tierces (futur) | Deux factures distinctes — consultante→cliente (son regime TVA) et plateforme→consultante (commission). Hors perimetre tant que Carole est seule. |

---

## Ce qui est deja fait

**PR 1/3 — fondations :**
- [vat.ts](../src/lib/invoicing/vat.ts) — decomposition TTC → HT + TVA, testee,
  taux nul gere (future consultante exoneree) ;
- [billing-profile.ts](../src/lib/invoicing/billing-profile.ts) — identite de
  facturation par consultante, saisie depuis l'onglet « Facturation ».

**PR 2/3 — emission et numerotation :**
- [numbering.ts](../src/lib/invoicing/numbering.ts) — rendu `AAAA-MM-NNNN`, teste ;
- [00054_invoices.sql](../supabase/migrations/00054_invoices.sql) — tables
  `invoices` (immuable : ni UPDATE ni DELETE) et `invoice_sequences`, plus la
  fonction atomique `create_invoice` (existence + sequence + insertion dans une
  seule transaction → numerotation sans trou ni doublon, idempotente face aux
  redeliveries) ;
- [build-invoice.ts](../src/lib/invoicing/build-invoice.ts) — contenu de la
  facture avec snapshot fige de l'emettrice, teste ;
- [emit.ts](../src/lib/invoicing/emit.ts) — emission automatique branchee sur le
  webhook `checkout.session.completed`, apres l'enregistrement du paiement ;
- gate : la vente en ligne (reservation, accompagnement, evenement) est refusee
  si le profil de facturation de la consultante est incomplet
  ([consultant-billing.ts](../src/lib/invoicing/consultant-billing.ts)).

**Paiement sur place — « marquer comme encaisse » :** le sur-place n'a pas de
moment « paye » spontane (le booking reste `pending`, aucune ligne `payments`
n'existe). Plutot que d'emettre une facture a la creation du rendez-vous — ce
qui facturerait une prestation non encore reglee — la consultante confirme
l'encaissement depuis la fiche de reservation : une ligne `payments` est creee
(montant recalcule = prix affiche, pas de commission plateforme) et la facture
emise, exactement comme pour une vente en ligne. Un index unique partiel
([00055](../supabase/migrations/00055_onsite_payment_unique.sql)) interdit le
double encaissement. Le gate de facturation s'y applique aussi : pas
d'encaissement possible sans profil complet. La comptabilite est ainsi sans
trou, ligne et en ligne comme sur place.

**PR 3/3a — espace facturation (consultation + document) :**
- [invoice-view.ts](../src/lib/invoicing/invoice-view.ts) — modele d'affichage
  (montants, taux, date), teste ;
- `/factures/[id]` — document imprimable avec toutes les mentions obligatoires,
  accessible a la cliente concernee, a l'emettrice et a l'admin ; export PDF via
  l'impression du navigateur (le HTML fait foi) ;
- listes dediees : « Facturation » cote consultante, « Mes factures » cote
  cliente, chacune liee au document.

## Ce qui reste (PR 3/3b — correction et renvoi)

1. correction d'une facture emise = avoir + facture corrigee (immuabilite) ;
2. renvoi a la cliente — **decision ouverte** : lien vers le document ou piece
   jointe PDF a l'email.

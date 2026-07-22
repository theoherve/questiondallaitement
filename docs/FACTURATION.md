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

- [vat.ts](../src/lib/invoicing/vat.ts) — decomposition TTC → HT + TVA, testee,
  taux nul gere (future consultante exoneree).

## Ce qui reste, une fois les donnees et decisions ci-dessus obtenues

1. table `invoices` + compteur atomique par annee ;
2. emission depuis le webhook et le paiement sur place ;
3. ecran admin : liste, brouillon editable, emission, avoir ;
4. gabarit HTML imprimable avec toutes les mentions obligatoires ;
5. remplissage du vrai n° de TVA dans les mentions legales.

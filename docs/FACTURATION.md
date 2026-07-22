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
| Raison sociale / nom de Carole tel qu'immatricule | Emetteur de la facture | ⬜ |
| Adresse de l'etablissement | Mention obligatoire | ⬜ |
| SIREN / SIRET | Mention obligatoire | ⬜ |
| **N° de TVA intracommunautaire** | Des lors qu'on facture la TVA | ⬜ **tu me le fournis** |
| Forme juridique + capital le cas echeant | Selon le statut | ⬜ |
| Mentions d'assurance pro, si applicable a l'activite | Selon la profession | ⬜ |

Tant que ces champs sont vides, je peux tout coder **sauf** produire une facture
que Carole puisse remettre. Le placeholder `[Numéro TVA]` des mentions legales
vient de la meme lacune.

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
| 1 | Format du numero | `AAAA-NNNN` remis a zero chaque annee (`2026-0001`), lisible et classant |
| 2 | Quand emettre ? | A la confirmation du paiement (webhook `checkout.session.completed`), pour les ventes en ligne ; a la creation pour le paiement sur place |
| 3 | Rendu | HTML imprimable en PDF cote navigateur, plutot qu'une lib PDF serveur — plus simple, et la « modification cas particulier » se fait alors sur un brouillon HTML editable |
| 4 | Edition | Ecran admin listant les factures, brouillon editable avant emission, bouton « emettre » qui fige et attribue le numero |
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

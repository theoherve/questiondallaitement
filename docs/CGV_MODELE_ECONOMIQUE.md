# CGV — texte propose et points a valider

> **Ce texte est un brouillon technique, pas un avis juridique.** Je l'ai redige
> a partir de ce que le code fait reellement, pour que les conditions decrivent
> le service tel qu'il fonctionne et pas tel qu'on l'imagine. La relecture par
> un professionnel reste necessaire : vente a distance a des consommateurs,
> intermediation de paiement et prestation para-medicale, c'est trois regimes
> qui se superposent.
>
> Les passages marques **⚠️ A trancher** demandent une decision de ta part avant
> publication.

---

## Pourquoi le modele technique engage juridiquement

Trois constats issus de l'audit Stripe ont un effet direct sur le texte.

**1. La plateforme supporte les impayes.** Le compte Express est configure avec
`controller.losses.payments = "application"` (constat 1-4). En cas de
contestation de paiement (*chargeback*), c'est Question d'Allaitement qui est
debitee, pas la consultante. Il faut donc que les CGV prevoient un recours de la
plateforme contre la consultante lorsque le litige lui est imputable.

**2. Sur les ventes partagees, la plateforme encaisse en son nom.** Depuis 4-6,
un accompagnement porte par plusieurs consultantes est encaisse par la
plateforme, qui reverse ensuite chaque part. Sur ces ventes-la, elle apparait
comme vendeur au sens du paiement — libelle de releve compris. Sur les autres,
elle reste un simple intermediaire.

**3. La plateforme ne preleve rien sur une annulation.** Decision du
2026-07-21 : sur une annulation tardive, la penalite revient integralement a la
consultante. Ce n'est pas anodin a ecrire — la cliente doit savoir a qui va la
somme retenue.

---

## Texte propose

### Article 1 — Objet et parties

Les presentes conditions regissent l'utilisation de la plateforme Question
d'Allaitement, editee par [**⚠️ A trancher** : denomination, forme juridique,
SIREN, siege, directeur de publication].

La plateforme met en relation des utilisatrices avec des **consultantes en
lactation exercant a titre independant**. Question d'Allaitement n'est pas
prestataire des consultations : elle fournit l'outil de reservation, encaisse le
prix pour le compte de la consultante et lui reverse sa part.

La consultante est seule responsable du contenu, de la qualite et de la
conformite de sa prestation, ainsi que de ses obligations professionnelles,
fiscales et sociales.

### Article 2 — Nature des prestations

Trois types de prestations sont proposes :

- **consultations individuelles**, en teleconsultation, au cabinet ou a domicile ;
- **accompagnements en ligne**, accessibles depuis l'espace personnel apres achat ;
- **evenements et ateliers**, a date fixe.

⚠️ **A trancher — mention de sante.** L'accompagnement en lactation n'est pas un
acte medical. Une mention explicite du type « les prestations ne se substituent
pas a un avis medical ; en cas de symptome, consultez un professionnel de sante »
protege tout le monde. A caler avec le professionnel qui relira.

### Article 3 — Compte utilisateur

La creation d'un compte est requise pour acceder aux accompagnements en ligne.

**Reservation sans compte prealable.** Une utilisatrice peut reserver une
consultation sans compte existant : un compte est alors cree automatiquement a
partir des informations saisies, et un email lui permet de definir son mot de
passe. Ce compte lui donne acces au suivi de ses rendez-vous.

### Article 4 — Prix et paiement

Les prix sont indiques en euros toutes taxes comprises. Le prix affiche avant
validation est celui qui est preleve, majorations de deplacement ou de creneau
comprises.

Le paiement en ligne est opere via **Stripe**. Les donnees de carte ne
transitent jamais par les serveurs de Question d'Allaitement.

Pour les consultations au cabinet ou a domicile, le **paiement sur place** peut
etre propose. Il est alors regle directement a la consultante. Le paiement sur
place n'est pas disponible en teleconsultation.

**Commission.** Question d'Allaitement percoit une commission sur chaque
prestation payee en ligne, retenue lors du reversement a la consultante. Elle
remunere la mise a disposition de la plateforme, la gestion des paiements et le
support.

⚠️ **A trancher — TVA (point 1-6, non traite).** La commission est une
prestation de services entre la plateforme et la consultante : elle est en
principe soumise a la TVA, et doit donner lieu a facturation. Selon le regime de
la plateforme (franchise en base ou non) et le statut de chaque consultante, le
traitement differe. **Ce point n'est ni implemente ni tranche a ce jour** — a
regler avant la bascule live, faute de quoi les reversements sont incomplets sur
le plan comptable.

### Article 5 — Annulation et remboursement

| Situation | Consequence |
| --- | --- |
| Annulation **plus de 48 h** avant le rendez-vous | Remboursement integral |
| Annulation **moins de 48 h** avant le rendez-vous | Retenue de 50 % du prix |
| Annulation par la consultante | Remboursement integral, quel que soit le delai |
| Creneau devenu indisponible apres paiement | Remboursement integral automatique et information par email |

**La somme retenue en cas d'annulation tardive revient integralement a la
consultante**, en compensation du creneau immobilise. Question d'Allaitement ne
percoit aucune commission sur une annulation.

Les remboursements sont effectues sur le moyen de paiement d'origine. Le delai
de restitution depend de l'etablissement bancaire.

**Droit de retractation — formulation adoptee le 2026-07-21.**

Deux cas distincts, car le code de la consommation ne les traite pas pareil.

**a) Consultation reservee a moins de quatorze jours** — case a cocher
obligatoire a l'etape de confirmation :

> Je demande expressement que la consultation ait lieu a la date choisie, avant
> l'expiration du delai de retractation de quatorze jours. Je reconnais qu'une
> fois la consultation pleinement executee, je ne pourrai plus exercer ce droit.

**b) Accompagnement en ligne, accessible immediatement** — case a cocher
obligatoire avant paiement :

> Je demande a acceder immediatement au contenu et renonce expressement a mon
> droit de retractation de quatorze jours, que je perds des le debut de
> l'execution.

**Article correspondant :**

> Conformement aux articles L221-18 et suivants du code de la consommation, la
> cliente dispose d'un delai de quatorze jours pour se retracter.
>
> Ce delai ne s'applique pas lorsqu'elle a demande expressement l'execution de
> la prestation avant son expiration et renonce a ce droit dans les conditions
> prevues aux articles L221-25 et L221-28. Cette demande et cette renonciation
> sont recueillies au moment de la reservation ou de l'achat, et conservees.
>
> Hors de ces cas, la retractation s'exerce par simple demande a
> [**⚠️ A trancher** : adresse email de contact], sans avoir a se justifier. Le
> remboursement intervient dans les quatorze jours suivant la demande.

**Ce que ca demande cote code**, et qui reste a faire :

- une case obligatoire, decochee par defaut, aux deux endroits ;
- la trace en base — date, version du texte accepte — car en cas de litige c'est
  a la plateforme de prouver que la renonciation a ete recueillie ;
- le blocage de la validation tant que la case n'est pas cochee.

⚠️ **Ancienne note, conservee pour memoire.** Pour une prestation de services
vendue a distance a un consommateur, le code de la consommation prevoit un delai
de retractation de quatorze jours. Ce delai ne s'eteint que si la prestation a
ete pleinement executee avec l'accord expres de la cliente et sa renonciation
explicite. **Le parcours de reservation ne recueille aujourd'hui aucune
renonciation.** Deux consequences :

- une consultation reservee a moins de quatorze jours devrait comporter une case
  de renonciation expresse ;
- les accompagnements en ligne, accessibles immediatement, relevent du contenu
  numerique et demandent la meme mecanique.

C'est un manque **fonctionnel**, pas seulement redactionnel : il faut ajouter la
case au parcours et en conserver la trace. Je peux l'implementer une fois la
formulation validee.

### Article 6 — Contestations de paiement

En cas de contestation aupres de l'etablissement bancaire de la cliente, la
somme est debitee de Question d'Allaitement, qui supporte egalement les frais
appliques par Stripe.

Lorsque la contestation resulte de l'inexecution ou de la mauvaise execution de
la prestation, Question d'Allaitement peut recuperer les sommes correspondantes
sur les reversements ulterieurs dus a la consultante.

⚠️ **A trancher** : ce mecanisme de compensation doit figurer aussi dans le
contrat qui te lie aux consultantes, pas seulement dans les CGV clientes — ces
dernieres ne lient pas la consultante.

### Article 7 — Accompagnements en ligne

L'acces est personnel et incessible, sans limitation de duree, sous reserve du
maintien du service.

Les contenus sont proteges. Leur reproduction ou diffusion est interdite.

### Article 8 — Teleconsultation

Les teleconsultations se tiennent via **Zoom**. Le lien de connexion est envoye
par email apres confirmation. Il appartient a la cliente de disposer d'une
connexion suffisante ; une defaillance de son propre materiel ne donne pas lieu
a remboursement.

### Article 9 — Donnees personnelles

Les donnees sont hebergees dans l'Union europeenne (Supabase). Les emails
transactionnels et marketing transitent par des prestataires tiers.

⚠️ **A trancher** : la politique de confidentialite doit lister precisement les
sous-traitants (Stripe, Supabase, Zoom, l'envoi d'emails), les durees de
conservation, et le sort du **motif de consultation**, qui est une donnee de
sante au sens du RGPD. Ce champ est libre et rempli par la cliente — il merite
un traitement explicite.

### Article 10 — Mediation

Conformement au code de la consommation, la cliente peut recourir gratuitement a
un mediateur de la consommation.

⚠️ **A trancher** : l'adhesion a un mediateur agree est **obligatoire** pour tout
professionnel vendant a des consommateurs. Il faut souscrire et faire figurer
ses coordonnees ici.

---

## Recapitulatif des decisions attendues

| # | Sujet | Bloquant pour le live |
| --- | --- | --- |
| 1 | Identite legale de l'editeur | Oui |
| 2 | Mention « ne se substitue pas a un avis medical » | Oui |
| 3 | TVA sur la commission (1-6) | Oui |
| 4 | Renonciation au droit de retractation — **necessite du code** | Oui |
| 5 | Clause de compensation dans le contrat consultantes | Oui |
| 6 | Sous-traitants et donnees de sante dans la politique de confidentialite | Oui |
| 7 | Adhesion a un mediateur de la consommation | Oui |

Les points 3 et 4 demandent du developpement, pas seulement de la redaction.
Les autres sont redactionnels ou administratifs.

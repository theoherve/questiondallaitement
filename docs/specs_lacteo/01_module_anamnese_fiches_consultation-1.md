# Module 1 — Fiches de consultation IBCLC (Anamnèse)

> Voir `00_cadrage_global.md` pour le contexte et les décisions transverses.

Deux fiches structurées, alignées sur la pratique clinique IBCLC. Chaque fiche est rattachée à un **enfant** ou directement à la **mère/patiente seule** (consultation "parent/patiente", sans enfant — ex. mastite, douleur mammaire sans lien avec un enfant précis) au sein d'un **Dossier famille** (voir `02_module_dossier_famille.md`), et horodatée à la date du rendez-vous.

| Fiche Lactéo | Nom retenu |
|---|---|
| Fiche initiale IBCLC complète | **Anamnèse Consultation d'allaitement** |
| Suivi après consultation initiale | **Consultation de suivi** |

À l'ouverture d'une consultation, la praticienne choisit : l'enfant concerné (ou "aucun enfant — consultation parent/patiente"), puis la fiche à utiliser (Initiale ou Suivi). Le panneau **"Consultations précédentes"** reste consultable en bas de la fiche en cours, pour se référer rapidement à l'historique sans changer d'écran.

---

## 1.1 Fiche "Anamnèse Consultation d'allaitement" (consultation initiale)

Fiche longue, remplie au premier rendez-vous ou à la reprise d'un suivi après une longue interruption. Organisée en sections dépliables/repliables.

### A. Identification (auto-remplie)

| Champ | Type | Détail / logique |
|---|---|---|
| Date de consultation | Date (auto) | Pré-remplie depuis l'agenda, modifiable |
| Patiente | Auto-rempli | Nom, âge, email, téléphone — depuis le Dossier famille |
| Enfant concerné | Sélection ou "aucun" | Liste des enfants du dossier famille, ou "Consultation parent/patiente (sans enfant)" |
| Type de consultation | Liste déroulante | Cabinet / Domicile / Téléconsultation — hérité du RDV |

### B. Motif de consultation

| Champ | Type | Détail / logique |
|---|---|---|
| Projet initial d'allaitement | Texte libre | Ce que la mère avait prévu/souhaité au départ |
| Notes utiles | Texte libre multiligne, **obligatoire** | Motif détaillé de la consultation |

### C. Référents

| Champ | Type | Détail / logique |
|---|---|---|
| Référents | Choix multiple (cases à cocher) | Sage-femme, Médecin gynécologue-obstétricien, Médecin traitant, Médecin pédiatre enfant — sert de base aux destinataires du courrier de transmission (§1.3) |

### D. Antécédents médicaux et chirurgicaux

Chaque antécédent est une question oui/non individuelle (plutôt qu'un multi-select global), pour forcer une réponse explicite et éviter les oublis :

| Champ | Type | Détail / logique |
|---|---|---|
| Dysfonctionnement thyroïdien | Oui/Non obligatoire | |
| Diabète (I, II, équilibré ou non) | Oui/Non obligatoire + précision | |
| SMOP (syndrome métabolique ovarien polyendocrinien) | Oui/Non obligatoire | |
| Endométriose | Oui/Non obligatoire | |
| Chirurgie mammaire | Choix multiple obligatoire | Non / augmentation incision périaréolaire + implant rétro-glandulaire / augmentation incision infra-sinusale + implant infra-pectoral / augmentation incision axillaire + implant infra-pectoral / réduction / biopsie / mastectomie / antécédent d'abcès — le type d'incision et de pose d'implant est cliniquement pertinent pour évaluer le potentiel de production |
| Allergies médicamenteuses | Oui/Non obligatoire + texte libre si oui | |
| Allergies autres | Oui/Non obligatoire + texte libre si oui | |
| Traitements médicamenteux en cours | Oui/Non + texte libre si oui | Pas de lien vers une base de compatibilité médicamenteuse (type CRAT) |
| Autre (préciser) | Case à cocher + texte libre | |

### E. Histoire gynéco-obstétricale

| Champ | Type | Détail / logique |
|---|---|---|
| Allaitement(s) précédent(s) | Choix : oui / non pas d'enfant précédent | Pré-rempli automatiquement si un aîné existe dans le dossier famille (voir module Dossier famille), reste modifiable |
| Contraception actuelle | Liste déroulante | Certains moyens de contraception hormonale peuvent influencer la lactation |
| Gestité et parité | Texte (ex. G3P2) | Repris en tête du dossier famille |

### F. Conception - grossesse

| Champ | Type | Détail / logique |
|---|---|---|
| Conception | Texte libre | Naturelle / PMA / FIV, etc. |
| Déroulement grossesse | Texte libre multiligne | Complications, hospitalisations, traitements |

### G. Accouchement - naissance

| Champ | Type | Détail / logique |
|---|---|---|
| Terme | Texte / numérique (SA) | |
| Voie basse | Choix multiple | Sans instrument / Avec instrument / Épisiotomie / avec péridurale / sans péridurale (non exclusifs, cumulables) |
| Déclenchement | Case à cocher | |
| Césarienne | Choix multiple | Programmée / Itérative / pendant le travail |
| Accueil du nouveau-né | Texte libre multiligne | Ex. séparation mère-bébé, réanimation, transfert |
| Contact peau-à-peau | Choix unique | Immédiat / Non interrompu / très peu / Aucun |
| Tétée précoce | Texte libre | Délai et déroulement de la première mise au sein |
| Autres remarques | Texte libre | |

### H. Histoire de l'allaitement et alimentation actuelle

| Champ | Type | Détail / logique |
|---|---|---|
| Fréquence des tétées / 24h | Numérique | |
| Durée moyenne d'une tétée | Numérique (min) | |
| Élimination (couches/selles) | Numérique x2 + couleur | Indicateur clinique clé, réutilisé en fiche de suivi |
| Compléments actuels | Choix + détail | Aucun / lait maternel tiré / Préparation commerciale pour nourrissons / mixte — quantités, mode d'administration (biberon, DAL, tasse, seringue, doigt) |
| Qualité du sommeil maternel | Choix + détail | Question posée : *"Une fois que votre bébé s'est endormi la nuit après une tétée, combien de temps mettez-vous à vous rendormir ?"* — Immédiatement (moins de 25 minutes) / Après 25 minutes. Un lien vers l'échelle d'auto-évaluation EPDS (Édimbourg, dépistage de la dépression du post-partum) est envoyé à la patiente pour qu'elle s'auto-évalue de son côté — résultat non interprété automatiquement par l'outil, à discuter en consultation |
| Observation de la tétée | Texte libre multiligne | Installation, prise du sein, transfert de lait observé |
| Intervention éventuelle et observations subséquentes | Texte libre multiligne | Ce qui a été testé pendant la consultation et son effet immédiat |

### I. Examen clinique de la mère

| Champ | Type | Détail / logique |
|---|---|---|
| Général | Texte libre | État général, fatigue, douleur |
| Mamelons | Texte libre multiligne | Forme, crevasses, douleur, vasospasme — photo optionnelle, **prise directement via la webcam de l'ordinateur** (en plus de l'upload d'un fichier existant), intégrée à la fiche de la patiente |

*Exigence technique : le navigateur doit pouvoir accéder à la caméra de l'ordinateur (autorisation webcam) pour permettre la prise de photo en direct, en plus du dépôt de fichier classique — utile pour documenter l'état des mamelons/seins sans dépendre d'un téléphone.*

### J. Examen clinique du nouveau-né

| Champ | Type | Détail / logique |
|---|---|---|
| Général | Texte libre | |
| Facial et maxillo-facial | Texte libre | |
| Frein lingual | Texte libre | Évaluation de la restriction linguale |
| Autre | Texte libre | |

### K. Conclusions et plan d'action

| Champ | Type | Détail / logique |
|---|---|---|
| Conclusions | Texte libre multiligne, **obligatoire** | Synthèse clinique IBCLC |
| Stratégie idéale / retenue / suivi nécessaire | Texte libre multiligne | Recommandations et plan d'action |
| Date suivi - prochain rdv | Date | Peut déclencher une proposition de créneau dans l'agenda |

### L. Consentement

| Champ | Type | Détail / logique |
|---|---|---|
| Consentement RGPD / données de santé | Case à cocher obligatoire | Horodaté, conservé comme preuve de consentement |
| Signature | Signature électronique ou tampon praticienne | Selon le canal (portail patient en amont, ou signature en cabinet) |

---

## 1.2 Fiche "Consultation de suivi"

Fiche courte, centrée sur l'évolution, avec rappel automatique du contexte de la fiche précédente.

### A. Rappel contextuel (lecture seule, auto-rempli)

| Champ | Type | Détail / logique |
|---|---|---|
| Motif initial | Lecture seule | Repris de la dernière fiche pour cet enfant/cette patiente |
| Conclusions et stratégie précédentes | Lecture seule | |
| Date de la dernière consultation | Lecture seule | |

### B. Évolution

| Champ | Type | Détail / logique |
|---|---|---|
| Évolution du motif initial | Choix unique | Amélioration nette / partielle / stable / aggravation |
| Application des recommandations | Choix + texte libre | Totale / partielle / non appliquée, avec pourquoi |
| Poids actuel | Numérique (g) | Alimente automatiquement la courbe de poids ; delta et % calculés automatiquement |
| Élimination | Identique fiche initiale | |
| Nouveaux problèmes | Texte libre | |

### C. Observation clinique du jour

Mêmes champs que les sections I/J de la fiche initiale (examen mère/nouveau-né, observation de la tétée), sous forme condensée.

### D. Conclusions et plan d'action mis à jour

| Champ | Type | Détail / logique |
|---|---|---|
| Conclusions | Texte libre | |
| Stratégie ajustée | Texte libre | |
| Décision de suivi | Choix unique | Poursuite du suivi / fin de suivi (objectifs atteints) / orientation externe nécessaire |
| Prochain rendez-vous | Date | |

---

## 1.3 Courrier de transmission

**Décision : pas de génération par IA.** La rédaction du courrier de transmission reste **entièrement manuelle** : la praticienne sélectionne les champs à transmettre et rédige/ajuste elle-même le texte, sans brique IA.

Disponible depuis n'importe quelle fiche de consultation (initiale ou suivi), une fois les Conclusions renseignées : bouton "Générer un courrier de transmission".

| Élément | Détail / logique |
|---|---|
| Destinataire(s) | Pré-rempli à partir des référents cochés en section C (Référents) ; possibilité d'ajouter un destinataire libre (nom, fonction, email ou adresse postale) si le professionnel n'est pas dans la liste — ex. médecin/sage-femme du bébé si différent(e) de celui/celle de la mère |
| Modèle de courrier | **Modèle unique**, pas de personnalisation par praticien(ne) |
| Sélection des champs à transmettre | **Systématique à chaque génération** : la praticienne choisit à chaque fois, parmi les éléments de la fiche (motif, antécédents, observations, conclusions, stratégie), ceux à inclure dans le courrier — rien n'est transmis par défaut sans validation explicite |
| Contenu pré-rempli | Une fois les champs sélectionnés : motif de consultation, éléments d'antécédents pertinents, observations cliniques, conclusions IBCLC, stratégie/recommandations, date du prochain RDV si prévu. Texte entièrement modifiable avant envoi. |
| En-tête / pied de page | Coordonnées professionnelles de la praticienne (nom, IBCLC, n° IBCLC repris de l'entité de facturation — voir module Facturation §6.1). Pas de mention ADELI/RPPS. |
| Consentement | Case à cocher **distincte** du consentement RGPD général de la fiche : *"La patiente autorise la transmission de ces informations au(x) professionnel(s) désigné(s)"*, horodatée et conservée comme preuve |
| Mode d'envoi | Email direct au destinataire (si email connu), et/ou génération PDF téléchargeable (envoi postal, fax, ou remise à la patiente qui le transmet elle-même) |
| Historique | Chaque courrier envoyé (date, destinataire(s), contenu) reste consultable depuis la fiche de consultation et depuis le Dossier famille |

## 1.4 Documents joints à la consultation

Chaque consultation dispose de son propre espace de dépôt de documents (photos de mise au sein, ordonnances, comptes-rendus externes), distinct des documents généraux du dossier famille mais consultable aussi depuis "Tous les documents du dossier". Formats acceptés : JPG, PNG, PDF, Word, Excel, CSV, MP4 — jusqu'à 5 Mo (10 Mo pour la vidéo). Le support vidéo permet de filmer une tétée observée et de la revoir/l'annoter ensuite.

---

## Points ouverts

- Upload de photo pour l'examen du frein de langue (nouveau-né) — à confirmer si utile en V1, sur le même principe que la photo webcam des mamelons
- Contenu exact du lien envoyé pour l'échelle EPDS (lien externe existant à réutiliser, ou formulaire à construire dans l'outil) — voir section H

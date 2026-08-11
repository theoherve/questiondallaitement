# Module 2 — Dossier famille

> Voir `00_cadrage_global.md` pour le contexte et les décisions transverses.

Le dossier patient est structuré en **Dossier famille** : un foyer regroupe une ou plusieurs mères/parents et un ou plusieurs enfants, chacun disposant de son propre historique de consultations tout en partageant les informations communes du foyer.

---

## 2.1 Modèle de données

| Entité | Champs clés | Relations |
|---|---|---|
| **Famille** | Nom affiché du foyer, coordonnées principales (email, téléphone, adresse), langue préférée, notes générales, praticien(ne) référent(e) | 1 famille → n parents, 1 famille → n enfants |
| **Parent / mère** | Nom, prénom, date de naissance, coordonnées, antécédents maternels globaux (chirurgie mammaire, endocrinologie, allaitements précédents) | Rattaché à 1 famille ; peut être lié à plusieurs enfants |
| **Enfant** | Nom, prénom, date de naissance, sexe, poids/taille/PC de naissance, terme de naissance, praticien(ne) référent(e) | Rattaché à 1 famille ; 1 enfant → n fiches de consultation, n mesures de poids, n factures |
| **Grossesse** | Statut (en cours / terminée), date de terme initiale, gynécologue référent, contexte médical, notes, coordonnées du co-parent (nom, prénom, téléphone, date de naissance) | Rattachée à 1 mère ; peut précéder la création du dossier Enfant (utile pour les consultations prénatales) |
| **Fiche de consultation** | Type (initiale / suivi), contenu structuré (voir module Anamnèse), date, praticien(ne) | Rattachée à 1 enfant **ou directement à la mère** (consultation "parent/patiente" sans enfant, ex. mastite), horodatée depuis un rendez-vous |
| **Mesure de poids** | Date, poids, contexte de pesée | Rattachée à 1 enfant ; alimentée automatiquement par les fiches de consultation ou saisie manuelle (portail patient, si autorisé) |

### Détail de l'entité Enfant

Champs collectés à la création : prénom (obligatoire), option "nom différent du parent" (par défaut l'enfant hérite du nom de famille de la mère), genre, date de naissance (obligatoire — **non modifiable après création**, pour garantir l'intégrité des courbes de croissance), terme de naissance (semaines d'aménorrhée + jours), statut prématuré (case à cocher, **non modifiable après création** — active le calcul de l'âge corrigé, voir module Courbes de poids), poids/taille/périmètre crânien de naissance (reportés automatiquement sur les courbes), contexte médical (texte libre).

### Détail de l'entité Grossesse

Permet de suivre une grossesse avant même la naissance de l'enfant (consultations prénatales) : statut de la grossesse, date de terme initiale, gynécologue référent, contexte médical, notes libres, et **coordonnées du co-parent** (nom, prénom, téléphone, date de naissance). Le co-parent peut ainsi être enregistré comme contact à part entière sans avoir accès aux informations de la mère — ce qui répond au besoin de gestion au cas par cas de la coparentalité (voir §2.2).

---

## 2.2 Historique maternel et fratries — visibilité au cas par cas

Il n'y a **pas de règle unique automatique**. La visibilité de l'historique maternel (allaitements précédents, antécédents chirurgicaux/endocriniens) depuis le dossier d'un nouvel enfant se paramètre au cas par cas.

**Fonctionnement retenu :**

- Comportement par défaut : l'historique maternel est visible et pré-rempli dans la fiche Anamnèse d'un nouvel enfant du même foyer (mention "information reprise du dossier mère — modifiable").
- **Bascule explicite** au niveau du dossier famille ou du dossier enfant : "masquer l'historique maternel pour ce dossier" — à activer par la praticienne dans les cas où le partage automatique ne convient pas (coparentalité, séparation, changement de praticien(ne) référent(e), nouveau conjoint, etc.).
- Quand la bascule est activée, la section "Antécédents maternels" repart vierge pour ce dossier, sans effacer les données sources côté Parent.
- Ces informations restent saisies une seule fois au niveau de l'entité Parent (pas de ressaisie), la bascule ne fait que contrôler leur **affichage**, pas leur existence en base.

**Cas des naissances multiples (jumeaux/triplés) :** une fiche de consultation distincte par enfant, mais les champs communs à la grossesse et à l'accouchement sont mutualisés au niveau de la mère pour éviter la ressaisie (soumis à la même bascule de visibilité si besoin).

---

## 2.3 Écrans nécessaires

- **Vue "Famille"** : liste des enfants rattachés, timeline unifiée (RDV, consultations, factures, courbes tous enfants confondus).
- **Vue "Enfant"** : dossier dédié avec historique propre (fiches de consultation, courbe de poids, factures liées).
- **Création de dossier famille** : automatique depuis une réservation existante, ou création manuelle par la praticienne.
- **Fusion de doublons** : en cas de création involontaire de deux dossiers pour la même famille.
- **Gestion de la bascule de visibilité** (§2.2) : accessible depuis la vue Famille et depuis chaque fiche Anamnèse concernée.
- **Actions rapides sur la fiche patiente** : "Partager cette fiche" (lien à envoyer), "Autoriser l'espace patient" (active l'accès portail), "Prendre un RDV" (raccourci vers la réservation).
- **Paramètres d'automatisation** (au niveau du compte praticien, dans Paramètres > Patients) : invitation automatique à l'espace patient dès qu'un email est renseigné à la création du dossier ; autorisation automatique ou non pour que la patiente saisisse elle-même des mesures de poids depuis son espace (par défaut désactivée, activable globalement).

---

## Points ouverts

- Interface exacte de la bascule "masquer l'historique maternel" (au niveau famille entière ou enfant par enfant) — à valider dans les maquettes
- Règles de fusion de doublons (automatique avec confirmation, ou manuelle uniquement)

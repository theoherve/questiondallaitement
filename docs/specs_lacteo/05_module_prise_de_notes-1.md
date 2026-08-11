# Module 5 — Prise de notes

> Voir `00_cadrage_global.md` pour le contexte et les décisions transverses.

Ce module complète les fiches structurées (`01_module_anamnese_fiches_consultation.md`) avec des notes libres, prises pendant ou après la consultation, consultables dans l'historique du dossier enfant.

---

## 5.1 Types de notes

| Type | Moment | Usage |
|---|---|---|
| Note "pendant consultation" | En direct | Capture rapide, brouillon, observations au fil de l'eau |
| Note "après consultation" | À froid | Synthèse rédigée une fois le RDV terminé |
| Note libre "dossier" | Hors consultation | Appel téléphonique, échange email résumé, suivi entre deux RDV |

## 5.2 Champs

| Champ | Type | Détail / logique |
|---|---|---|
| Contenu | Texte riche | Formatage simple (gras, listes) ; pas de champs structurés — complémentaire aux fiches Anamnèse/Suivi |
| Horodatage | Auto, non modifiable | Date et heure de création |
| Dossier concerné | Sélection | Famille et/ou enfant spécifique |
| Rattachement | Optionnel | À une fiche de consultation existante, ou note indépendante (ex. suivi téléphonique) |
| Tags | Choix multiple | Ex. douleur, frein de langue, mastite, à surveiller, administratif — réutilisables pour la recherche |
| Visibilité | Choix unique, **obligatoire** | Interne uniquement (jamais visible patiente) / Visible portail patient (résumé partagé). Défaut : interne — cohérent avec le portail patient complet retenu dans le cadrage, où chaque note doit avoir une visibilité explicite |
| Rappel associé | Optionnel : date + texte | Génère une tâche/notification (ex. "relancer la mère dans 3 jours") — lien possible avec le module Agenda |

## 5.3 Historique et recherche

- Vue chronologique par enfant, regroupant **fiches de consultation et notes libres dans une même timeline**.
- Filtres : par praticien(ne), par tag, par période, par visibilité.
- Recherche full-text sur le contenu des notes.

## 5.4 Édition et traçabilité

Point sensible pour un dossier à valeur médicale : une note ne doit pas pouvoir disparaître ou être réécrite silencieusement.

- Une note enregistrée n'est **jamais supprimable**, seulement modifiable, avec **historique des versions** (qui, quand, quoi a changé) conservé et consultable.
- Pas de verrouillage temporisé ni de mécanisme d'addendum séparé : la note reste éditable directement à tout moment, la traçabilité est assurée uniquement par l'historique des versions.

## 5.5 Multi-praticien

- Par défaut, toutes les notes d'un dossier sont visibles par tous les praticien(ne)s ayant accès à ce dossier famille (cohérent avec le mode cabinet multi-praticien retenu dans le cadrage).
- **Note strictement privée, confirmée** : chaque praticien(ne) peut créer une note visible uniquement par lui/elle (ex. réflexion personnelle non partagée avec les collègues), en plus des notes partagées au niveau du dossier.

---

## Hors périmètre (pour l'instant)

- Notes vocales avec transcription automatique — non retenu à ce stade.

## Points ouverts

- Granularité exacte de l'historique des versions à afficher (diff complet vs simple horodatage des modifications)

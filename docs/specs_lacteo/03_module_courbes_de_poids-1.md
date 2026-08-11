# Module 3 — Courbes de poids OMS

> Voir `00_cadrage_global.md` pour le contexte et les décisions transverses.

Courbes poids-pour-âge, standards OMS (Organisation mondiale de la Santé), **0-24 mois uniquement**, garçon et fille distincts. Génération **automatique dès qu'une donnée de poids existe** pour l'enfant — pas d'action manuelle requise pour faire apparaître la courbe.

---

## 3.1 Source de données et calcul

- Données de référence : tables **LMS** (L, M, S) officielles de l'OMS "Child Growth Standards" — poids-pour-âge, résolution journalière de 0 à 13 semaines puis mensuelle jusqu'à 24 mois, par sexe.
- Import unique des tables OMS (fichiers CSV publics who.int) en base de référence, non modifiable par les utilisateurs.
- Calcul du percentile / z-score exact pour chaque mesure :
  `Z = ((poids / M(âge))^L(âge) − 1) / (L(âge) × S(âge))` — formule standard LMS.
- Bandes de percentiles affichées : 3e, 15e, 50e, 85e, 97e (couloirs visuels), avec option d'affichage en z-scores (−3 à +3) pour un usage plus clinique.
- **Âge corrigé pour les prématurés** : si l'enfant est marqué "prématuré" (champ non modifiable après création, voir module Dossier famille), la courbe doit proposer un affichage en âge corrigé (âge réel − nombre de semaines de prématurité) en plus de l'âge réel, car les repères OMS standards ne sont pertinents qu'en âge corrigé pour cette population jusqu'à 24 mois environ.

## 3.2 Affichage et interactions

- Graphique interactif : axe X = âge (jours / semaines / mois au choix), axe Y = poids (g ou kg).
- Bandes de percentiles en fond, courbe du patient tracée par-dessus, points cliquables avec infobulle (date, poids, percentile/z-score calculé, delta depuis la mesure précédente, poids/jour depuis la naissance).
- **Génération automatique** : dès la première mesure de poids saisie (fiche Anamnèse initiale ou suivi), la courbe apparaît dans le dossier enfant, mise à jour à chaque nouvelle mesure — sans ressaisie.
- Saisie manuelle possible hors consultation (ex. pesée à domicile transmise par la mère via le portail patient), avec champ "contexte de la pesée" (habillé/déshabillé, avant/après tétée).

## 3.3 Aide à la décision — alertes automatiques

Les règles ci-dessous s'appuient sur des repères cliniques usuels en allaitement (proches du protocole ABM #3 et des repères OMS). Elles constituent un point de départ, **configurable dans un écran de paramétrage** plutôt que codé en dur, à valider et ajuster avant mise en production.

| Alerte | Règle de déclenchement | Niveau | Message affiché |
|---|---|---|---|
| Perte de poids — vigilance | Perte ≥ 7 % du poids de naissance, avant J14 | Vigilance | "Perte de poids à surveiller de près (≥7 % du poids de naissance) — renforcer l'observation des tétées." |
| Perte de poids — alerte | Perte ≥ 10 % du poids de naissance | Alerte | "Perte de poids importante (≥10 %) — orientation médicale recommandée sans délai." |
| Non-reprise du poids de naissance | Poids de naissance non retrouvé à J14 | Vigilance | "Le poids de naissance n'est pas encore retrouvé à J14 — à investiguer." |
| Cassure de courbe | Chute ≥ 2 couloirs de percentile entre deux mesures | Alerte | "Cassure de courbe détectée — changement de couloir de croissance à investiguer." |
| Stagnation pondérale | Prise de poids moyenne < 15-20 g/jour sur 3 mesures consécutives après J14 (seuil à affiner selon l'âge) | Vigilance | "Prise de poids ralentie sur les dernières mesures — à surveiller." |

⚠️ **Ces alertes sont un outil d'aide à la décision, pas un diagnostic.** Chaque alerte affichée doit rappeler qu'elle reste soumise à l'appréciation clinique de la praticienne IBCLC.

---

## Points ouverts

- Validation clinique finale des seuils d'alerte (perte de poids, cassure de courbe, stagnation)
- Affinage des seuils de stagnation par tranche d'âge : les premières semaines ne s'analysent pas comme le 6e mois, un seuil unique risque d'être trop rigide
- Formulation exacte des messages d'alerte (à valider pour la responsabilité médico-légale)

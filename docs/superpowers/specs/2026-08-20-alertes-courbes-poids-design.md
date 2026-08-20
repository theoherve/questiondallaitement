# Alertes automatiques sur les courbes de poids — Design

Date : 2026-08-20
Statut : approuvé (brainstorming)

## Contexte

Spec source : `docs/specs_lacteo/03_module_courbes_de_poids-1.md` §3.3. Le module
courbes de poids OMS est en prod (calcul LMS, saisie domicile/consultation, graphique) ;
voir aussi `2026-08-12-finition-module-poids-design.md` pour les évolutions visuelles
récentes du graphique, sans lien avec ce chantier.

Trois points ouverts dans la spec, tranchés en brainstorming avec Carole le 2026-08-20 :

1. **Seuils cliniques** : validés tels quels (perte ≥7 %/≥10 %, non-reprise J14,
   cassure ≥2 couloirs).
2. **Affinage stagnation par âge** : reporté — seuil unique 15 g/j après J14 sur 3
   mesures consécutives pour la v1.
3. **Formulation des messages** : validée telle quelle (tableau §3.3), avec une mention
   fixe "aide à la décision, pas un diagnostic" affichée sur chaque alerte.

Décisions de cadrage complémentaires (poids de naissance absent du schéma, âge corrigé,
déclenchement, visibilité) : voir sections ci-dessous.

## 1. Modèle de données

`children` n'a pas de colonne pour le poids de naissance — nécessaire pour les règles
"perte %" et "non-reprise J14". Nouvelle migration :

```sql
ALTER TABLE children
  ADD COLUMN birth_weight_grams INT
    CHECK (birth_weight_grams IS NULL OR (birth_weight_grams > 0 AND birth_weight_grams < 10000));
```

- **Nullable**, pas de rattrapage sur les fiches existantes.
- Champ ajouté au formulaire enfant (`_components/child-form.tsx`, côté client et
  équivalent consultante si un formulaire de création existe côté back-office) —
  optionnel à la saisie.
- Si `birth_weight_grams IS NULL` pour un enfant : les règles "perte %" et
  "non-reprise J14" ne se déclenchent jamais pour lui (pas d'erreur, silencieux). Les
  règles "cassure" et "stagnation" restent actives, elles n'en dépendent pas.

Pas de nouvelle table "alertes" : les alertes sont recalculées à la demande depuis
`weight_measurements` + `children`, jamais persistées comme état. La seule trace
persistée est la ligne `notifications` déjà envoyée (déduplication via `dedupe_key`),
réutilisant le socle existant.

## 2. Calculs (`src/lib/growth-charts/`)

### 2.1 Fonction inverse poids → percentile

`who-weight-for-age.ts` sait aujourd'hui aller de percentile vers poids
(`getPercentileWeightGrams`), pas l'inverse. Ajout de :

```ts
function getZScoreForWeight(ageInDays: number, sex: Sex, weightGrams: number): number
function getPercentileBandForWeight(ageInDays: number, sex: Sex, weightGrams: number): number
```

- `getZScoreForWeight` : interpole L/M/S pour `ageInDays`, applique la formule LMS
  inverse `Z = ((poids/M)^L - 1) / (L×S)`.
- `getPercentileBandForWeight` : convertit le z-score en le couloir de percentile le
  plus proche parmi `[3, 15, 50, 85, 97]` (utilisé pour détecter un changement de
  couloir, pas pour afficher un percentile exact au patient).

### 2.2 Âge corrigé pour prématurés

Nouvelle fonction :

```ts
function getCorrectedAgeInDays(child: { is_premature: boolean; gestational_age_weeks: number | null }, ageInDaysReal: number): number
```

- Si `is_premature` et `gestational_age_weeks` renseigné :
  `correction = max(0, (40 - gestational_age_weeks) * 7)`, retourne
  `max(0, ageInDaysReal - correction)`.
- Sinon : retourne `ageInDaysReal` inchangé.
- Utilisée uniquement pour les règles **cassure de courbe** et **stagnation**
  (dépendent du couloir OMS, non pertinent en âge réel pour un prématuré). Les règles
  **perte %** et **non-reprise J14** restent en âge réel — elles suivent le calendrier
  post-natal, pas la maturation.

## 3. Moteur de règles (`src/lib/growth-charts/weight-alerts.ts`, nouveau fichier)

```ts
type WeightAlertLevel = "vigilance" | "alerte";

interface WeightAlert {
  rule: "loss_vigilance" | "loss_alert" | "no_regain_j14" | "curve_break" | "stagnation";
  level: WeightAlertLevel;
  message: string; // formulation figée de la spec §3.3
  measurementId: string; // mesure qui déclenche l'alerte, sert de base au dedupeKey
}

function computeWeightAlerts(
  child: ChildForAlerts,
  measurements: WeightMeasurement[], // triées par measured_at croissant
): WeightAlert[]
```

Fonction pure, aucun accès réseau. Les 5 règles, dans l'ordre du tableau spec §3.3 :

| Règle | Condition | Niveau |
|---|---|---|
| `loss_vigilance` | `birth_weight_grams` non NULL, mesure à J≤13, `(birth_weight_grams - weight_grams) / birth_weight_grams >= 0.07` | vigilance |
| `loss_alert` | `birth_weight_grams` non NULL, `(birth_weight_grams - weight_grams) / birth_weight_grams >= 0.10` (tout âge) | alerte |
| `no_regain_j14` | `birth_weight_grams` non NULL, aucune mesure à J≥14 avec `weight_grams >= birth_weight_grams` alors qu'une mesure existe à J≥14 | vigilance |
| `curve_break` | écart de couloir de percentile (via `getPercentileBandForWeight` en âge corrigé) ≥2 rangs entre deux mesures consécutives | alerte |
| `stagnation` | 3 mesures consécutives après J14 (âge corrigé), prise de poids moyenne < 15 g/jour sur l'intervalle couvert | vigilance |

Chaque `message` est le texte exact de la spec §3.3, suivi systématiquement (au niveau
de l'UI, pas dans la donnée) de la mention fixe : *"Aide à la décision — reste soumise à
l'appréciation clinique de la praticienne IBCLC."*

Chaque règle peut se déclencher indépendamment et plusieurs fois dans l'historique — la
fonction retourne toutes les alertes actives à l'instant du calcul, pas seulement la
dernière mesure (pour l'affichage back-office, qui doit refléter l'état courant complet).

## 4. Déclenchement et notification

- Calcul déclenché en synchrone à la fin de `addWeightMeasurement` (espace client) et
  `addWeightMeasurementAsConsultant` (back-office), sur l'ensemble des mesures de
  l'enfant (pas seulement la nouvelle) — une nouvelle mesure peut faire apparaître une
  alerte "cassure" qui dépend de la mesure précédente aussi.
- Pas de job cron : contrairement au pattern `jobs/module-reminder.ts`, il n'y a pas de
  fenêtre temporelle à surveiller, l'événement déclencheur est la saisie elle-même.
- Nouvelles entrées catalogue `src/lib/notifications/catalog.ts` : un type
  `weight_alert_vigilance` et un type `weight_alert_alert` (canaux `in_app` uniquement,
  pas d'email/push — cohérent avec la visibilité back-office only, section 5).
- Appel `notify("weight_alert_vigilance" | "weight_alert_alert", getRoleRecipients("consultant"), { childId, childName, rule, message }, { dedupeKey: \`${childId}:${rule}:${measurementId}\` })`.
- Le `dedupeKey` inclut l'id de la mesure qui déclenche la règle : une re-saisie ou un
  recalcul sur les mêmes données ne renotifie pas ; une nouvelle mesure qui fait
  persister la même règle (ex. stagnation sur 3 mesures glissantes différentes)
  déclenche une notification distincte, jugée pertinente (nouvelle donnée clinique).

## 5. Affichage

- Back-office uniquement, aucun changement espace client.
- Bloc alertes dans `ChildrenPanel` (`espace-consultante/crm/_components/children-panel.tsx`),
  au-dessus du `WeightChart` existant : liste des `WeightAlert` actives, recalculées à
  l'affichage de la page (pas seulement au moment de la notification) pour rester
  à jour même après un déplacement dans l'app ou une consultation ultérieure.
- Distinction visuelle vigilance/alerte (couleur/icône), mention fixe "aide à la
  décision" affichée une fois pour le bloc entier (pas répétée par alerte).
- Rien de configurable en v1 : seuils en constantes nommées dans `weight-alerts.ts`
  (modifiables par un dev si besoin, pas d'écran de paramétrage).

## Tests

- `who-weight-for-age.spec.ts` : cas pour `getZScoreForWeight` / `getPercentileBandForWeight`
  (valeurs de référence connues, cohérence avec `getPercentileWeightGrams` en aller-retour).
- Nouveau `weight-alerts.spec.ts` : une section par règle (déclenché / non déclenché aux
  bornes), + cas `birth_weight_grams` NULL (perte/J14 silencieuses), + cas prématuré
  (cassure/stagnation en âge corrigé vs réel).
- `children-panel.spec.tsx` (ou équivalent) : le bloc alertes s'affiche avec les bonnes
  entrées pour un enfant donné.
- Intégration légère sur `addWeightMeasurement`/`addWeightMeasurementAsConsultant` :
  `notify` appelé avec le bon `dedupeKey`, pas de doublon sur re-saisie identique.

## Hors périmètre

- Écran de paramétrage des seuils (spec le suggère, explicitement reporté).
- Affinage du seuil de stagnation par tranche d'âge (explicitement reporté).
- Affichage des alertes côté espace client.
- Rattrapage de `birth_weight_grams` sur les fiches existantes.
- Refonte visuelle du graphique (déjà traitée dans
  `2026-08-12-finition-module-poids-design.md`).

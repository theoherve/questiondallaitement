# Finition module poids (redesign graphique + quick-fixes) — Design

Date : 2026-08-12
Statut : approuvé (brainstorming)

## Contexte

Le module "dossier famille" + "courbes de poids OMS" a été livré et mergé sur `main` le
2026-08-12 (commits `62beffb..70c33af`). Cinq points mineurs avaient été explicitement
déférés à l'époque (voir mémoire `dossier-famille-courbes-poids-shipped`). Cette session
referme le module avant d'ouvrir le chantier suivant (fiche de consultation structurée).

Les 5 points sont tous dans le périmètre :

1. Redesign visuel du graphique de poids.
2. Tolérance de date dans `isNotInFuture`.
3. Message d'erreur trompeur à la suppression d'une pesée côté client.
4. Deux tests faibles dans `crm/actions.spec.ts`.
5. `hasClientRelationship` interrogée deux fois au chargement de la fiche CRM.

## 1. Redesign du graphique (`src/components/growth-charts/weight-chart.tsx`)

### Constat actuel

- `buildChartData` porte, pour chaque point, la valeur *absolue* de chaque percentile
  (`p3`, `p15`, `p50`, `p85`, `p97`), pas une largeur de bande.
- Chaque percentile est rendu par une `Area` sans `stackId` → chaque bande est remplie
  depuis zéro jusqu'à sa valeur, pas entre percentiles adjacents.
- La `Area` P50 a `fillOpacity: 0` et aucune `Line` dédiée → la médiane n'est jamais
  visible.
- Le champ `source` (`"home" | "consultation"`) est bien propagé jusqu'aux données du
  graphique (`ChartPoint.source`) mais n'a aucun effet de rendu sur la `Line` "measured".

### Changements

- **Bandes empilées** : calculer des deltas par point — `p3`, `d15 = p15 - p3`,
  `d50 = p50 - p15`, `d85 = p85 - p50`, `d97 = p97 - p85` — et empiler 4 `Area` avec
  `stackId="who"` dans l'ordre P3→P15→P50→P85→P97. Chaque `Area` garde sa propre teinte,
  dégradée du foncé (centre, zone normale P15-P85) vers plus clair aux extrêmes (P3-P15,
  P85-P97).
- **Médiane visible** : `Line` séparée pour `p50`, trait fin pointillé gris, posée
  par-dessus les bandes empilées. Distincte du trait "measured" (couleur pleine).
- **Distinction domicile/consultation** : sur la `Line` "measured", `dot`/`activeDot`
  personnalisé — cercle plein si `source === "home"`, losange si
  `source === "consultation"`, chacun avec sa propre teinte (même famille chromatique que
  la charte, pas de couleur ajoutée hors palette).
- **Légende** : sous le graphique, deux entrées uniquement pour la source ("● Pesée à
  domicile" / "◆ Pesée en consultation"). Pas de légende pour les bandes de percentile
  (déjà lisibles via les axes/tooltip).
- **Tooltip** : ajoute une ligne "Domicile" ou "Consultation" sous poids et âge.

### Hors périmètre de ce point

- Pas de refonte de la formule LMS OMS (`who-weight-for-age.ts`), qui reste inchangée.
- Pas d'âge corrigé pour prématurés (déjà exclu du design d'origine).

## 2. `isNotInFuture` — tolérance de date (`src/validations/children.ts`)

Comparaison actuelle : `parsed.getTime() <= Date.now()`, sans marge. Change en
`parsed.getTime() <= Date.now() + ONE_DAY_MS` (24h en ms, constante nommée et
commentée). Pas de vrai calcul de fuseau horaire — la marge d'un jour absorbe le
décalage UTC/heure française sans complexifier la logique. S'applique aux deux usages
existants (`childSchema.birth_date`, `weightMeasurementSchema.measured_at`).

## 3. Message d'erreur suppression pesée (`src/app/(public)/espace-client/enfants/actions.ts`)

La condition actuelle (ligne ~173) fusionne "pesée introuvable" et "pesée existante mais
saisie par la consultante" sous un seul message trompeur. Sépare en deux branches :

- `!measurement` → "Pesée introuvable" (inchangé, cas honnête).
- `measurement && measurement.recorded_by !== user.id` → nouveau message explicite :
  "Cette pesée a été saisie par votre consultante, vous ne pouvez pas la supprimer."

Le test associé (`actions.spec.ts` ligne ~352) est scindé en deux cas pour couvrir
chaque branche.

## 4. Tests faibles CRM (`src/app/(dashboard)/espace-consultante/crm/actions.spec.ts`)

- **"refuse un rendez-vous annulé comme seule relation"** (lignes 333-348) : ne prouve
  rien de plus que le test "refuse si aucune relation n'existe" juste au-dessus, car le
  mock ne simule pas réellement le filtre `.not("status", "eq", "cancelled")`. Remplacé
  par un test qui pose `mockBookingsData.data = [{ status: "cancelled" }]` avec un mock
  qui applique effectivement le filtre avant de renvoyer les données — pas de correction
  du mock générique partagé (risque de casser d'autres tests qui en dépendent
  implicitement).
- **"supprime la pesée quand la relation existe, sans fenêtre de 24h"** (lignes 460-469) :
  `mockMeasurementSingleData.data` n'a pas de `created_at`, donc le test ne peut pas
  distinguer "pas de fenêtre 24h pour la consultante" de "fenêtre jamais déclenchée".
  Ajoute un `created_at` vieux de plusieurs jours dans les données du mock, pour prouver
  que la suppression réussit malgré l'ancienneté.

## 5. `hasClientRelationship` x2 (`src/app/(dashboard)/espace-consultante/crm/actions.ts`)

`getChildrenForContact` et `getWeightMeasurementsForContact` sont appelées en
`Promise.all` dans `crm/[clientId]/page.tsx` et revérifient chacune l'autorisation en
profondeur, doublant jusqu'à 3 requêtes Supabase chacune.

Changement : un seul appel à `hasClientRelationship` dans `page.tsx`, dont le résultat
est passé en paramètre aux deux fonctions `get*`. La défense en profondeur est conservée
au niveau du call site de la page plutôt que dupliquée dans chaque fonction. Pas de
cache global ni de memoization — une seule consultante active, le seul objectif est
d'éviter la requête redondante sur ce chemin précis.

Les autres appels à `hasClientRelationship` (dans `deleteChildAsConsultant`,
`deleteWeightMeasurementAsConsultant`, `addWeightMeasurementAsConsultant`) sont des
actions de mutation déclenchées par l'utilisateur, pas concernées par ce doublon — elles
gardent leur propre vérification.

## Tests

- Point 1 (graphique) : test unitaire sur `buildChartData` pour vérifier le calcul des
  deltas empilés (`d15`, `d50`, `d85`, `d97` corrects par rapport aux percentiles bruts).
  Pas de test de rendu Recharts (rendu visuel, vérifié manuellement).
- Points 2, 3, 5 : tests unitaires ciblés sur la logique modifiée (tolérance de date,
  message d'erreur par branche, résultat identique de `getChildrenForContact`/
  `getWeightMeasurementsForContact` avec relation pré-calculée passée en paramètre).
- Point 4 : les tests eux-mêmes sont le livrable.

## Hors périmètre

- Aucune nouvelle donnée en base, aucune migration.
- Pas de refonte de la formule OMS ni de l'échelle d'âge du graphique.
- Fiche de consultation structurée, traçabilité des notes CRM, sync calendar, export
  comptable — prochains chantiers du top Lactéo, hors de ce design.

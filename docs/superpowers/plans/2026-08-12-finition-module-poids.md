# Finition module poids (redesign graphique + quick-fixes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Referme le module dossier famille/courbes de poids (livré le 2026-08-12) en corrigeant les 5 points déférés : bandes de percentile et médiane invisibles sur le graphique, distinction domicile/consultation absente, tolérance de date manquante, message d'erreur trompeur, deux tests faibles, et une requête redondante au chargement de la fiche CRM.

**Architecture:** Aucune nouvelle table ni migration. Modifications ciblées sur des fichiers existants : le composant `WeightChart` (calcul + rendu), une fonction de validation (`isNotInFuture`), une server action côté client (`deleteWeightMeasurement`), deux tests dans `crm/actions.spec.ts`, et la fonction `hasClientRelationship` + ses deux call sites dans `crm/actions.ts` / `page.tsx`.

**Tech Stack:** Next.js (App Router), React, Recharts, Zod, Supabase, Vitest, `@testing-library/react`.

## Global Constraints

- Aucune nouvelle donnée en base, aucune migration.
- Pas de refonte de la formule LMS OMS (`who-weight-for-age.ts`) ni de l'échelle d'âge du graphique.
- Couleurs du graphique : uniquement des teintes déjà présentes dans `src/app/globals.css` (`--color-primary-red: #a0283e`, `--color-accent-sage: #a8c4a0`, `--color-accent-honey: #e8c98a`) — pas de nouvelle palette custom.
- Suite de tests : `pnpm test` (= `vitest run`). Chaque tâche se termine verte.

---

### Task 1: Bandes de percentile empilées dans `buildChartData`

**Files:**
- Modify: `src/components/growth-charts/weight-chart.tsx:19-74`
- Test: `src/components/growth-charts/weight-chart.spec.tsx`

**Interfaces:**
- Consumes: `getPercentileWeightGrams(ageInDays, sex, percentile)` de `@/lib/growth-charts/who-weight-for-age` (inchangé), `WHO_PERCENTILES = [3, 15, 50, 85, 97]` (inchangé).
- Produces: `ChartPoint` gagne 4 champs `d15`, `d50`, `d85`, `d97` (deltas entre percentiles adjacents, pour l'empilement Recharts). `p3`, `p15`, `p50`, `p85`, `p97` restent présents (valeurs absolues, utiles pour le tooltip et le test). `buildChartData` reste exportée en interne au fichier (pas exportée du module) — le test passe donc par le rendu de `WeightChart`, pas par un appel direct à `buildChartData`.

Actuellement (lignes 19-74) `ChartPoint` ne porte que les valeurs absolues de percentile, et chaque `Area` de percentile (lignes 128-139) se remplit depuis zéro puisqu'aucun `stackId` n'est posé. On ajoute les deltas nécessaires à un empilement correct : `d15 = p15 - p3`, `d50 = p50 - p15`, `d85 = p85 - p50`, `d97 = p97 - p85`.

- [ ] **Step 1: Écrire le test qui vérifie les deltas via le rendu**

Le composant est `"use client"` et ne exporte pas `buildChartData` — le test vérifie donc le résultat via les points DOM générés par Recharts. Recharts ne rend pas de valeurs numériques exploitables facilement en test (SVG paths), donc on teste indirectly en exportant `buildChartData` pour le test uniquement. Ajoute l'export nommé dans le fichier composant (voisin de la fonction, sans changer son usage interne) :

```tsx
// dans weight-chart.tsx, juste après la déclaration de buildChartData (ligne 74)
export { buildChartData };
```

Puis dans `weight-chart.spec.tsx`, ajoute avant le `describe("WeightChart", ...)` existant :

```tsx
import { buildChartData } from "./weight-chart";

describe("buildChartData", () => {
  it("calcule des deltas empilables entre percentiles adjacents", () => {
    const [point] = buildChartData(
      [
        {
          id: "m1",
          child_id: "c1",
          weight_grams: 4200,
          measured_at: "2025-02-01",
          source: "home",
          recorded_by: "u1",
          consultant_id: null,
          created_at: "2025-02-01T00:00:00.000Z",
        },
      ],
      "2025-01-01",
      "female",
    );

    expect(point.d15).toBeCloseTo((point.p15 ?? 0) - (point.p3 ?? 0));
    expect(point.d50).toBeCloseTo((point.p50 ?? 0) - (point.p15 ?? 0));
    expect(point.d85).toBeCloseTo((point.p85 ?? 0) - (point.p50 ?? 0));
    expect(point.d97).toBeCloseTo((point.p97 ?? 0) - (point.p85 ?? 0));
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test weight-chart.spec.tsx`
Expected: FAIL — `point.d15` est `undefined`, `toBeCloseTo(undefined - number)` échoue (ou `buildChartData` n'est pas exporté : `SyntaxError`/`undefined is not a function`).

- [ ] **Step 3: Implémenter le calcul des deltas**

Remplace le type `ChartPoint` et les deux blocs qui construisent `measurementPoints`/`backgroundPoints` (lignes 19-69) :

```tsx
type ChartPoint = {
  ageDays: number;
  measured: number | null;
  source: "home" | "consultation" | null;
  p3: number | null;
  p15: number | null;
  p50: number | null;
  p85: number | null;
  p97: number | null;
  d15: number | null;
  d50: number | null;
  d85: number | null;
  d97: number | null;
};

const withDeltas = (
  p3: number | null,
  p15: number | null,
  p50: number | null,
  p85: number | null,
  p97: number | null,
) => ({
  p3,
  p15,
  p50,
  p85,
  p97,
  d15: p15 != null && p3 != null ? p15 - p3 : null,
  d50: p50 != null && p15 != null ? p50 - p15 : null,
  d85: p85 != null && p50 != null ? p85 - p50 : null,
  d97: p97 != null && p85 != null ? p97 - p85 : null,
});
```

Puis dans `buildChartData`, remplace les deux constructions de points pour utiliser `withDeltas` :

```tsx
const measurementPoints: ChartPoint[] = measurements.map((m) => {
  const ageDays = ageDaysBetween(birthDate, m.measured_at);
  return {
    ageDays,
    measured: m.weight_grams,
    source: m.source,
    ...withDeltas(
      getPercentileWeightGrams(ageDays, sex, 3),
      getPercentileWeightGrams(ageDays, sex, 15),
      getPercentileWeightGrams(ageDays, sex, 50),
      getPercentileWeightGrams(ageDays, sex, 85),
      getPercentileWeightGrams(ageDays, sex, 97),
    ),
  };
});

const maxAgeDays = Math.max(730, ...measurementPoints.map((p) => p.ageDays));
const backgroundPoints: ChartPoint[] = [];
for (let ageDays = 0; ageDays <= maxAgeDays; ageDays += 14) {
  if (measurementPoints.some((p) => p.ageDays === ageDays)) continue;
  backgroundPoints.push({
    ageDays,
    measured: null,
    source: null,
    ...withDeltas(
      getPercentileWeightGrams(ageDays, sex, 3),
      getPercentileWeightGrams(ageDays, sex, 15),
      getPercentileWeightGrams(ageDays, sex, 50),
      getPercentileWeightGrams(ageDays, sex, 85),
      getPercentileWeightGrams(ageDays, sex, 97),
    ),
  });
}
```

Et ajoute `export { buildChartData };` juste après la fonction (avant `export const WeightChart`).

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `pnpm test weight-chart.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/growth-charts/weight-chart.tsx src/components/growth-charts/weight-chart.spec.tsx
git commit -m "feat(courbe-poids): calcule les deltas de percentile pour un empilement correct"
```

---

### Task 2: Rendu empilé des bandes + médiane visible

**Files:**
- Modify: `src/components/growth-charts/weight-chart.tsx:128-148`
- Test: `src/components/growth-charts/weight-chart.spec.tsx`

**Interfaces:**
- Consumes: `ChartPoint.d15/d50/d85/d97` produits par Task 1.
- Produces: aucune nouvelle interface consommée par un fichier tiers — changement de rendu interne au composant.

Remplace les 5 `Area` sans `stackId` (P3 à P97, lignes 128-139) et retire l'`Area` P50 invisible. Structure cible : une `Area` invisible pour la base P3 (empile depuis 0 sans être coloriée), puis les 4 bandes de delta empilées par-dessus, puis une `Line` pointillée pour la médiane.

- [ ] **Step 1: Écrire le test qui vérifie la présence de la ligne médiane**

Ajoute dans `weight-chart.spec.tsx`, dans le `describe("WeightChart", ...)` existant :

```tsx
it("affiche une ligne dédiée à la médiane P50", () => {
  const { container } = render(
    <WeightChart
      measurements={[
        {
          id: "m1",
          child_id: "c1",
          weight_grams: 4200,
          measured_at: "2025-02-01",
          source: "home",
          recorded_by: "u1",
          consultant_id: null,
          created_at: "2025-02-01T00:00:00.000Z",
        },
      ]}
      birthDate="2025-01-01"
      sex="female"
    />,
  );
  expect(
    container.querySelector(".who-median-line"),
  ).toBeTruthy();
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test weight-chart.spec.tsx`
Expected: FAIL — `.who-median-line` n'existe pas encore.

- [ ] **Step 3: Implémenter l'empilement et la ligne médiane**

Remplace le bloc lignes 128-148 (la boucle `WHO_PERCENTILES.map` + la `Line dataKey="measured"`) par :

```tsx
<Area
  dataKey="p3"
  stackId="who"
  stroke="none"
  fill="transparent"
  connectNulls
  name="P3"
  isAnimationActive={false}
  legendType="none"
/>
<Area
  dataKey="d15"
  stackId="who"
  stroke="none"
  fill="#e8c98a"
  fillOpacity={0.18}
  connectNulls
  name="P3–P15"
  isAnimationActive={false}
  legendType="none"
/>
<Area
  dataKey="d50"
  stackId="who"
  stroke="none"
  fill="#a8c4a0"
  fillOpacity={0.3}
  connectNulls
  name="P15–P50"
  isAnimationActive={false}
  legendType="none"
/>
<Area
  dataKey="d85"
  stackId="who"
  stroke="none"
  fill="#a8c4a0"
  fillOpacity={0.3}
  connectNulls
  name="P50–P85"
  isAnimationActive={false}
  legendType="none"
/>
<Area
  dataKey="d97"
  stackId="who"
  stroke="none"
  fill="#e8c98a"
  fillOpacity={0.18}
  connectNulls
  name="P85–P97"
  isAnimationActive={false}
  legendType="none"
/>
<Line
  dataKey="p50"
  className="who-median-line"
  stroke="#6b7280"
  strokeWidth={1.5}
  strokeDasharray="4 4"
  dot={false}
  connectNulls
  name="Médiane (P50)"
  isAnimationActive={false}
/>
<Line
  dataKey="measured"
  stroke="#a0283e"
  strokeWidth={2}
  dot={{ r: 4 }}
  connectNulls
  name="Poids de l'enfant"
  isAnimationActive={false}
/>
```

`legendType="none"` sur les `Area` évite qu'elles polluent une légende future (Task 3 ajoute une légende dédiée à la source, pas aux bandes). La bande normale P15-P85 utilise la même couleur (`#a8c4a0`, sage) pour `d50` et `d85` afin de lire une seule zone continue ; les bandes extrêmes P3-P15 et P85-P97 utilisent `#e8c98a` (honey) plus clair.

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `pnpm test weight-chart.spec.tsx`
Expected: PASS (les 4 tests du fichier passent)

- [ ] **Step 5: Commit**

```bash
git add src/components/growth-charts/weight-chart.tsx src/components/growth-charts/weight-chart.spec.tsx
git commit -m "feat(courbe-poids): empile les bandes de percentile et rend la médiane visible"
```

---

### Task 3: Distinction visuelle domicile/consultation + légende + tooltip

**Files:**
- Modify: `src/components/growth-charts/weight-chart.tsx`
- Test: `src/components/growth-charts/weight-chart.spec.tsx`

**Interfaces:**
- Consumes: `ChartPoint.source` (déjà présent, `"home" | "consultation" | null`).
- Produces: aucune nouvelle interface consommée ailleurs.

Le champ `source` arrive déjà dans les données du graphique mais n'a aucun effet de rendu sur la `Line dataKey="measured"`. On ajoute un `dot` personnalisé (forme + couleur selon la source) et une légende sous le graphique, plus une ligne "Domicile"/"Consultation" dans le tooltip.

- [ ] **Step 1: Écrire le test de la légende**

Ajoute dans `weight-chart.spec.tsx` :

```tsx
it("affiche une légende distinguant domicile et consultation", () => {
  render(
    <WeightChart
      measurements={[
        {
          id: "m1",
          child_id: "c1",
          weight_grams: 4200,
          measured_at: "2025-02-01",
          source: "home",
          recorded_by: "u1",
          consultant_id: null,
          created_at: "2025-02-01T00:00:00.000Z",
        },
      ]}
      birthDate="2025-01-01"
      sex="female"
    />,
  );
  expect(screen.getByText("Pesée à domicile")).toBeInTheDocument();
  expect(screen.getByText("Pesée en consultation")).toBeInTheDocument();
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test weight-chart.spec.tsx`
Expected: FAIL — les deux libellés n'existent pas.

- [ ] **Step 3: Implémenter le dot personnalisé, la légende et le tooltip**

Ajoute au-dessus de `buildChartData` (après les imports) une fonction de dot personnalisée et un tooltip personnalisé :

```tsx
const SOURCE_LABEL: Record<"home" | "consultation", string> = {
  home: "Domicile",
  consultation: "Consultation",
};

const MeasuredDot = (props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.source) return null;
  if (payload.source === "consultation") {
    const size = 5;
    return (
      <rect
        x={cx - size}
        y={cy - size}
        width={size * 2}
        height={size * 2}
        transform={`rotate(45 ${cx} ${cy})`}
        fill="#a0283e"
      />
    );
  }
  return <circle cx={cx} cy={cy} r={4} fill="#a8c4a0" stroke="#a0283e" strokeWidth={1} />;
};

const WeightTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (point.measured == null) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
      <p>{Math.round(point.ageDays / 30)} mois</p>
      <p>{(point.measured / 1000).toFixed(2)} kg</p>
      {point.source && <p className="text-muted-foreground">{SOURCE_LABEL[point.source]}</p>}
    </div>
  );
};
```

Remplace le `<Tooltip ... />` existant (lignes 113-127) par :

```tsx
<Tooltip content={<WeightTooltip />} />
```

Remplace `dot={{ r: 4 }}` de la `Line dataKey="measured"` (ajoutée à Task 2) par `dot={<MeasuredDot />}` :

```tsx
<Line
  dataKey="measured"
  stroke="#a0283e"
  strokeWidth={2}
  dot={<MeasuredDot />}
  connectNulls
  name="Poids de l'enfant"
  isAnimationActive={false}
/>
```

Ajoute la légende sous le graphique, juste avant le `<p>` de mention non-diagnostic (fin du composant, avant la fermeture de `<div className="space-y-2">`) :

```tsx
<div className="flex justify-center gap-4 text-xs text-muted-foreground">
  <span className="flex items-center gap-1.5">
    <svg width="10" height="10" aria-hidden="true">
      <circle cx="5" cy="5" r="4" fill="#a8c4a0" stroke="#a0283e" strokeWidth="1" />
    </svg>
    Pesée à domicile
  </span>
  <span className="flex items-center gap-1.5">
    <svg width="10" height="10" aria-hidden="true">
      <rect x="1" y="1" width="8" height="8" transform="rotate(45 5 5)" fill="#a0283e" />
    </svg>
    Pesée en consultation
  </span>
</div>
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `pnpm test weight-chart.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/growth-charts/weight-chart.tsx src/components/growth-charts/weight-chart.spec.tsx
git commit -m "feat(courbe-poids): distingue visuellement les pesées domicile/consultation"
```

---

### Task 4: Tolérance de date dans `isNotInFuture`

**Files:**
- Modify: `src/validations/children.ts:15-19`
- Test: `src/validations/children.spec.ts`

**Interfaces:**
- Consumes: aucune.
- Produces: `isNotInFuture(value: string): boolean` — signature inchangée, comportement élargi d'un jour.

- [ ] **Step 1: Écrire le test qui échoue**

Ajoute dans `children.spec.ts`, à la fin (après le dernier `describe`) :

```ts
import { isNotInFuture } from "./children";

describe("isNotInFuture", () => {
  it("accepte une date jusqu'à 24h dans le futur (marge fuseau horaire)", () => {
    const in20Hours = new Date(Date.now() + 20 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(isNotInFuture(in20Hours)).toBe(true);
  });

  it("rejette toujours une date à plus de 24h dans le futur", () => {
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(isNotInFuture(inTwoDays)).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm test children.spec.ts`
Expected: le premier test (`accepte une date jusqu'à 24h`) FAIL selon l'heure locale d'exécution — `parsed.getTime()` (minuit UTC du jour dans 20h) peut dépasser `Date.now()`.

- [ ] **Step 3: Implémenter la tolérance**

Remplace lignes 15-19 :

```ts
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Une date de naissance ou de pesée ne peut pas être postérieure à aujourd'hui.
 * Tolérance d'un jour pour absorber le décalage entre minuit UTC (interprétation
 * de la date saisie) et l'heure locale française. */
export const isNotInFuture = (value: string): boolean => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() <= Date.now() + ONE_DAY_MS;
};
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm test children.spec.ts`
Expected: PASS — y compris les tests existants "rejette une date de naissance dans le futur" et "rejette une pesée datée dans le futur" (qui utilisent +2 jours, toujours rejetés avec la marge de 24h).

- [ ] **Step 5: Commit**

```bash
git add src/validations/children.ts src/validations/children.spec.ts
git commit -m "fix(validations): tolère 24h sur isNotInFuture pour absorber le décalage UTC"
```

---

### Task 5: Message d'erreur honnête à la suppression d'une pesée

**Files:**
- Modify: `src/app/(public)/espace-client/enfants/actions.ts:161-180` (fonction `deleteWeightMeasurement`)
- Test: `src/app/(public)/espace-client/enfants/actions.spec.ts:304-380`

**Interfaces:**
- Consumes: aucune nouvelle.
- Produces: `deleteWeightMeasurement(measurementId: string): Promise<ActionResult>` — signature inchangée, deux messages d'erreur désormais distincts.

- [ ] **Step 1: Modifier le test "rejette si la pesée n'a pas été enregistrée par l'appelant"**

Dans `actions.spec.ts`, remplace le test lignes 334-354 :

```ts
it("rejette si la pesée a été enregistrée par la consultante", async () => {
  mockGetSupabaseAndUser.mockResolvedValue({
    user: { id: "client-1" },
    supabase: {},
  });
  responses.weightMeasurementSingle = {
    data: {
      id: "m1",
      child_id: "child-1",
      recorded_by: "other-user",
      created_at: new Date().toISOString(),
    },
    error: null,
  };

  const result = await deleteWeightMeasurement("m1");

  expect(result.success).toBe(false);
  expect(result.error).toBe(
    "Cette pesée a été saisie par votre consultante, vous ne pouvez pas la supprimer.",
  );
  expect(deleteCalls).toHaveLength(0);
});

it("rejette une pesée réellement introuvable", async () => {
  mockGetSupabaseAndUser.mockResolvedValue({
    user: { id: "client-1" },
    supabase: {},
  });
  responses.weightMeasurementSingle = { data: null, error: null };

  const result = await deleteWeightMeasurement("m1");

  expect(result.success).toBe(false);
  expect(result.error).toBe("Pesée introuvable");
  expect(deleteCalls).toHaveLength(0);
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test "espace-client/enfants/actions.spec.ts"`
Expected: FAIL sur le premier des deux nouveaux tests — le code renvoie encore "Pesée introuvable" au lieu du nouveau message.

- [ ] **Step 3: Implémenter la séparation des deux cas**

Dans `actions.ts`, remplace :

```ts
  if (!measurement || measurement.recorded_by !== user.id) {
    return { success: false, error: "Pesée introuvable" };
  }
```

par :

```ts
  if (!measurement) {
    return { success: false, error: "Pesée introuvable" };
  }
  if (measurement.recorded_by !== user.id) {
    return {
      success: false,
      error:
        "Cette pesée a été saisie par votre consultante, vous ne pouvez pas la supprimer.",
    };
  }
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm test "espace-client/enfants/actions.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/espace-client/enfants/actions.ts" "src/app/(public)/espace-client/enfants/actions.spec.ts"
git commit -m "fix(dossier-famille): message honnête quand une pesée appartient à la consultante"
```

---

### Task 6: Test réel du filtre "rendez-vous annulé" dans `hasClientRelationship`

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts:16-62` (mock `bookings`), `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts:333-348` (test à remplacer)

**Interfaces:**
- Consumes: aucune nouvelle interface de production. Ajoute un espion (`bookingsNotCalls`) au mock partagé Supabase, sans changer son comportement de retour (aucun autre test n'est affecté).
- Produces: `bookingsNotCalls: { column: string; operator: string; value: unknown }[]` exposé via `vi.hoisted`, réinitialisé dans `resetMocks`.

Le test actuel "refuse un rendez-vous annulé comme seule relation" ne prouve rien de plus que le test voisin "refuse si aucune relation n'existe" : le mock ne simule pas le filtre `.not("status", "eq", "cancelled")`, il retourne juste les données fournies quels que soient les arguments. On remplace ce test par une vérification que le code demande bien ce filtre à Supabase (le mock enregistre les arguments de `.not()` au lieu de les ignorer), sans changer le comportement du mock pour les autres tests.

- [ ] **Step 1: Ajouter l'espion sur `.not()` dans le mock partagé**

Dans `actions.spec.ts`, le bloc `vi.hoisted` des lignes 16-40 gagne un nouveau tableau :

```ts
const {
  mockBookingsData,
  mockAccompagnementsData,
  mockEnrollmentsData,
  mockChildrenData,
  mockChildSingleData,
  mockMeasurementSingleData,
  mockMeasurementsData,
  mockDeleteResult,
  deleteCalls,
  bookingsNotCalls,
} = vi.hoisted(() => ({
  mockBookingsData: { data: [] as unknown[] },
  mockAccompagnementsData: { data: [] as { id: string }[] },
  mockEnrollmentsData: { data: [] as unknown[] },
  mockChildrenData: { data: [] as unknown[] },
  mockChildSingleData: {
    data: null as { id: string; client_id: string; birth_date?: string } | null,
  },
  mockMeasurementSingleData: {
    data: null as
      | { id: string; child_id: string; created_at?: string }
      | null,
  },
  mockMeasurementsData: { data: [] as unknown[] },
  mockDeleteResult: { error: null as unknown },
  deleteCalls: [] as { table: string }[],
  bookingsNotCalls: [] as { column: string; operator: string; value: unknown }[],
}));
```

(Note : `mockMeasurementSingleData` gagne aussi `created_at?: string`, requis par Task 7.)

Puis dans le mock `bookings` (lignes 51-62), remplace :

```ts
if (table === "bookings") {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          not: () => ({
            limit: () => Promise.resolve(mockBookingsData),
          }),
        }),
      }),
    }),
  };
}
```

par :

```ts
if (table === "bookings") {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          not: (column: string, operator: string, value: unknown) => {
            bookingsNotCalls.push({ column, operator, value });
            return { limit: () => Promise.resolve(mockBookingsData) };
          },
        }),
      }),
    }),
  };
}
```

Dans `resetMocks` (lignes 150-162), ajoute `bookingsNotCalls.length = 0;`.

- [ ] **Step 2: Remplacer le test faible par un test qui vérifie l'espion**

Remplace le test lignes 333-348 (`"refuse un rendez-vous annulé comme seule relation"`) par :

```ts
it("demande à Supabase d'exclure les rendez-vous annulés", async () => {
  mockChildSingleData.data = {
    id: validInput.child_id,
    client_id: "client-9",
    birth_date: "2025-01-01",
  };
  mockBookingsData.data = [];
  mockAccompagnementsData.data = [];

  await addWeightMeasurementAsConsultant(validInput);

  expect(bookingsNotCalls).toContainEqual({
    column: "status",
    operator: "eq",
    value: "cancelled",
  });
});
```

Ce test vérifie que `hasClientRelationship` construit bien la requête avec l'exclusion des rendez-vous annulés — la garantie que ce filtre est correctement appliqué relève de Supabase (contrat de `.not()`), pas d'une logique dupliquée dans le mock JS.

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm test "espace-consultante/crm/actions.spec.ts"`
Expected: PASS — tous les tests du fichier, y compris ceux qui utilisaient déjà `mockBookingsData`/`.not()` sans regarder les arguments (comportement de retour inchangé).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/crm/actions.spec.ts"
git commit -m "test(crm): vérifie que hasClientRelationship exclut réellement les rendez-vous annulés"
```

---

### Task 7: Test réel de l'absence de fenêtre 24h pour la consultante

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts:460-469`

**Interfaces:**
- Consumes: `mockMeasurementSingleData` (type déjà étendu à `created_at?: string` par Task 6).
- Produces: aucune.

Le test actuel pose une pesée sans `created_at`, donc il ne peut pas distinguer "pas de fenêtre 24h" de "fenêtre jamais déclenchée". On ajoute un `created_at` volontairement ancien pour prouver que l'ancienneté n'a aucun effet sur la suppression côté consultante (contrairement au flux client, qui lui bloque après 24h — cf. Task 5 et `enfants/actions.ts`).

- [ ] **Step 1: Remplacer le test**

Remplace le test lignes 460-469 :

```ts
it("supprime la pesée quand la relation existe, même si elle a plusieurs jours (pas de fenêtre 24h côté consultante)", async () => {
  const fiveDaysAgo = new Date(
    Date.now() - 5 * 24 * 60 * 60 * 1000,
  ).toISOString();
  mockMeasurementSingleData.data = {
    id: "m1",
    child_id: "child-1",
    created_at: fiveDaysAgo,
  };
  mockChildSingleData.data = { id: "child-1", client_id: "client-9" };
  mockBookingsData.data = [{ id: "booking-1" }];

  const result = await deleteWeightMeasurementAsConsultant("m1");

  expect(result.success).toBe(true);
  expect(deleteCalls).toEqual([{ table: "weight_measurements" }]);
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils passent déjà (non-régression)**

Run: `pnpm test "espace-consultante/crm/actions.spec.ts"`
Expected: PASS immédiatement — `deleteWeightMeasurementAsConsultant` ne lit ni ne vérifie `created_at`. Ce test documente et verrouille ce comportement : s'il devait un jour être modifié pour ajouter une fenêtre de rétention côté consultante, ce test échouerait et forcerait une décision explicite plutôt qu'une régression silencieuse.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/crm/actions.spec.ts"
git commit -m "test(crm): verrouille l'absence de fenêtre 24h sur la suppression consultante"
```

---

### Task 8: Une seule vérification de relation par chargement de la fiche CRM

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.ts:427-484` (`getChildrenForContact`, `getWeightMeasurementsForContact`)
- Modify: `src/app/(dashboard)/espace-consultante/crm/[clientId]/page.tsx:39-44`
- Test: `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts:226-292`

**Interfaces:**
- Consumes: `hasClientRelationship(supabase, consultantId, clientId): Promise<boolean>` (interne, inchangée).
- Produces: nouvelle fonction exportée `hasVerifiedClientRelationship(clientId: string): Promise<boolean>` (fait son propre `requireConsultant()` + `createAdminClient()`, comme les autres server actions du fichier). `getChildrenForContact(clientId: string, hasRelationship?: boolean)` et `getWeightMeasurementsForContact(clientId: string, hasRelationship?: boolean)` : si `hasRelationship` est fourni (`true`/`false`), la vérification interne est sautée et cette valeur est utilisée directement ; si `undefined` (comportement actuel, tous les appels existants), la fonction vérifie elle-même comme avant. Signatures rétrocompatibles — aucun appelant existant ne casse.

- [ ] **Step 1: Écrire le test qui échoue**

Ajoute dans `actions.spec.ts`, à la fin du `describe("getChildrenForContact", ...)` (après la ligne 257) :

```ts
it("accepte un résultat de relation déjà vérifié, sans requêter à nouveau les réservations", async () => {
  asConsultant();
  mockChildrenData.data = [{ id: "child-1", first_name: "Léa" }];
  // mockBookingsData reste vide : si le code revérifiait la relation lui-même,
  // il ne trouverait aucune réservation et renverrait [].
  mockBookingsData.data = [];

  const result = await getChildrenForContact("client-1", true);

  expect(result).toEqual([{ id: "child-1", first_name: "Léa" }]);
});
```

Et à la fin du `describe("getWeightMeasurementsForContact", ...)` (après la ligne 291) :

```ts
it("accepte un résultat de relation déjà vérifié, sans requêter à nouveau les réservations", async () => {
  asConsultant();
  mockChildrenData.data = [{ id: "child-1" }];
  mockMeasurementsData.data = [{ id: "m1", child_id: "child-1" }];
  mockBookingsData.data = [];

  const result = await getWeightMeasurementsForContact("client-1", true);

  expect(result).toEqual({ "child-1": [{ id: "m1", child_id: "child-1" }] });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm test "espace-consultante/crm/actions.spec.ts"`
Expected: FAIL sur les deux nouveaux tests — le deuxième paramètre est ignoré, la fonction revérifie via `hasClientRelationship` qui renvoie `false` (aucune réservation), donc `[]`/`{}` au lieu du résultat attendu.

- [ ] **Step 3: Implémenter le paramètre optionnel et la fonction exportée**

Dans `actions.ts`, ajoute après `hasClientRelationship` (après la ligne 425) :

```ts
/**
 * Vérifie une seule fois la relation consultante/client pour un chargement de
 * page qui va ensuite appeler plusieurs fonctions qui en ont besoin
 * (`getChildrenForContact`, `getWeightMeasurementsForContact`), pour éviter de
 * la revérifier une fois par fonction.
 */
export const hasVerifiedClientRelationship = async (
  clientId: string,
): Promise<boolean> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();
  return hasClientRelationship(supabase, user.id, clientId);
};
```

Puis modifie les deux signatures et leur garde d'entrée. Remplace (lignes 427-435) :

```ts
export const getChildrenForContact = async (
  clientId: string,
): Promise<Child[]> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  if (!(await hasClientRelationship(supabase, user.id, clientId))) {
    return [];
  }
```

par :

```ts
export const getChildrenForContact = async (
  clientId: string,
  hasRelationship?: boolean,
): Promise<Child[]> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const verified =
    hasRelationship ?? (await hasClientRelationship(supabase, user.id, clientId));
  if (!verified) {
    return [];
  }
```

Et remplace (lignes 451-459) :

```ts
export const getWeightMeasurementsForContact = async (
  clientId: string,
): Promise<Record<string, WeightMeasurement[]>> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  if (!(await hasClientRelationship(supabase, user.id, clientId))) {
    return {};
  }
```

par :

```ts
export const getWeightMeasurementsForContact = async (
  clientId: string,
  hasRelationship?: boolean,
): Promise<Record<string, WeightMeasurement[]>> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const verified =
    hasRelationship ?? (await hasClientRelationship(supabase, user.id, clientId));
  if (!verified) {
    return {};
  }
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm test "espace-consultante/crm/actions.spec.ts"`
Expected: PASS — y compris tous les tests existants de `getChildrenForContact`/`getWeightMeasurementsForContact` qui appellent avec un seul argument (comportement par défaut inchangé).

- [ ] **Step 5: Brancher `hasVerifiedClientRelationship` dans la page**

Dans `page.tsx`, remplace l'import (ligne 17-22) :

```tsx
import {
  getContactDetail,
  getTags,
  getChildrenForContact,
  getWeightMeasurementsForContact,
} from "../../crm/actions";
```

par :

```tsx
import {
  getContactDetail,
  getTags,
  getChildrenForContact,
  getWeightMeasurementsForContact,
  hasVerifiedClientRelationship,
} from "../../crm/actions";
```

Puis remplace le chargement (lignes 38-44) :

```tsx
const { clientId } = await params;
const [contact, allTags, children, measurementsByChild] = await Promise.all([
  getContactDetail(clientId),
  getTags(),
  getChildrenForContact(clientId),
  getWeightMeasurementsForContact(clientId),
]);
```

par :

```tsx
const { clientId } = await params;
const [contact, allTags, hasRelationship] = await Promise.all([
  getContactDetail(clientId),
  getTags(),
  hasVerifiedClientRelationship(clientId),
]);
const [children, measurementsByChild] = await Promise.all([
  getChildrenForContact(clientId, hasRelationship),
  getWeightMeasurementsForContact(clientId, hasRelationship),
]);
```

- [ ] **Step 6: Vérifier le typecheck et l'ensemble de la suite**

Run: `pnpm tsc --noEmit && pnpm test`
Expected: PASS, aucune erreur de type, aucune régression sur les autres fichiers de test.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/crm/actions.ts" "src/app/(dashboard)/espace-consultante/crm/actions.spec.ts" "src/app/(dashboard)/espace-consultante/crm/[clientId]/page.tsx"
git commit -m "perf(crm): vérifie une seule fois la relation client au chargement de la fiche"
```

---

## Final Check

- [ ] Run: `pnpm tsc --noEmit && pnpm test && pnpm lint`
- [ ] Relire la mémoire `dossier-famille-courbes-poids-shipped` (ou son équivalent mis à jour) : les 5 points listés doivent tous être cochés.
- [ ] Revue finale de toute la branche (diff complet contre `main`) avant merge.

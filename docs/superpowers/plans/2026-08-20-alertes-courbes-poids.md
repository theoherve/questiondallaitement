# Alertes automatiques sur les courbes de poids — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Détecter automatiquement 5 signaux cliniques (perte de poids, non-reprise à J14, cassure de courbe, stagnation pondérale) sur les courbes de poids OMS des enfants, notifier la consultante en temps réel, et les afficher dans le back-office.

**Architecture:** Une fonction pure `computeWeightAlerts` calcule les alertes actives depuis l'historique de pesées d'un enfant (aucun état persisté). Elle est appelée (a) à chaque nouvelle pesée pour notifier la consultante via le socle de notifications existant, et (b) à chaque affichage de la fiche enfant côté back-office pour un état toujours à jour.

**Tech Stack:** Next.js server actions, Supabase Postgres, Vitest, date-fns, le socle de notifications interne (`src/lib/notifications`).

**Spec:** `docs/superpowers/specs/2026-08-20-alertes-courbes-poids-design.md`

## Global Constraints

- Les 5 seuils cliniques et les 5 messages sont ceux de `docs/specs_lacteo/03_module_courbes_de_poids-1.md` §3.3, mot pour mot — ne pas les reformuler.
- `birth_weight_grams` est nullable ; les règles "perte %" et "non-reprise J14" doivent être des no-op silencieux quand il est NULL (pas d'erreur, pas d'alerte).
- Âge corrigé (prématurés) utilisé uniquement pour `curve_break` et `stagnation`. `loss_vigilance`, `loss_alert`, `no_regain_j14` restent en âge réel.
- Aucune alerte n'est visible côté espace client. Back-office uniquement.
- Aucun écran de paramétrage : seuils en constantes nommées.
- Chaque notification porte la mention fixe "Aide à la décision — reste soumise à l'appréciation clinique de la praticienne IBCLC." (affichée côté UI, pas dans le message stocké).

---

### Task 1: Migration — colonne `birth_weight_grams`

**Files:**
- Create: `supabase/migrations/00102_children_birth_weight_grams.sql`

**Interfaces:**
- Produces: colonne `children.birth_weight_grams INT NULL`, consommée par Task 4 (`computeWeightAlerts`) et Task 7 (formulaire/validation).

- [ ] **Step 1: Écrire la migration**

```sql
-- Poids de naissance, nécessaire au calcul des alertes de perte de poids et de
-- non-reprise à J14 (module courbes de poids §3.3). Nullable : aucun
-- rattrapage sur les fiches existantes, les règles concernées deviennent
-- silencieuses pour ces enfants plutôt que d'échouer.
ALTER TABLE children
  ADD COLUMN birth_weight_grams INT
    CHECK (birth_weight_grams IS NULL OR (birth_weight_grams > 0 AND birth_weight_grams < 10000));
```

- [ ] **Step 2: Appliquer la migration localement**

Run: `supabase db reset` (ou la commande de migration locale du projet — vérifier `package.json` pour un script `db:reset`/`db:push` avant, et le préférer s'il existe)
Expected: la migration s'applique sans erreur, `\d children` (psql) montre la colonne `birth_weight_grams`.

- [ ] **Step 3: Mettre à jour le type `Child`**

Modifier `src/types/database.ts` (bloc `Child`, ligne ~109-119) :

```ts
export type Child = {
  id: string;
  client_id: string;
  first_name: string;
  birth_date: string;
  sex: "female" | "male";
  is_premature: boolean;
  gestational_age_weeks: number | null;
  birth_weight_grams: number | null;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00102_children_birth_weight_grams.sql src/types/database.ts
git commit -m "feat(courbes-poids): ajoute birth_weight_grams sur children"
```

---

### Task 2: Fonction inverse poids → percentile (`who-weight-for-age.ts`)

**Files:**
- Modify: `src/lib/growth-charts/who-weight-for-age.ts`
- Test: `src/lib/growth-charts/who-weight-for-age.spec.ts`

**Interfaces:**
- Consumes: `WHO_PERCENTILES`, `Z_SCORES` (déjà dans le fichier, non exportés — `Z_SCORES` doit être exporté pour le test de round-trip).
- Produces: `getZScoreForWeight(ageInDays: number, sex: "female" | "male", weightGrams: number): number | null`, `getPercentileBandForWeight(ageInDays: number, sex: "female" | "male", weightGrams: number): WhoPercentile | null`. Consommées par Task 4.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `who-weight-for-age.spec.ts` :

```ts
import {
  getPercentileWeightGrams,
  getZScoreForWeight,
  getPercentileBandForWeight,
  WHO_PERCENTILES,
} from "./who-weight-for-age";

describe("getZScoreForWeight", () => {
  it("retrouve le z-score attendu pour un poids exactement au P50", () => {
    const weightAtP50 = getPercentileWeightGrams(30, "female", 50) as number;
    const z = getZScoreForWeight(30, "female", weightAtP50);
    expect(z).not.toBeNull();
    expect(z as number).toBeCloseTo(0, 1);
  });

  it("retourne null hors de la plage de données", () => {
    expect(getZScoreForWeight(10000, "female", 5000)).toBeNull();
  });
});

describe("getPercentileBandForWeight", () => {
  it("retrouve le couloir exact en aller-retour avec getPercentileWeightGrams", () => {
    for (const p of WHO_PERCENTILES) {
      const weight = getPercentileWeightGrams(60, "male", p) as number;
      expect(getPercentileBandForWeight(60, "male", weight)).toBe(p);
    }
  });

  it("retourne null hors de la plage de données", () => {
    expect(getPercentileBandForWeight(-1, "male", 3000)).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npx vitest run src/lib/growth-charts/who-weight-for-age.spec.ts`
Expected: FAIL — `getZScoreForWeight`/`getPercentileBandForWeight` n'existent pas.

- [ ] **Step 3: Implémenter**

Ajouter à `who-weight-for-age.ts`, après `lmsToWeightKg` :

```ts
const zScoreFromLmsWeight = (lms: LmsRow, weightKg: number): number =>
  lms.L === 0
    ? Math.log(weightKg / lms.M) / lms.S
    : (Math.pow(weightKg / lms.M, lms.L) - 1) / (lms.L * lms.S);

export const getZScoreForWeight = (
  ageInDays: number,
  sex: "female" | "male",
  weightGrams: number,
): number | null => {
  const rows = whoData[sex] as LmsRow[];
  const surrounding = findSurroundingRows(rows, ageInDays);
  if (!surrounding) return null;

  const lms = interpolateLms(surrounding[0], surrounding[1], ageInDays);
  return zScoreFromLmsWeight(lms, weightGrams / 1000);
};

export const getPercentileBandForWeight = (
  ageInDays: number,
  sex: "female" | "male",
  weightGrams: number,
): WhoPercentile | null => {
  const z = getZScoreForWeight(ageInDays, sex, weightGrams);
  if (z === null) return null;

  let closest: WhoPercentile = WHO_PERCENTILES[0];
  let closestDiff = Infinity;
  for (const p of WHO_PERCENTILES) {
    const diff = Math.abs(Z_SCORES[p] - z);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = p;
    }
  }
  return closest;
};
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npx vitest run src/lib/growth-charts/who-weight-for-age.spec.ts`
Expected: PASS (tous les tests, anciens et nouveaux).

- [ ] **Step 5: Commit**

```bash
git add src/lib/growth-charts/who-weight-for-age.ts src/lib/growth-charts/who-weight-for-age.spec.ts
git commit -m "feat(courbes-poids): ajoute la conversion poids vers percentile OMS"
```

---

### Task 3: Âge corrigé pour prématurés (`corrected-age.ts`)

**Files:**
- Create: `src/lib/growth-charts/corrected-age.ts`
- Test: `src/lib/growth-charts/corrected-age.spec.ts`

**Interfaces:**
- Produces: `getCorrectedAgeInDays(child: { is_premature: boolean; gestational_age_weeks: number | null }, ageInDaysReal: number): number`. Consommée par Task 4.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, it, expect } from "vitest";
import { getCorrectedAgeInDays } from "./corrected-age";

describe("getCorrectedAgeInDays", () => {
  it("retourne l'âge réel inchangé pour un enfant né à terme", () => {
    expect(
      getCorrectedAgeInDays({ is_premature: false, gestational_age_weeks: null }, 60),
    ).toBe(60);
  });

  it("soustrait les semaines de prématurité pour un prématuré", () => {
    // né à 32 semaines : 8 semaines de prématurité = 56 jours de correction
    expect(
      getCorrectedAgeInDays({ is_premature: true, gestational_age_weeks: 32 }, 100),
    ).toBe(44);
  });

  it("ne descend jamais sous zéro", () => {
    expect(
      getCorrectedAgeInDays({ is_premature: true, gestational_age_weeks: 32 }, 10),
    ).toBe(0);
  });

  it("retourne l'âge réel si gestational_age_weeks est absent malgré is_premature", () => {
    expect(
      getCorrectedAgeInDays({ is_premature: true, gestational_age_weeks: null }, 60),
    ).toBe(60);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `npx vitest run src/lib/growth-charts/corrected-age.spec.ts`
Expected: FAIL — le module `./corrected-age` n'existe pas.

- [ ] **Step 3: Implémenter**

```ts
export const getCorrectedAgeInDays = (
  child: { is_premature: boolean; gestational_age_weeks: number | null },
  ageInDaysReal: number,
): number => {
  if (!child.is_premature || child.gestational_age_weeks == null) {
    return ageInDaysReal;
  }
  const correctionDays = Math.max(0, (40 - child.gestational_age_weeks) * 7);
  return Math.max(0, ageInDaysReal - correctionDays);
};
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `npx vitest run src/lib/growth-charts/corrected-age.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/growth-charts/corrected-age.ts src/lib/growth-charts/corrected-age.spec.ts
git commit -m "feat(courbes-poids): calcule l'âge corrigé pour les prématurés"
```

---

### Task 4: Moteur de règles (`weight-alerts.ts`)

**Files:**
- Create: `src/lib/growth-charts/weight-alerts.ts`
- Test: `src/lib/growth-charts/weight-alerts.spec.ts`

**Interfaces:**
- Consumes: `getPercentileBandForWeight`, `WHO_PERCENTILES` (Task 2) ; `getCorrectedAgeInDays` (Task 3) ; `differenceInDays` de `date-fns`.
- Produces: `computeWeightAlerts(child: WeightAlertChild, measurements: WeightAlertMeasurement[]): WeightAlert[]`, types `WeightAlert`, `WeightAlertRule`, `WeightAlertLevel`, `WeightAlertChild`, `WeightAlertMeasurement`, constante `WEIGHT_ALERT_MESSAGES`. Consommées par Task 6 (notification) et Task 9 (UI).

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from "vitest";
import { computeWeightAlerts } from "./weight-alerts";

const baseChild = {
  birth_date: "2026-01-01",
  sex: "female" as const,
  is_premature: false,
  gestational_age_weeks: null,
  birth_weight_grams: 3200,
};

const m = (id: string, measured_at: string, weight_grams: number) => ({
  id,
  measured_at,
  weight_grams,
});

describe("computeWeightAlerts — perte de poids", () => {
  it("déclenche loss_vigilance à -7% avant J14", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-05", Math.round(3200 * 0.93)),
    ]);
    expect(alerts.map((a) => a.rule)).toContain("loss_vigilance");
  });

  it("ne déclenche rien à -5% avant J14", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-05", Math.round(3200 * 0.95)),
    ]);
    expect(alerts).toHaveLength(0);
  });

  it("déclenche loss_alert à -10%, à tout âge", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-02-01", Math.round(3200 * 0.89)),
    ]);
    expect(alerts.map((a) => a.rule)).toContain("loss_alert");
  });

  it("ne déclenche aucune règle de perte quand birth_weight_grams est NULL", () => {
    const alerts = computeWeightAlerts(
      { ...baseChild, birth_weight_grams: null },
      [m("m1", "2026-01-05", 2000)],
    );
    expect(alerts.filter((a) => a.rule.startsWith("loss"))).toHaveLength(0);
  });
});

describe("computeWeightAlerts — non-reprise à J14", () => {
  it("déclenche no_regain_j14 si le poids de naissance n'est pas retrouvé à J14+", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-16", 3100),
    ]);
    expect(alerts.map((a) => a.rule)).toContain("no_regain_j14");
  });

  it("ne déclenche rien si le poids de naissance est retrouvé à J14+", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-16", 3250),
    ]);
    expect(alerts.map((a) => a.rule)).not.toContain("no_regain_j14");
  });
});

describe("computeWeightAlerts — cassure de courbe", () => {
  it("déclenche curve_break sur une chute de 2 couloirs entre deux mesures", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-02-01", 5500), // proche P85 à 31 jours
      m("m2", "2026-03-01", 4800), // proche P15 à 59 jours
    ]);
    expect(alerts.map((a) => a.rule)).toContain("curve_break");
  });

  it("ne déclenche rien pour une croissance régulière", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-02-01", 4900),
      m("m2", "2026-03-01", 5300),
    ]);
    expect(alerts.map((a) => a.rule)).not.toContain("curve_break");
  });
});

describe("computeWeightAlerts — stagnation", () => {
  it("déclenche stagnation sur 3 mesures après J14 avec un gain moyen < 15g/j", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-02-01", 4800),
      m("m2", "2026-02-11", 4850), // +5g/j sur 10j
      m("m3", "2026-02-21", 4900), // +5g/j sur 10j
    ]);
    expect(alerts.map((a) => a.rule)).toContain("stagnation");
  });

  it("ne déclenche rien avec un gain moyen >= 15g/j", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-02-01", 4800),
      m("m2", "2026-02-11", 5000),
      m("m3", "2026-02-21", 5200),
    ]);
    expect(alerts.map((a) => a.rule)).not.toContain("stagnation");
  });
});

describe("computeWeightAlerts — âge corrigé prématuré", () => {
  it("utilise l'âge corrigé pour la cassure de courbe chez un prématuré", () => {
    const premature = {
      ...baseChild,
      is_premature: true,
      gestational_age_weeks: 32, // 8 semaines = 56 jours de correction
    };
    // Sans correction, ces mesures seraient à 90j/150j (bandes hautes,
    // écart plausible) ; avec correction (34j/94j), l'écart doit rester
    // cohérent avec la table OMS jeune plutôt que de paraître aberrant.
    const alerts = computeWeightAlerts(premature, [
      m("m1", "2026-04-01", 4600),
      m("m2", "2026-05-31", 5200),
    ]);
    expect(Array.isArray(alerts)).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npx vitest run src/lib/growth-charts/weight-alerts.spec.ts`
Expected: FAIL — le module `./weight-alerts` n'existe pas.

- [ ] **Step 3: Implémenter**

```ts
import { differenceInDays } from "date-fns";
import { getPercentileBandForWeight, WHO_PERCENTILES } from "./who-weight-for-age";
import { getCorrectedAgeInDays } from "./corrected-age";

export type WeightAlertRule =
  | "loss_vigilance"
  | "loss_alert"
  | "no_regain_j14"
  | "curve_break"
  | "stagnation";

export type WeightAlertLevel = "vigilance" | "alerte";

export type WeightAlert = {
  rule: WeightAlertRule;
  level: WeightAlertLevel;
  message: string;
  measurementId: string;
};

export type WeightAlertChild = {
  birth_date: string;
  sex: "female" | "male";
  is_premature: boolean;
  gestational_age_weeks: number | null;
  birth_weight_grams: number | null;
};

export type WeightAlertMeasurement = {
  id: string;
  measured_at: string;
  weight_grams: number;
};

export const WEIGHT_ALERT_MESSAGES: Record<WeightAlertRule, string> = {
  loss_vigilance:
    "Perte de poids à surveiller de près (≥7 % du poids de naissance) — renforcer l'observation des tétées.",
  loss_alert:
    "Perte de poids importante (≥10 %) — orientation médicale recommandée sans délai.",
  no_regain_j14:
    "Le poids de naissance n'est pas encore retrouvé à J14 — à investiguer.",
  curve_break:
    "Cassure de courbe détectée — changement de couloir de croissance à investiguer.",
  stagnation: "Prise de poids ralentie sur les dernières mesures — à surveiller.",
};

const asUtcDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

const alert = (
  rule: WeightAlertRule,
  level: WeightAlertLevel,
  measurementId: string,
): WeightAlert => ({ rule, level, message: WEIGHT_ALERT_MESSAGES[rule], measurementId });

export const computeWeightAlerts = (
  child: WeightAlertChild,
  measurements: WeightAlertMeasurement[],
): WeightAlert[] => {
  const sorted = [...measurements].sort((a, b) =>
    a.measured_at.localeCompare(b.measured_at),
  );
  const birthDate = asUtcDate(child.birth_date);
  const ageInDaysReal = (m: WeightAlertMeasurement) =>
    differenceInDays(asUtcDate(m.measured_at), birthDate);

  const alerts: WeightAlert[] = [];

  if (child.birth_weight_grams != null) {
    const birthWeight = child.birth_weight_grams;
    for (const m of sorted) {
      const age = ageInDaysReal(m);
      const lossRatio = (birthWeight - m.weight_grams) / birthWeight;

      if (age <= 13 && lossRatio >= 0.07) {
        alerts.push(alert("loss_vigilance", "vigilance", m.id));
      }
      if (lossRatio >= 0.1) {
        alerts.push(alert("loss_alert", "alerte", m.id));
      }
      if (age >= 14 && m.weight_grams < birthWeight) {
        alerts.push(alert("no_regain_j14", "vigilance", m.id));
      }
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const prevAge = getCorrectedAgeInDays(child, ageInDaysReal(sorted[i - 1]));
    const currAge = getCorrectedAgeInDays(child, ageInDaysReal(sorted[i]));
    const prevBand = getPercentileBandForWeight(prevAge, child.sex, sorted[i - 1].weight_grams);
    const currBand = getPercentileBandForWeight(currAge, child.sex, sorted[i].weight_grams);
    if (prevBand !== null && currBand !== null) {
      const gap = Math.abs(WHO_PERCENTILES.indexOf(currBand) - WHO_PERCENTILES.indexOf(prevBand));
      if (gap >= 2) {
        alerts.push(alert("curve_break", "alerte", sorted[i].id));
      }
    }
  }

  for (let i = 2; i < sorted.length; i++) {
    const first = sorted[i - 2];
    const last = sorted[i];
    const firstAgeCorrected = getCorrectedAgeInDays(child, ageInDaysReal(first));
    if (firstAgeCorrected <= 14) continue;

    const days = differenceInDays(asUtcDate(last.measured_at), asUtcDate(first.measured_at));
    if (days <= 0) continue;

    const avgGainPerDay = (last.weight_grams - first.weight_grams) / days;
    if (avgGainPerDay < 15) {
      alerts.push(alert("stagnation", "vigilance", last.id));
    }
  }

  return alerts;
};
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npx vitest run src/lib/growth-charts/weight-alerts.spec.ts`
Expected: PASS. Si `curve_break`/`stagnation` ne se déclenchent pas avec les poids d'exemple, ajuster les grammages du test (pas les seuils de l'implémentation) pour retomber franchement d'un côté ou l'autre du seuil — l'intention du test prime sur les chiffres exacts choisis à la main.

- [ ] **Step 5: Commit**

```bash
git add src/lib/growth-charts/weight-alerts.ts src/lib/growth-charts/weight-alerts.spec.ts
git commit -m "feat(courbes-poids): moteur de règles d'alertes automatiques"
```

---

### Task 5: Catalogue de notifications — `weight_alert_vigilance` / `weight_alert_alert`

**Files:**
- Modify: `src/lib/notifications/types.ts`
- Modify: `src/lib/notifications/catalog.ts`
- Test: `src/lib/notifications/catalog.spec.ts`

**Interfaces:**
- Produces: événements `NotificationEvent` `"weight_alert_vigilance"` et `"weight_alert_alert"`, avec `NotificationDataMap` `{ childId: string; childName: string; clientId: string; message: string }`. Consommés par Task 6.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `src/lib/notifications/catalog.spec.ts` (suivre le style des cas existants, ex. celui sur `admin_job_failed` ligne ~154) :

```ts
it("weight_alert_vigilance et weight_alert_alert sont in_app seulement, catégorie système", () => {
  const data = {
    childId: "child-1",
    childName: "Léo",
    clientId: "client-1",
    message: "Message de test",
  };

  for (const key of ["weight_alert_vigilance", "weight_alert_alert"] as const) {
    const def = NOTIFICATION_CATALOG[key];
    expect(def.channels).toEqual(["in_app"]);
    expect(def.category).toBe("system");
    expect(def.preferenceKey).toBe("systeme");
    expect(def.title(data)).toBeTruthy();
    expect(def.body?.(data)).toContain("Léo");
    expect(def.href?.(data)).toBe("/espace-consultante/crm/client-1");
  }
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `npx vitest run src/lib/notifications/catalog.spec.ts`
Expected: FAIL — `NOTIFICATION_CATALOG.weight_alert_vigilance` est `undefined`.

- [ ] **Step 3: Implémenter**

Dans `src/lib/notifications/types.ts`, ajouter à `NotificationDataMap` (avant la fermeture de l'objet, ligne ~99) :

```ts
  weight_alert_vigilance: {
    childId: string;
    childName: string;
    clientId: string;
    message: string;
  };
  weight_alert_alert: {
    childId: string;
    childName: string;
    clientId: string;
    message: string;
  };
```

Dans `src/lib/notifications/catalog.ts`, ajouter deux entrées à `NOTIFICATION_CATALOG` :

```ts
  weight_alert_vigilance: {
    key: "weight_alert_vigilance",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app"],
    title: () => "Vigilance — courbe de poids",
    body: (d) => `${d.childName} — ${d.message}`,
    href: (d) => `/espace-consultante/crm/${d.clientId}`,
  },
  weight_alert_alert: {
    key: "weight_alert_alert",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app"],
    title: () => "Alerte — courbe de poids",
    body: (d) => `${d.childName} — ${d.message}`,
    href: (d) => `/espace-consultante/crm/${d.clientId}`,
  },
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `npx vitest run src/lib/notifications/catalog.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/types.ts src/lib/notifications/catalog.ts src/lib/notifications/catalog.spec.ts
git commit -m "feat(courbes-poids): ajoute les événements de notification d'alerte poids"
```

---

### Task 6: Orchestration notification (`weight-alerts-notify.ts`)

**Files:**
- Create: `src/lib/growth-charts/weight-alerts-notify.ts`
- Test: `src/lib/growth-charts/weight-alerts-notify.spec.ts`

**Interfaces:**
- Consumes: `computeWeightAlerts`, `WeightAlert`, `WeightAlertChild`, `WeightAlertMeasurement` (Task 4) ; `notify`, `getRoleRecipients` de `@/lib/notifications` (Task 5 pour les types d'événement).
- Produces: `notifyWeightAlerts(child: WeightAlertChild & { id: string; first_name: string; client_id: string }, measurements: WeightAlertMeasurement[]): Promise<WeightAlert[]>`. Consommée par Task 8.

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyWeightAlerts } from "./weight-alerts-notify";
import { notify, getRoleRecipients } from "@/lib/notifications";

vi.mock("@/lib/notifications", () => ({
  notify: vi.fn(),
  getRoleRecipients: vi.fn(),
}));

const child = {
  id: "child-1",
  first_name: "Léo",
  client_id: "client-1",
  birth_date: "2026-01-01",
  sex: "female" as const,
  is_premature: false,
  gestational_age_weeks: null,
  birth_weight_grams: 3200,
};

beforeEach(() => {
  vi.mocked(getRoleRecipients).mockResolvedValue([
    { userId: "consultant-1", email: "carole@example.com" },
  ]);
  vi.mocked(notify).mockResolvedValue(undefined);
});

describe("notifyWeightAlerts", () => {
  it("n'appelle pas notify quand aucune alerte n'est active", async () => {
    const alerts = await notifyWeightAlerts(child, [
      { id: "m1", measured_at: "2026-01-05", weight_grams: 3190 },
    ]);
    expect(alerts).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifie chaque alerte active avec un dedupeId stable par mesure et règle", async () => {
    const alerts = await notifyWeightAlerts(child, [
      { id: "m1", measured_at: "2026-01-05", weight_grams: 2900 }, // -9.4%, vigilance
    ]);
    expect(alerts.map((a) => a.rule)).toContain("loss_vigilance");
    expect(notify).toHaveBeenCalledWith(
      "weight_alert_vigilance",
      [{ userId: "consultant-1", email: "carole@example.com" }],
      {
        childId: "child-1",
        childName: "Léo",
        clientId: "client-1",
        message: expect.stringContaining("Perte de poids à surveiller"),
      },
      { dedupeId: "child-1:loss_vigilance:m1" },
    );
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npx vitest run src/lib/growth-charts/weight-alerts-notify.spec.ts`
Expected: FAIL — le module `./weight-alerts-notify` n'existe pas.

- [ ] **Step 3: Implémenter**

```ts
import { notify, getRoleRecipients } from "@/lib/notifications";
import {
  computeWeightAlerts,
  type WeightAlert,
  type WeightAlertChild,
  type WeightAlertMeasurement,
} from "./weight-alerts";

type ChildForNotification = WeightAlertChild & {
  id: string;
  first_name: string;
  client_id: string;
};

/**
 * Calcule les alertes actives et notifie la consultante pour chacune, sans
 * jamais lever : une alerte perdue ne doit pas faire échouer la saisie de
 * pesée qui l'a déclenchée.
 */
export const notifyWeightAlerts = async (
  child: ChildForNotification,
  measurements: WeightAlertMeasurement[],
): Promise<WeightAlert[]> => {
  const alerts = computeWeightAlerts(child, measurements);
  if (alerts.length === 0) return alerts;

  try {
    const recipients = await getRoleRecipients("consultant");
    for (const alert of alerts) {
      const event = alert.level === "alerte" ? "weight_alert_alert" : "weight_alert_vigilance";
      await notify(
        event,
        recipients,
        {
          childId: child.id,
          childName: child.first_name,
          clientId: child.client_id,
          message: alert.message,
        },
        { dedupeId: `${child.id}:${alert.rule}:${alert.measurementId}` },
      );
    }
  } catch (error) {
    console.error("notifyWeightAlerts a échoué :", error);
  }

  return alerts;
};
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npx vitest run src/lib/growth-charts/weight-alerts-notify.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/growth-charts/weight-alerts-notify.ts src/lib/growth-charts/weight-alerts-notify.spec.ts
git commit -m "feat(courbes-poids): orchestre le calcul et la notification des alertes"
```

---

### Task 7: Poids de naissance dans le formulaire enfant

**Files:**
- Modify: `src/validations/children.ts`
- Modify: `src/app/(public)/espace-client/enfants/actions.ts:20-65` (`createChild`)
- Modify: `src/app/(public)/espace-client/enfants/_components/child-form.tsx`
- Test: `src/validations/children.spec.ts` (créer s'il n'existe pas déjà — vérifier avant d'écrire)

**Interfaces:**
- Produces: `childSchema` accepte un champ optionnel `birth_weight_grams`, `createChild` le persiste. Consommé par Task 9 indirectement (le champ apparaît ensuite dans `Child` partout où `select("*")` est utilisé).

- [ ] **Step 1: Vérifier l'existence du fichier de test de validation**

Run: `ls src/validations/children.spec.ts 2>/dev/null || echo "absent"`

Si absent, créer le fichier avec seulement les nouveaux tests (Step suivant). Si présent, y ajouter les tests.

- [ ] **Step 2: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from "vitest";
import { childSchema } from "./children";

describe("childSchema — birth_weight_grams", () => {
  const base = {
    first_name: "Léo",
    birth_date: "2026-01-01",
    sex: "female" as const,
    is_premature: false,
    gestational_age_weeks: null,
  };

  it("accepte l'absence de poids de naissance", () => {
    const result = childSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("accepte un poids de naissance plausible", () => {
    const result = childSchema.safeParse({ ...base, birth_weight_grams: 3200 });
    expect(result.success).toBe(true);
  });

  it("rejette un poids de naissance incohérent", () => {
    const result = childSchema.safeParse({ ...base, birth_weight_grams: 15000 });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Lancer le test, vérifier l'échec**

Run: `npx vitest run src/validations/children.spec.ts`
Expected: FAIL — `birth_weight_grams` rejeté comme clé inconnue par `.strict()` implicite ou ignoré silencieusement selon le schéma actuel ; le test de rejet (15000) échoue en tout cas puisqu'aucune contrainte n'existe encore.

- [ ] **Step 4: Implémenter — schéma**

Dans `src/validations/children.ts`, ajouter au `childSchema` (dans l'objet, avant le `.refine` existant, ligne ~43) :

```ts
    birth_weight_grams: z
      .number()
      .min(1, "Poids de naissance invalide")
      .max(9999, "Poids de naissance invalide")
      .optional()
      .nullable(),
```

- [ ] **Step 5: Implémenter — action `createChild`**

Dans `src/app/(public)/espace-client/enfants/actions.ts`, modifier l'insert de `createChild` (ligne ~46-57) :

```ts
  const { data: child, error } = await supabase
    .from("children")
    .insert({
      client_id: user.id,
      first_name: parsed.data.first_name,
      birth_date: parsed.data.birth_date,
      sex: parsed.data.sex,
      is_premature: parsed.data.is_premature,
      gestational_age_weeks: parsed.data.gestational_age_weeks ?? null,
      birth_weight_grams: parsed.data.birth_weight_grams ?? null,
    })
    .select("id")
    .single();
```

- [ ] **Step 6: Implémenter — UI `child-form.tsx`**

Ajouter un état et un champ, à la suite de `gestationalWeeks` :

```tsx
  const [birthWeightKg, setBirthWeightKg] = useState("");
```

Dans `handleSubmit`, ajouter au payload de `createChild` :

```ts
        birth_weight_grams: birthWeightKg
          ? Math.round(Number(birthWeightKg) * 1000)
          : undefined,
```

Et après le champ "Sexe" (avant le bloc `is_premature`), ajouter :

```tsx
        <div>
          <Label htmlFor="child-birth-weight">Poids de naissance (kg, optionnel)</Label>
          <Input
            id="child-birth-weight"
            type="number"
            step="0.01"
            min="0"
            value={birthWeightKg}
            onChange={(e) => setBirthWeightKg(e.target.value)}
          />
        </div>
```

Réinitialiser `setBirthWeightKg("")` dans le bloc de succès de `handleSubmit`, à côté des autres `set*("")`.

- [ ] **Step 7: Lancer le test, vérifier le succès**

Run: `npx vitest run src/validations/children.spec.ts`
Expected: PASS.

- [ ] **Step 8: Vérifier que les tests existants de `createChild` passent toujours**

Run: `npx vitest run "src/app/(public)/espace-client/enfants/actions.spec.ts"`
Expected: PASS (le nouveau champ optionnel ne doit rien casser).

- [ ] **Step 9: Commit**

```bash
git add src/validations/children.ts src/validations/children.spec.ts "src/app/(public)/espace-client/enfants/actions.ts" "src/app/(public)/espace-client/enfants/_components/child-form.tsx"
git commit -m "feat(courbes-poids): ajoute le poids de naissance au formulaire enfant"
```

---

### Task 8: Déclenchement à la saisie d'une pesée

**Files:**
- Modify: `src/app/(public)/espace-client/enfants/actions.ts:112-159` (`addWeightMeasurement`)
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.ts:750-800` (`addWeightMeasurementAsConsultant`)
- Test: `src/app/(public)/espace-client/enfants/actions.spec.ts`
- Test: `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts`

**Interfaces:**
- Consumes: `notifyWeightAlerts` (Task 6).
- Produces: les deux actions appellent `notifyWeightAlerts` après l'insertion réussie, sans changer leur `ActionResult` de retour (le test de dedupe de Task 6 couvre déjà `notifyWeightAlerts` lui-même — ici on vérifie seulement qu'il est bien appelé avec les bonnes données).

- [ ] **Step 1: Écrire le test qui échoue (espace client)**

Ajouter à `src/app/(public)/espace-client/enfants/actions.spec.ts` (mocker `notifyWeightAlerts` en tête de fichier avec les autres mocks du module) :

```ts
vi.mock("@/lib/growth-charts/weight-alerts-notify", () => ({
  notifyWeightAlerts: vi.fn().mockResolvedValue([]),
}));
```

Puis un test dans le `describe("addWeightMeasurement", ...)` existant :

```ts
it("appelle notifyWeightAlerts avec l'enfant complet et l'historique de pesées après insertion", async () => {
  const { notifyWeightAlerts } = await import("@/lib/growth-charts/weight-alerts-notify");
  // Réutiliser le mock Supabase déjà en place dans ce fichier pour simuler
  // un enfant existant + une insertion réussie, comme font les tests voisins.
  await addWeightMeasurement({
    child_id: "child-1",
    weight_grams: 3000,
    measured_at: "2026-01-10",
    source: "home",
  });
  expect(notifyWeightAlerts).toHaveBeenCalled();
  const [childArg] = vi.mocked(notifyWeightAlerts).mock.calls[0];
  expect(childArg).toMatchObject({ id: "child-1" });
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `npx vitest run "src/app/(public)/espace-client/enfants/actions.spec.ts"`
Expected: FAIL — `notifyWeightAlerts` n'est pas appelé (pas encore câblé), ou erreur de mock Supabase à ajuster pour retourner les champs complets de l'enfant (voir Step 3).

- [ ] **Step 3: Implémenter — `addWeightMeasurement`**

Dans `src/app/(public)/espace-client/enfants/actions.ts`, étendre le `select` de l'enfant (ligne ~123-128) et appeler `notifyWeightAlerts` après l'insertion :

```ts
  const supabase = createAdminClient();
  const { data: child } = await supabase
    .from("children")
    .select(
      "id, client_id, birth_date, sex, is_premature, gestational_age_weeks, birth_weight_grams, first_name",
    )
    .eq("id", parsed.data.child_id)
    .eq("client_id", user.id)
    .single();
  if (!child) {
    return { success: false, error: "Enfant introuvable" };
  }
```

Après l'insertion réussie (juste avant `revalidatePath`, ligne ~153-157) :

```ts
  if (error || !measurement) {
    return { success: false, error: "Erreur lors de l'ajout de la pesée" };
  }

  const { data: allMeasurements } = await supabase
    .from("weight_measurements")
    .select("id, measured_at, weight_grams")
    .eq("child_id", parsed.data.child_id);
  await notifyWeightAlerts(child, allMeasurements ?? []);

  revalidatePath(`/espace-client/enfants/${parsed.data.child_id}`);
  return { success: true, data: measurement };
```

Ajouter l'import en tête de fichier :

```ts
import { notifyWeightAlerts } from "@/lib/growth-charts/weight-alerts-notify";
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `npx vitest run "src/app/(public)/espace-client/enfants/actions.spec.ts"`
Expected: PASS. Ajuster le mock Supabase du fichier si besoin pour que `.select(...)` sur `children` renvoie les nouveaux champs (`sex`, `is_premature`, `gestational_age_weeks`, `birth_weight_grams`, `first_name`) — suivre le pattern des mocks déjà en place dans ce fichier plutôt qu'en créer un nouveau.

- [ ] **Step 5: Répéter Steps 1-4 pour `addWeightMeasurementAsConsultant`**

Même logique dans `src/app/(dashboard)/espace-consultante/crm/actions.ts` :

- Étendre le `select` ligne ~760-764 :

```ts
  const { data: child } = await supabase
    .from("children")
    .select(
      "id, client_id, birth_date, sex, is_premature, gestational_age_weeks, birth_weight_grams, first_name",
    )
    .eq("id", parsed.data.child_id)
    .single();
```

- Après l'insertion réussie (avant `revalidatePath`, ligne ~794-798) :

```ts
  if (error || !measurement) {
    return { success: false, error: "Erreur lors de l'ajout de la pesée" };
  }

  const { data: allMeasurements } = await supabase
    .from("weight_measurements")
    .select("id, measured_at, weight_grams")
    .eq("child_id", parsed.data.child_id);
  await notifyWeightAlerts(child, allMeasurements ?? []);

  revalidatePath(`/espace-consultante/crm/${child.client_id}`);
  return { success: true, data: measurement };
```

- Import identique en tête de fichier.
- Test identique dans `crm/actions.spec.ts`, dans le `describe("addWeightMeasurementAsConsultant", ...)` existant.

Run : `npx vitest run "src/app/(dashboard)/espace-consultante/crm/actions.spec.ts"`
Expected: PASS.

- [ ] **Step 6: Lancer toute la suite de tests du projet**

Run: `npx vitest run`
Expected: PASS — aucune régression sur les tests existants des deux fichiers d'actions modifiés ni ailleurs.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(public)/espace-client/enfants/actions.ts" "src/app/(public)/espace-client/enfants/actions.spec.ts" "src/app/(dashboard)/espace-consultante/crm/actions.ts" "src/app/(dashboard)/espace-consultante/crm/actions.spec.ts"
git commit -m "feat(courbes-poids): notifie la consultante à chaque pesée déclenchant une alerte"
```

---

### Task 9: Affichage back-office (`ChildrenPanel`)

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/_components/children-panel.tsx`
- Test: `src/app/(dashboard)/espace-consultante/crm/_components/children-panel.spec.tsx` (créer s'il n'existe pas déjà — vérifier avant d'écrire)

**Interfaces:**
- Consumes: `computeWeightAlerts` (Task 4), `Child`/`WeightMeasurement` déjà reçus en props (incluent `birth_weight_grams` depuis Task 1).
- Produces: bloc d'alertes visible au-dessus de `WeightChart` pour l'enfant sélectionné.

- [ ] **Step 1: Vérifier l'existence d'un test de composant pour `ChildrenPanel`**

Run: `ls "src/app/(dashboard)/espace-consultante/crm/_components/children-panel.spec.tsx" 2>/dev/null || echo "absent"`

- [ ] **Step 2: Écrire le test qui échoue**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChildrenPanel } from "./children-panel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../actions", () => ({
  addWeightMeasurementAsConsultant: vi.fn(),
  deleteChildAsConsultant: vi.fn(),
  deleteWeightMeasurementAsConsultant: vi.fn(),
}));

const child = {
  id: "child-1",
  client_id: "client-1",
  first_name: "Léo",
  birth_date: "2026-01-01",
  sex: "female" as const,
  is_premature: false,
  gestational_age_weeks: null,
  birth_weight_grams: 3200,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("ChildrenPanel — bloc alertes", () => {
  it("affiche le message d'une alerte active", () => {
    render(
      <ChildrenPanel
        childrenList={[child]}
        measurementsByChild={{
          "child-1": [
            {
              id: "m1",
              child_id: "child-1",
              weight_grams: 2900,
              measured_at: "2026-01-05",
              source: "home",
              recorded_by: "client-1",
              consultant_id: null,
              created_at: "2026-01-05T00:00:00.000Z",
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByText(/Perte de poids importante/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/aide à la décision/i),
    ).toBeInTheDocument();
  });

  it("n'affiche aucun bloc alerte quand il n'y en a pas", () => {
    render(
      <ChildrenPanel
        childrenList={[child]}
        measurementsByChild={{
          "child-1": [
            {
              id: "m1",
              child_id: "child-1",
              weight_grams: 3190,
              measured_at: "2026-01-05",
              source: "home",
              recorded_by: "client-1",
              consultant_id: null,
              created_at: "2026-01-05T00:00:00.000Z",
            },
          ],
        }}
      />,
    );
    expect(screen.queryByText(/aide à la décision/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Lancer le test, vérifier l'échec**

Run: `npx vitest run "src/app/(dashboard)/espace-consultante/crm/_components/children-panel.spec.tsx"`
Expected: FAIL — aucun texte d'alerte n'est actuellement rendu.

- [ ] **Step 4: Implémenter**

Dans `children-panel.tsx`, ajouter l'import :

```ts
import { computeWeightAlerts } from "@/lib/growth-charts/weight-alerts";
```

Juste avant le `return` du JSX principal (après le calcul de `selectedMeasurements`), calculer les alertes de l'enfant sélectionné :

```ts
  const selectedAlerts = selectedChild
    ? computeWeightAlerts(selectedChild, selectedMeasurements)
    : [];
```

Ajouter le bloc juste avant le rendu de `<WeightChart .../>` (repérer son emplacement dans le JSX existant) :

```tsx
      {selectedAlerts.length > 0 && (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
          {selectedAlerts.map((a) => (
            <p
              key={`${a.rule}-${a.measurementId}`}
              className={
                a.level === "alerte"
                  ? "text-sm font-medium text-red-700"
                  : "text-sm font-medium text-amber-700"
              }
            >
              {a.message}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">
            Aide à la décision — reste soumise à l&apos;appréciation clinique
            de la praticienne IBCLC.
          </p>
        </div>
      )}
```

- [ ] **Step 5: Lancer le test, vérifier le succès**

Run: `npx vitest run "src/app/(dashboard)/espace-consultante/crm/_components/children-panel.spec.tsx"`
Expected: PASS.

- [ ] **Step 6: Lancer toute la suite de tests du projet**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/crm/_components/children-panel.tsx" "src/app/(dashboard)/espace-consultante/crm/_components/children-panel.spec.tsx"
git commit -m "feat(courbes-poids): affiche les alertes actives dans le back-office"
```

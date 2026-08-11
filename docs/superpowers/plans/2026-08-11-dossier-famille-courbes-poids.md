# Dossier famille (enfant) + Courbes de poids OMS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a client add their children and weight measurements from their client space, and let the consultant see and add the same data from the CRM contact page, with a weight chart plotted against WHO reference percentiles.

**Architecture:** Two new Postgres tables (`children`, `weight_measurements`) owned by the client (`client_id`), following this repo's Server Actions + `createAdminClient()` (service-role, RLS bypassed in app code, RLS kept as browser-client backstop) pattern. Consultant access to a child is authorized in application code by checking a real booking/enrollment relationship with that client — never via a live RLS join, matching how `getContactDetail` already works for `crm_notes`/`bookings`. A static WHO LMS reference dataset (fetched once from WHO's public child-growth-standards data) drives a pure percentile-calculation function, rendered with a `recharts` component reused in both the client space and the CRM.

**Tech Stack:** Next.js Server Actions, Supabase (Postgres + RLS), Zod v4, Vitest, recharts, shadcn/ui, lucide-react, date-fns.

## Global Constraints

- Test file naming: `*.spec.ts`, colocated next to the file under test (repo convention — 106 existing files use this suffix).
- All mutations are Server Actions (`"use server"` files named `actions.ts`), never API routes, never client-side Supabase writes.
- All Server Actions use `createAdminClient()` (`src/lib/supabase/admin.ts`) and manually scope every query with `.eq("client_id", ...)` — RLS on `children`/`weight_measurements` is a backstop, not the authorization mechanism.
- Consultant-side actions must verify the consultant/client relationship via a real query (bookings or `accompagnement_enrollments`), exactly like `getContactDetail` in `src/app/(dashboard)/espace-consultante/crm/actions.ts` — never trust a `child_id` passed from the client without this check.
- Validation via Zod v4 schemas in `src/validations/<domain>.ts`, following the exact style of `src/validations/crm.ts`.
- Mutations return `ActionResult<T>` (`src/types/index.ts`), never throw for expected validation/business errors.
- No new alerting logic, no corrected age calculation in the percentile function (chronological age only), no PDF export — these are explicitly out of scope per the design doc (`docs/superpowers/specs/2026-08-11-dossier-famille-courbes-poids-design.md`, section 6).
- Brand color for chart lines: `#a0283e` (`--primary`, see `src/app/globals.css:82`); percentile bands use a muted gray, not a brand color, so the child's own curve stands out.

---

### Task 1: Migration — `children` and `weight_measurements` tables

**Files:**
- Create: `supabase/migrations/00094_children_weight_measurements.sql`

**Interfaces:**
- Produces: tables `children(id, client_id, first_name, birth_date, sex, is_premature, gestational_age_weeks, created_at, updated_at)` and `weight_measurements(id, child_id, weight_grams, measured_at, source, recorded_by, consultant_id, created_at)`.

- [ ] **Step 1: Write the migration file**

```sql
-- Dossier famille : enfants rattachés à un profil client, et leurs pesées.
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('female', 'male')),
  is_premature BOOLEAN NOT NULL DEFAULT false,
  gestational_age_weeks INT CHECK (gestational_age_weeks IS NULL OR (gestational_age_weeks > 0 AND gestational_age_weeks < 45)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_children_client ON children(client_id);

CREATE TRIGGER children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TABLE weight_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  weight_grams INT NOT NULL CHECK (weight_grams > 0 AND weight_grams < 50000),
  measured_at DATE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('home', 'consultation')),
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  consultant_id UUID REFERENCES consultants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weight_measurements_child ON weight_measurements(child_id);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY children_select_own ON children
  FOR SELECT USING (client_id = auth.uid());
CREATE POLICY children_insert_own ON children
  FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY children_update_own ON children
  FOR UPDATE USING (client_id = auth.uid());
CREATE POLICY children_delete_own ON children
  FOR DELETE USING (client_id = auth.uid());
CREATE POLICY children_select_admin ON children
  FOR SELECT USING (is_admin());

CREATE POLICY weight_measurements_select_own ON weight_measurements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.client_id = auth.uid())
  );
CREATE POLICY weight_measurements_insert_own ON weight_measurements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.client_id = auth.uid())
  );
CREATE POLICY weight_measurements_delete_own ON weight_measurements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.client_id = auth.uid())
  );
CREATE POLICY weight_measurements_select_admin ON weight_measurements
  FOR SELECT USING (is_admin());
```

- [ ] **Step 2: Apply the migration locally**

Run: `supabase db reset` (or the project's usual local migration command — check `package.json` for a `db:reset`/`db:push` script first and prefer that).
Expected: migration `00094_children_weight_measurements.sql` applies with no error, tables visible via `supabase db diff` or the Supabase Studio table list.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00094_children_weight_measurements.sql
git commit -m "feat(db): ajoute les tables children et weight_measurements"
```

---

### Task 2: Types and Zod validation schemas

**Files:**
- Modify: `src/types/database.ts` (add `Child` and `WeightMeasurement` types near `Profile`)
- Create: `src/validations/children.ts`
- Test: `src/validations/children.spec.ts`

**Interfaces:**
- Consumes: none.
- Produces: `Child`, `WeightMeasurement` types (`src/types/database.ts`); `childSchema`, `weightMeasurementSchema` and inferred `ChildInput`, `WeightMeasurementInput` types (`src/validations/children.ts`) — used by Tasks 3, 5, 9.

- [ ] **Step 1: Add domain types**

In `src/types/database.ts`, after the `Profile` type block, add:

```ts
export type Child = {
  id: string;
  client_id: string;
  first_name: string;
  birth_date: string;
  sex: "female" | "male";
  is_premature: boolean;
  gestational_age_weeks: number | null;
  created_at: string;
  updated_at: string;
};

export type WeightMeasurement = {
  id: string;
  child_id: string;
  weight_grams: number;
  measured_at: string;
  source: "home" | "consultation";
  recorded_by: string;
  consultant_id: string | null;
  created_at: string;
};
```

- [ ] **Step 2: Write the failing validation test**

```ts
// src/validations/children.spec.ts
import { describe, it, expect } from "vitest";
import { childSchema, weightMeasurementSchema } from "./children";

describe("childSchema", () => {
  it("accepte un enfant valide sans prématurité", () => {
    const result = childSchema.safeParse({
      first_name: "Léa",
      birth_date: "2025-01-10",
      sex: "female",
      is_premature: false,
    });
    expect(result.success).toBe(true);
  });

  it("exige gestational_age_weeks quand is_premature est vrai", () => {
    const result = childSchema.safeParse({
      first_name: "Noah",
      birth_date: "2025-01-10",
      sex: "male",
      is_premature: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejette un prénom vide", () => {
    const result = childSchema.safeParse({
      first_name: "",
      birth_date: "2025-01-10",
      sex: "female",
      is_premature: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("weightMeasurementSchema", () => {
  it("accepte une pesée valide", () => {
    const result = weightMeasurementSchema.safeParse({
      child_id: "550e8400-e29b-41d4-a716-446655440000",
      weight_grams: 4200,
      measured_at: "2025-02-01",
      source: "home",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un poids négatif ou nul", () => {
    const result = weightMeasurementSchema.safeParse({
      child_id: "550e8400-e29b-41d4-a716-446655440000",
      weight_grams: 0,
      measured_at: "2025-02-01",
      source: "home",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un poids irréaliste (>50kg)", () => {
    const result = weightMeasurementSchema.safeParse({
      child_id: "550e8400-e29b-41d4-a716-446655440000",
      weight_grams: 60000,
      measured_at: "2025-02-01",
      source: "home",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/validations/children.spec.ts`
Expected: FAIL — `Cannot find module './children'`.

- [ ] **Step 4: Write the schema implementation**

```ts
// src/validations/children.ts
import { z } from "zod/v4";

export const childSchema = z
  .object({
    first_name: z.string().min(1, "Le prénom est requis").max(80, "Maximum 80 caractères"),
    birth_date: z.string().min(1, "La date de naissance est requise"),
    sex: z.enum(["female", "male"], { message: "Le sexe est requis" }),
    is_premature: z.boolean(),
    gestational_age_weeks: z
      .number()
      .min(1, "Nombre de semaines invalide")
      .max(44, "Nombre de semaines invalide")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => !data.is_premature || data.gestational_age_weeks != null,
    {
      message: "L'âge gestationnel est requis pour un enfant né prématurément",
      path: ["gestational_age_weeks"],
    },
  );

export type ChildInput = z.infer<typeof childSchema>;

export const weightMeasurementSchema = z.object({
  child_id: z.string().uuid("Enfant requis"),
  weight_grams: z
    .number()
    .min(1, "Le poids doit être positif")
    .max(50000, "Poids incohérent"),
  measured_at: z.string().min(1, "La date de la pesée est requise"),
  source: z.enum(["home", "consultation"]),
});

export type WeightMeasurementInput = z.infer<typeof weightMeasurementSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/validations/children.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/types/database.ts src/validations/children.ts src/validations/children.spec.ts
git commit -m "feat: ajoute types et schémas de validation pour enfants et pesées"
```

---

### Task 3: Client-side Server Actions (espace-client)

**Files:**
- Create: `src/app/(public)/espace-client/enfants/actions.ts`
- Test: `src/app/(public)/espace-client/enfants/actions.spec.ts`

**Interfaces:**
- Consumes: `childSchema`, `weightMeasurementSchema`, `ChildInput`, `WeightMeasurementInput` (Task 2); `getSupabaseAndUser` (`src/lib/supabase/server-auth.ts`); `createAdminClient` (`src/lib/supabase/admin.ts`); `ActionResult<T>` (`src/types/index.ts`).
- Produces: `listMyChildren()`, `createChild(input: unknown): Promise<ActionResult<{ id: string }>>`, `deleteChild(childId: string): Promise<ActionResult>`, `addWeightMeasurement(input: unknown): Promise<ActionResult<{ id: string }>>`, `deleteWeightMeasurement(measurementId: string): Promise<ActionResult>` — consumed by Task 7 (UI pages).

- [ ] **Step 1: Write the failing test for `createChild` consent gate and success path**

```ts
// src/app/(public)/espace-client/enfants/actions.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSupabaseAndUser, insertCalls } = vi.hoisted(() => ({
  mockGetSupabaseAndUser: vi.fn(),
  insertCalls: [] as { table: string; data: unknown }[],
}));

vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: mockGetSupabaseAndUser,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: (data: unknown) => {
        insertCalls.push({ table, data });
        return {
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "child-1" }, error: null }),
          }),
        };
      },
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  }),
}));

import { createChild } from "./actions";

describe("createChild", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
  });

  it("refuse la création si le client n'a pas de consentement RGPD", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1", gdpr_consent_at: null },
      supabase: {},
    });

    const result = await createChild({
      first_name: "Léa",
      birth_date: "2025-01-10",
      sex: "female",
      is_premature: false,
    });

    expect(result.success).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });

  it("crée l'enfant rattaché au client quand le consentement existe", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1", gdpr_consent_at: "2025-01-01T00:00:00.000Z" },
      supabase: {},
    });

    const result = await createChild({
      first_name: "Léa",
      birth_date: "2025-01-10",
      sex: "female",
      is_premature: false,
    });

    expect(result.success).toBe(true);
    expect(insertCalls.at(-1)).toMatchObject({
      table: "children",
      data: { client_id: "client-1", first_name: "Léa" },
    });
  });

  it("rejette une entrée invalide avant tout accès base", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1", gdpr_consent_at: "2025-01-01T00:00:00.000Z" },
      supabase: {},
    });

    const result = await createChild({
      first_name: "",
      birth_date: "2025-01-10",
      sex: "female",
      is_premature: false,
    });

    expect(result.success).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/app/\(public\)/espace-client/enfants/actions.spec.ts`
Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/(public)/espace-client/enfants/actions.ts
"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { childSchema, weightMeasurementSchema } from "@/validations/children";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { Child, WeightMeasurement } from "@/types/database";

export const listMyChildren = async (): Promise<Child[]> => {
  const { user } = await getSupabaseAndUser();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("children")
    .select("*")
    .eq("client_id", user.id)
    .order("birth_date", { ascending: false });
  return data ?? [];
};

export const createChild = async (
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const { user } = await getSupabaseAndUser();

  if (!user.gdpr_consent_at) {
    return {
      success: false,
      error:
        "Le consentement RGPD doit être accepté avant d'ajouter un enfant.",
    };
  }

  const parsed = childSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: child, error } = await supabase
    .from("children")
    .insert({
      client_id: user.id,
      first_name: parsed.data.first_name,
      birth_date: parsed.data.birth_date,
      sex: parsed.data.sex,
      is_premature: parsed.data.is_premature,
      gestational_age_weeks: parsed.data.gestational_age_weeks ?? null,
    })
    .select("id")
    .single();

  if (error || !child) {
    return { success: false, error: "Erreur lors de la création de l'enfant" };
  }

  revalidatePath("/espace-client/enfants");
  return { success: true, data: child };
};

export const deleteChild = async (childId: string): Promise<ActionResult> => {
  const { user } = await getSupabaseAndUser();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("children")
    .delete()
    .eq("id", childId)
    .eq("client_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/espace-client/enfants");
  return { success: true };
};

export const listWeightMeasurements = async (
  childId: string,
): Promise<WeightMeasurement[]> => {
  const { user } = await getSupabaseAndUser();
  const supabase = createAdminClient();

  const { data: child } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("client_id", user.id)
    .single();
  if (!child) return [];

  const { data } = await supabase
    .from("weight_measurements")
    .select("*")
    .eq("child_id", childId)
    .order("measured_at", { ascending: true });
  return data ?? [];
};

export const addWeightMeasurement = async (
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const { user } = await getSupabaseAndUser();

  const parsed = weightMeasurementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: child } = await supabase
    .from("children")
    .select("id")
    .eq("id", parsed.data.child_id)
    .eq("client_id", user.id)
    .single();
  if (!child) {
    return { success: false, error: "Enfant introuvable" };
  }

  const { data: measurement, error } = await supabase
    .from("weight_measurements")
    .insert({
      child_id: parsed.data.child_id,
      weight_grams: parsed.data.weight_grams,
      measured_at: parsed.data.measured_at,
      source: "home",
      recorded_by: user.id,
    })
    .select("id")
    .single();

  if (error || !measurement) {
    return { success: false, error: "Erreur lors de l'ajout de la pesée" };
  }

  revalidatePath(`/espace-client/enfants/${parsed.data.child_id}`);
  return { success: true, data: measurement };
};

export const deleteWeightMeasurement = async (
  measurementId: string,
): Promise<ActionResult> => {
  const { user } = await getSupabaseAndUser();
  const supabase = createAdminClient();

  const { data: measurement } = await supabase
    .from("weight_measurements")
    .select("id, child_id, recorded_by, created_at, children(client_id)")
    .eq("id", measurementId)
    .single();

  if (!measurement || measurement.recorded_by !== user.id) {
    return { success: false, error: "Pesée introuvable" };
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const isPastEditWindow =
    Date.now() - new Date(measurement.created_at).getTime() > ONE_DAY_MS;
  if (isPastEditWindow) {
    return {
      success: false,
      error: "Cette pesée ne peut plus être supprimée après 24h.",
    };
  }

  const { error } = await supabase
    .from("weight_measurements")
    .delete()
    .eq("id", measurementId);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/espace-client/enfants/${measurement.child_id}`);
  return { success: true };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/app/\(public\)/espace-client/enfants/actions.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/espace-client/enfants/actions.ts" "src/app/(public)/espace-client/enfants/actions.spec.ts"
git commit -m "feat: server actions client pour enfants et pesées à domicile"
```

---

### Task 4: WHO weight-for-age reference data and percentile function

**Files:**
- Create: `src/lib/growth-charts/who-weight-for-age.json`
- Create: `src/lib/growth-charts/who-weight-for-age.ts`
- Test: `src/lib/growth-charts/who-weight-for-age.spec.ts`

**Interfaces:**
- Consumes: none.
- Produces: `getPercentileWeightGrams(ageInDays: number, sex: "female" | "male", percentile: 3 | 15 | 50 | 85 | 97): number | null` and `WHO_PERCENTILES: readonly [3, 15, 50, 85, 97]` — consumed by Task 5 (chart component).

- [ ] **Step 1: Source the official WHO LMS reference data**

The WHO Child Growth Standards publish official, public-domain LMS parameter tables
(L, M, S per day of age, 0–1856 days, separately for boys and girls, weight-for-age)
on the WHO website's child growth standards section (search "WHO Child Growth
Standards weight-for-age" on who.int — the page offers the LMS tables as
downloadable CSV/XLSX, licensed for reuse). Download both the boys and girls
weight-for-age LMS tables.

Write a small one-off conversion (a scratch Node/TS script is fine, not committed)
that reads the two source files and emits `src/lib/growth-charts/who-weight-for-age.json`
with this exact shape (sample every 7 days from day 0 to day 730 — weekly resolution
is enough for a growth chart and keeps the JSON small):

```json
{
  "female": [
    { "ageDays": 0, "L": -0.3833, "M": 3.2322, "S": 0.14171 },
    { "ageDays": 7, "L": 0.1478, "M": 3.5813, "S": 0.14691 }
  ],
  "male": [
    { "ageDays": 0, "L": 0.3487, "M": 3.3464, "S": 0.14602 },
    { "ageDays": 7, "L": 0.4926, "M": 3.6873, "S": 0.13584 }
  ]
}
```

(The four sample rows above illustrate the shape only — the committed file must
contain the real values from the downloaded WHO tables at weekly steps from 0 to
730 days for both sexes, roughly 105 entries per sex.)

- [ ] **Step 2: Write the failing test for the percentile function**

```ts
// src/lib/growth-charts/who-weight-for-age.spec.ts
import { describe, it, expect } from "vitest";
import { getPercentileWeightGrams, WHO_PERCENTILES } from "./who-weight-for-age";
import whoData from "./who-weight-for-age.json";

describe("getPercentileWeightGrams", () => {
  it("le P50 à un âge donné correspond au paramètre M de la table (± 1g)", () => {
    const firstMaleRow = whoData.male[0];
    const p50Grams = getPercentileWeightGrams(firstMaleRow.ageDays, "male", 50);
    expect(p50Grams).not.toBeNull();
    expect(p50Grams).toBeCloseTo(firstMaleRow.M * 1000, 0);
  });

  it("les percentiles sont strictement croissants pour un âge donné", () => {
    const values = WHO_PERCENTILES.map(
      (p) => getPercentileWeightGrams(30, "female", p) ?? 0,
    );
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it("retourne null hors de la plage de données (âge négatif ou > 2 ans)", () => {
    expect(getPercentileWeightGrams(-1, "female", 50)).toBeNull();
    expect(getPercentileWeightGrams(10000, "female", 50)).toBeNull();
  });

  it("interpole entre deux points d'âge connus", () => {
    const dayZero = getPercentileWeightGrams(0, "male", 50);
    const daySeven = getPercentileWeightGrams(7, "male", 50);
    const dayThree = getPercentileWeightGrams(3, "male", 50);
    expect(dayZero).not.toBeNull();
    expect(daySeven).not.toBeNull();
    expect(dayThree).not.toBeNull();
    expect(dayThree as number).toBeGreaterThan(dayZero as number);
    expect(dayThree as number).toBeLessThan(daySeven as number);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/lib/growth-charts/who-weight-for-age.spec.ts`
Expected: FAIL — `Cannot find module './who-weight-for-age'`.

- [ ] **Step 4: Write the implementation**

```ts
// src/lib/growth-charts/who-weight-for-age.ts
import whoData from "./who-weight-for-age.json";

export const WHO_PERCENTILES = [3, 15, 50, 85, 97] as const;
export type WhoPercentile = (typeof WHO_PERCENTILES)[number];

type LmsRow = { ageDays: number; L: number; M: number; S: number };

// Quantiles normaux standard correspondant à chaque percentile utilisé.
const Z_SCORES: Record<WhoPercentile, number> = {
  3: -1.8808,
  15: -1.0364,
  50: 0,
  85: 1.0364,
  97: 1.8808,
};

const findSurroundingRows = (
  rows: LmsRow[],
  ageDays: number,
): [LmsRow, LmsRow] | null => {
  if (ageDays < rows[0].ageDays || ageDays > rows[rows.length - 1].ageDays) {
    return null;
  }
  for (let i = 0; i < rows.length - 1; i++) {
    if (ageDays >= rows[i].ageDays && ageDays <= rows[i + 1].ageDays) {
      return [rows[i], rows[i + 1]];
    }
  }
  return null;
};

const interpolateLms = (a: LmsRow, b: LmsRow, ageDays: number): LmsRow => {
  if (a.ageDays === b.ageDays) return a;
  const t = (ageDays - a.ageDays) / (b.ageDays - a.ageDays);
  return {
    ageDays,
    L: a.L + (b.L - a.L) * t,
    M: a.M + (b.M - a.M) * t,
    S: a.S + (b.S - a.S) * t,
  };
};

/**
 * Formule LMS standard OMS : X_p = M * (1 + L*S*Z_p)^(1/L), ou M * exp(S*Z_p) si L = 0.
 */
const lmsToWeightKg = (lms: LmsRow, z: number): number =>
  lms.L === 0 ? lms.M * Math.exp(lms.S * z) : lms.M * Math.pow(1 + lms.L * lms.S * z, 1 / lms.L);

export const getPercentileWeightGrams = (
  ageInDays: number,
  sex: "female" | "male",
  percentile: WhoPercentile,
): number | null => {
  const rows = whoData[sex] as LmsRow[];
  const surrounding = findSurroundingRows(rows, ageInDays);
  if (!surrounding) return null;

  const lms = interpolateLms(surrounding[0], surrounding[1], ageInDays);
  const weightKg = lmsToWeightKg(lms, Z_SCORES[percentile]);
  return Math.round(weightKg * 1000);
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/lib/growth-charts/who-weight-for-age.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/growth-charts/
git commit -m "feat: ajoute les données de référence OMS et le calcul de percentile poids"
```

---

### Task 5: `WeightChart` component

**Files:**
- Create: `src/components/growth-charts/weight-chart.tsx`
- Test: `src/components/growth-charts/weight-chart.spec.tsx`

**Interfaces:**
- Consumes: `getPercentileWeightGrams`, `WHO_PERCENTILES` (Task 4); `WeightMeasurement` type (Task 2).
- Produces: `<WeightChart measurements={WeightMeasurement[]} birthDate={string} sex={"female" | "male"} />` — consumed by Task 7 (client detail page) and Task 10 (CRM panel).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/growth-charts/weight-chart.spec.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightChart } from "./weight-chart";

describe("WeightChart", () => {
  it("affiche un message si aucune pesée n'est enregistrée", () => {
    render(
      <WeightChart measurements={[]} birthDate="2025-01-01" sex="female" />,
    );
    expect(
      screen.getByText(/pas de pesée enregistrée/i),
    ).toBeInTheDocument();
  });

  it("affiche la mention de non-diagnostic quand des pesées existent", () => {
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
    expect(
      screen.getByText(/ne remplacent pas un avis médical/i),
    ).toBeInTheDocument();
  });
});
```

Check first whether `@testing-library/react` is already a dev dependency (`grep testing-library package.json`); if absent, add it with `pnpm add -D @testing-library/react @testing-library/jest-dom jsdom` and set `environment: "jsdom"` for this test file via a `// @vitest-environment jsdom` comment at the top of the spec file (repo's default `vitest.config.ts` environment is `"node"`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/growth-charts/weight-chart.spec.tsx`
Expected: FAIL — `Cannot find module './weight-chart'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/growth-charts/weight-chart.tsx
"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getPercentileWeightGrams,
  WHO_PERCENTILES,
} from "@/lib/growth-charts/who-weight-for-age";
import type { WeightMeasurement } from "@/types/database";

type ChartPoint = {
  ageDays: number;
  measured: number | null;
  source: "home" | "consultation" | null;
  p3: number | null;
  p15: number | null;
  p50: number | null;
  p85: number | null;
  p97: number | null;
};

const ageDaysBetween = (birthDate: string, measuredAt: string): number =>
  Math.round(
    (new Date(measuredAt).getTime() - new Date(birthDate).getTime()) /
      (24 * 60 * 60 * 1000),
  );

const buildChartData = (
  measurements: WeightMeasurement[],
  birthDate: string,
  sex: "female" | "male",
): ChartPoint[] => {
  const measurementPoints: ChartPoint[] = measurements.map((m) => {
    const ageDays = ageDaysBetween(birthDate, m.measured_at);
    return {
      ageDays,
      measured: m.weight_grams,
      source: m.source,
      p3: getPercentileWeightGrams(ageDays, sex, 3),
      p15: getPercentileWeightGrams(ageDays, sex, 15),
      p50: getPercentileWeightGrams(ageDays, sex, 50),
      p85: getPercentileWeightGrams(ageDays, sex, 85),
      p97: getPercentileWeightGrams(ageDays, sex, 97),
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
      p3: getPercentileWeightGrams(ageDays, sex, 3),
      p15: getPercentileWeightGrams(ageDays, sex, 15),
      p50: getPercentileWeightGrams(ageDays, sex, 50),
      p85: getPercentileWeightGrams(ageDays, sex, 85),
      p97: getPercentileWeightGrams(ageDays, sex, 97),
    });
  }

  return [...measurementPoints, ...backgroundPoints].sort(
    (a, b) => a.ageDays - b.ageDays,
  );
};

export const WeightChart = ({
  measurements,
  birthDate,
  sex,
}: {
  measurements: WeightMeasurement[];
  birthDate: string;
  sex: "female" | "male";
}) => {
  if (measurements.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Pas de pesée enregistrée pour le moment.
      </p>
    );
  }

  const data = buildChartData(measurements, birthDate, sex);

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="ageDays"
            tickFormatter={(days: number) => `${Math.round(days / 30)} m`}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            type="number"
          />
          <YAxis
            tickFormatter={(g: number) => `${(g / 1000).toFixed(1)} kg`}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            width={70}
          />
          <Tooltip
            labelFormatter={(days: number) => `${Math.round(days / 30)} mois`}
            formatter={(value: number, name: string) => [
              `${(value / 1000).toFixed(2)} kg`,
              name,
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
          />
          {WHO_PERCENTILES.map((p) => (
            <Area
              key={p}
              dataKey={`p${p}`}
              stroke="none"
              fill="#9ca3af"
              fillOpacity={p === 50 ? 0 : 0.08}
              connectNulls
              name={`P${p}`}
              isAnimationActive={false}
            />
          ))}
          <Line
            dataKey="measured"
            stroke="#a0283e"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
            name="Poids de l'enfant"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-muted-foreground">
        Ces courbes sont indicatives et ne remplacent pas un avis médical.
      </p>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/growth-charts/weight-chart.spec.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/growth-charts/
git commit -m "feat: ajoute le composant de courbe de poids avec bandes de percentile OMS"
```

---

### Task 6: Navigation entry — "Mes enfants" tab

**Files:**
- Modify: `src/config/navigation.ts`
- Modify: `src/config/navigation-icons.tsx`

**Interfaces:**
- Consumes: `clientNav` array shape (existing), `navIconMap` (existing).
- Produces: nav entry available to `ClientSpaceTabs` (existing component, no change needed).

- [ ] **Step 1: Add the icon**

In `src/config/navigation-icons.tsx`, add `Baby` to the `lucide-react` import and to `navIconMap`:

```tsx
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  Users,
  UserCog,
  ClipboardList,
  Mail,
  Zap,
  BarChart3,
  Settings,
  CreditCard,
  Megaphone,
  FileText,
  Video,
  Link2,
  Baby,
  type LucideIcon,
} from "lucide-react";

export const navIconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  Users,
  UserCog,
  ClipboardList,
  Mail,
  Zap,
  BarChart3,
  Settings,
  CreditCard,
  Megaphone,
  FileText,
  Video,
  Link: Link2,
  Baby,
};
```

- [ ] **Step 2: Add the nav entry**

In `src/config/navigation.ts`, add to `clientNav` (right after "Mes accompagnements"):

```ts
export const clientNav: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/espace-client",
    iconKey: "LayoutDashboard",
  },
  {
    title: "Mes accompagnements",
    href: "/espace-client/accompagnements",
    iconKey: "BookOpen",
  },
  {
    title: "Mes enfants",
    href: "/espace-client/enfants",
    iconKey: "Baby",
  },
  {
    title: "Mes réservations",
    href: "/espace-client/reservations",
    iconKey: "CalendarDays",
  },
  {
    title: "Mes factures",
    href: "/espace-client/factures",
    iconKey: "FileText",
  },
  { title: "Mon profil", href: "/espace-client/profil", iconKey: "Settings" },
];
```

- [ ] **Step 3: Verify manually**

Run: `pnpm dev`, log in as a client, open `/espace-client` — confirm the "Mes enfants" tab renders with the baby icon (the route itself 404s until Task 7 lands; that's expected at this step).

- [ ] **Step 4: Commit**

```bash
git add src/config/navigation.ts src/config/navigation-icons.tsx
git commit -m "feat: ajoute l'onglet Mes enfants à la navigation espace-client"
```

---

### Task 7: Espace-client pages — list/create and detail/chart

**Files:**
- Create: `src/app/(public)/espace-client/enfants/page.tsx`
- Create: `src/app/(public)/espace-client/enfants/_components/child-form.tsx`
- Create: `src/app/(public)/espace-client/enfants/[childId]/page.tsx`
- Create: `src/app/(public)/espace-client/enfants/[childId]/_components/weight-form.tsx`

**Interfaces:**
- Consumes: `listMyChildren`, `createChild`, `deleteChild`, `listWeightMeasurements`, `addWeightMeasurement`, `deleteWeightMeasurement` (Task 3); `WeightChart` (Task 5); `Child`, `WeightMeasurement` types (Task 2).
- Produces: routes `/espace-client/enfants` and `/espace-client/enfants/[childId]`.

- [ ] **Step 1: Write the children list/create page**

```tsx
// src/app/(public)/espace-client/enfants/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Baby } from "lucide-react";
import { differenceInMonths } from "date-fns";
import { listMyChildren } from "./actions";
import { ChildForm } from "./_components/child-form";

export const metadata: Metadata = {
  title: "Mes enfants",
};

const MyChildrenPage = async () => {
  const children = await listMyChildren();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Mes enfants
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Suivez le poids de vos enfants au fil des consultations.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {children.map((child) => (
          <Link key={child.id} href={`/espace-client/enfants/${child.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3 py-4">
                <Baby className="h-8 w-8 text-primary-green" />
                <div>
                  <p className="font-medium">{child.first_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {differenceInMonths(new Date(), new Date(child.birth_date))}{" "}
                    mois
                    {child.is_premature ? " · né prématurément" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <ChildForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default MyChildrenPage;
```

- [ ] **Step 2: Write the `ChildForm` client component**

```tsx
// src/app/(public)/espace-client/enfants/_components/child-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createChild } from "../actions";

export const ChildForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"female" | "male">("female");
  const [isPremature, setIsPremature] = useState(false);
  const [gestationalWeeks, setGestationalWeeks] = useState("");

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createChild({
        first_name: firstName,
        birth_date: birthDate,
        sex,
        is_premature: isPremature,
        gestational_age_weeks: isPremature
          ? Number(gestationalWeeks)
          : undefined,
      });
      if (result.success) {
        toast.success("Enfant ajouté");
        setFirstName("");
        setBirthDate("");
        setIsPremature(false);
        setGestationalWeeks("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="font-medium">Ajouter un enfant</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="child-first-name">Prénom</Label>
          <Input
            id="child-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="child-birth-date">Date de naissance</Label>
          <Input
            id="child-birth-date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="child-sex">Sexe</Label>
          <select
            id="child-sex"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={sex}
            onChange={(e) => setSex(e.target.value as "female" | "male")}
          >
            <option value="female">Fille</option>
            <option value="male">Garçon</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            id="child-premature"
            checked={isPremature}
            onCheckedChange={(checked) => setIsPremature(checked === true)}
          />
          <Label htmlFor="child-premature">Né prématurément</Label>
        </div>
        {isPremature && (
          <div>
            <Label htmlFor="child-gestational-weeks">
              Semaines de grossesse à la naissance
            </Label>
            <Input
              id="child-gestational-weeks"
              type="number"
              value={gestationalWeeks}
              onChange={(e) => setGestationalWeeks(e.target.value)}
            />
          </div>
        )}
      </div>
      <Button onClick={handleSubmit} disabled={isPending}>
        Ajouter
      </Button>
    </div>
  );
};
```

- [ ] **Step 3: Write the child detail page**

```tsx
// src/app/(public)/espace-client/enfants/[childId]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { WeightChart } from "@/components/growth-charts/weight-chart";
import { listMyChildren, listWeightMeasurements } from "../actions";
import { WeightForm } from "./_components/weight-form";

export const metadata: Metadata = {
  title: "Suivi de poids",
};

const ChildDetailPage = async ({
  params,
}: {
  params: Promise<{ childId: string }>;
}) => {
  const { childId } = await params;
  const [children, measurements] = await Promise.all([
    listMyChildren(),
    listWeightMeasurements(childId),
  ]);

  const child = children.find((c) => c.id === childId);
  if (!child) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        {child.first_name}
      </h1>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <WeightChart
            measurements={measurements}
            birthDate={child.birth_date}
            sex={child.sex}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <WeightForm childId={child.id} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ChildDetailPage;
```

- [ ] **Step 4: Write the `WeightForm` client component**

```tsx
// src/app/(public)/espace-client/enfants/[childId]/_components/weight-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addWeightMeasurement } from "../../actions";

export const WeightForm = ({ childId }: { childId: string }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [weightKg, setWeightKg] = useState("");
  const [measuredAt, setMeasuredAt] = useState("");

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await addWeightMeasurement({
        child_id: childId,
        weight_grams: Math.round(Number(weightKg) * 1000),
        measured_at: measuredAt,
        source: "home",
      });
      if (result.success) {
        toast.success("Pesée ajoutée");
        setWeightKg("");
        setMeasuredAt("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="font-medium">Ajouter une pesée</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="weight-kg">Poids (kg)</Label>
          <Input
            id="weight-kg"
            type="number"
            step="0.01"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="weight-date">Date de la pesée</Label>
          <Input
            id="weight-date"
            type="date"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={isPending}>
        Ajouter
      </Button>
    </div>
  );
};
```

- [ ] **Step 5: Verify manually**

Run: `pnpm dev`, log in as a client, go to `/espace-client/enfants`, create a child, open its detail page, add a weight measurement, confirm the chart renders with the percentile bands and the new point.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/espace-client/enfants/"
git commit -m "feat: pages espace-client pour la liste des enfants et le suivi de poids"
```

---

### Task 8: CRM consultant Server Actions — children access

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.ts`
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts`

**Interfaces:**
- Consumes: `requireConsultant()` (existing, same file); `weightMeasurementSchema` (Task 2); `Child`, `WeightMeasurement` types (Task 2).
- Produces: `getChildrenForContact(clientId: string): Promise<Child[]>`, `addWeightMeasurementAsConsultant(input: unknown): Promise<ActionResult<{ id: string }>>` — consumed by Task 9 (CRM UI panel).

- [ ] **Step 1: Write the failing test**

Append to `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts` (check the file's existing mock setup first — it already mocks `getSessionUser` and `createAdminClient`; extend the same `vi.mock("@/lib/supabase/admin", ...)` fluent-chain mock to cover `.select().eq().eq()` for `bookings` and `.select().eq().order()` for `children`):

```ts
import { getChildrenForContact } from "./actions";

describe("getChildrenForContact", () => {
  it("retourne un tableau vide si le consultant n'a aucun rendez-vous avec ce client", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "consultant-1",
      email: "c@b.fr",
      roles: ["consultant"],
    });
    // le mock de createAdminClient doit faire retourner data: [] pour la
    // requête bookings.eq("client_id", ...).eq("consultant_id", ...)
    const result = await getChildrenForContact("client-1");
    expect(result).toEqual([]);
  });
});
```

Because this test needs the file's existing hoisted mock structure, the implementer must read `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts` in full first and extend its existing `createAdminClient` mock table-by-table switch (it already branches on `table` — add branches for `"bookings"` and `"children"`) rather than replacing it.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/app/\(dashboard\)/espace-consultante/crm/actions.spec.ts`
Expected: FAIL — `getChildrenForContact is not exported`.

- [ ] **Step 3: Add the implementation to `actions.ts`**

Add near `getContactDetail`, reusing the same "verify relationship, then query" shape:

```ts
export const getChildrenForContact = async (
  clientId: string,
): Promise<Child[]> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data: bookingLink } = await supabase
    .from("bookings")
    .select("id")
    .eq("client_id", clientId)
    .eq("consultant_id", user.id)
    .limit(1);

  if (!bookingLink || bookingLink.length === 0) {
    return [];
  }

  const { data } = await supabase
    .from("children")
    .select("*")
    .eq("client_id", clientId)
    .order("birth_date", { ascending: false });

  return data ?? [];
};

export const addWeightMeasurementAsConsultant = async (
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireConsultant();
  const parsed = weightMeasurementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: child } = await supabase
    .from("children")
    .select("id, client_id")
    .eq("id", parsed.data.child_id)
    .single();
  if (!child) {
    return { success: false, error: "Enfant introuvable" };
  }

  const { data: bookingLink } = await supabase
    .from("bookings")
    .select("id")
    .eq("client_id", child.client_id)
    .eq("consultant_id", user.id)
    .limit(1);
  if (!bookingLink || bookingLink.length === 0) {
    return { success: false, error: "Aucune relation avec ce client" };
  }

  const { data: measurement, error } = await supabase
    .from("weight_measurements")
    .insert({
      child_id: parsed.data.child_id,
      weight_grams: parsed.data.weight_grams,
      measured_at: parsed.data.measured_at,
      source: "consultation",
      recorded_by: user.id,
      consultant_id: user.id,
    })
    .select("id")
    .single();

  if (error || !measurement) {
    return { success: false, error: "Erreur lors de l'ajout de la pesée" };
  }

  revalidatePath(`/espace-consultante/crm/${child.client_id}`);
  return { success: true, data: measurement };
};
```

Add the two new imports at the top of the file:

```ts
import { weightMeasurementSchema } from "@/validations/children";
import type { Child } from "@/types/database";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/app/\(dashboard\)/espace-consultante/crm/actions.spec.ts`
Expected: PASS (all existing tests plus the new one).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/crm/actions.ts" "src/app/(dashboard)/espace-consultante/crm/actions.spec.ts"
git commit -m "feat: server actions CRM pour consulter les enfants et ajouter une pesée en consultation"
```

---

### Task 9: CRM UI — "Enfants" panel on the contact detail page

**Files:**
- Create: `src/app/(dashboard)/espace-consultante/crm/_components/children-panel.tsx`
- Modify: `src/app/(dashboard)/espace-consultante/crm/[clientId]/page.tsx`

**Interfaces:**
- Consumes: `getChildrenForContact`, `addWeightMeasurementAsConsultant` (Task 8); `WeightChart` (Task 5); `Child` type (Task 2).
- Produces: `<ChildrenPanel clientId={string} children={Child[]} />` rendered on the contact detail page.

- [ ] **Step 1: Write `ChildrenPanel`**

```tsx
// src/app/(dashboard)/espace-consultante/crm/_components/children-panel.tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { differenceInMonths } from "date-fns";
import { WeightChart } from "@/components/growth-charts/weight-chart";
import { addWeightMeasurementAsConsultant } from "../actions";
import type { Child, WeightMeasurement } from "@/types/database";

export const ChildrenPanel = ({
  children,
  measurementsByChild,
}: {
  children: Child[];
  measurementsByChild: Record<string, WeightMeasurement[]>;
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    children[0]?.id ?? null,
  );
  const [weightKg, setWeightKg] = useState("");
  const [measuredAt, setMeasuredAt] = useState("");
  const [isPending, startTransition] = useTransition();

  if (children.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ce client n&apos;a renseigné aucun enfant.
      </p>
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const handleAddMeasurement = () => {
    if (!selectedChildId) return;
    startTransition(async () => {
      const result = await addWeightMeasurementAsConsultant({
        child_id: selectedChildId,
        weight_grams: Math.round(Number(weightKg) * 1000),
        measured_at: measuredAt,
        source: "consultation",
      });
      if (result.success) {
        toast.success("Pesée ajoutée");
        setWeightKg("");
        setMeasuredAt("");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {children.map((child) => (
          <Button
            key={child.id}
            variant={child.id === selectedChildId ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedChildId(child.id)}
          >
            {child.first_name} ·{" "}
            {differenceInMonths(new Date(), new Date(child.birth_date))} mois
          </Button>
        ))}
      </div>

      {selectedChild && (
        <>
          <WeightChart
            measurements={measurementsByChild[selectedChild.id] ?? []}
            birthDate={selectedChild.birth_date}
            sex={selectedChild.sex}
          />
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="crm-weight-kg">Poids (kg)</Label>
              <Input
                id="crm-weight-kg"
                type="number"
                step="0.01"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="crm-weight-date">Date</Label>
              <Input
                id="crm-weight-date"
                type="date"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
              />
            </div>
            <Button onClick={handleAddMeasurement} disabled={isPending}>
              Ajouter la pesée
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Wire it into the contact detail page**

In `src/app/(dashboard)/espace-consultante/crm/[clientId]/page.tsx`, add the import:

```tsx
import { Baby } from "lucide-react";
import { getChildrenForContact } from "../../crm/actions";
import { ChildrenPanel } from "../../crm/_components/children-panel";
import { createAdminClient } from "@/lib/supabase/admin";
```

Fetch children and their measurements alongside the existing `Promise.all`:

```tsx
const [contact, allTags, children] = await Promise.all([
  getContactDetail(clientId),
  getTags(),
  getChildrenForContact(clientId),
]);

if (!contact) notFound();

const supabase = createAdminClient();
const measurementsByChild: Record<string, WeightMeasurement[]> = {};
if (children.length > 0) {
  const { data: allMeasurements } = await supabase
    .from("weight_measurements")
    .select("*")
    .in("child_id", children.map((c) => c.id))
    .order("measured_at", { ascending: true });
  for (const child of children) {
    measurementsByChild[child.id] = (allMeasurements ?? []).filter(
      (m) => m.child_id === child.id,
    );
  }
}
```

Add the import `import type { WeightMeasurement } from "@/types/database";` and add a new `<Card>` block after the Notes card:

```tsx
{/* Enfants */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-primary-green">
      <Baby className="h-5 w-5" />
      Enfants ({children.length})
    </CardTitle>
  </CardHeader>
  <CardContent>
    <ChildrenPanel children={children} measurementsByChild={measurementsByChild} />
  </CardContent>
</Card>
```

- [ ] **Step 3: Verify manually**

Run: `pnpm dev`, log in as the consultant, open a contact with at least one booking and at least one child (create one via the client-space flow from Task 7 first), confirm the "Enfants" card shows the child, the chart, and that adding a consultation weight measurement updates the chart after a page refresh.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/crm/_components/children-panel.tsx" "src/app/(dashboard)/espace-consultante/crm/[clientId]/page.tsx"
git commit -m "feat: affiche le panneau Enfants et la courbe de poids dans la fiche client CRM"
```

---

### Task 10: Privacy policy update

**Files:**
- Modify: `src/app/(public)/politique-de-confidentialite/page.tsx`

**Interfaces:**
- Consumes: none.
- Produces: none (content-only change).

- [ ] **Step 1: Read the current data-categories section**

Read the file in full first to match its existing structure and tone (list of data categories already collected, e.g. identity, booking, payment data) before adding a new entry — do not restructure the page, only add one item.

- [ ] **Step 2: Add a data category entry for children's health data**

Add a new list item (matching the existing markup pattern used for other data categories on the page) stating, in substance: "Si vous renseignez un ou plusieurs enfants dans votre espace client (prénom, date de naissance, sexe, pesées), ces données de santé sont utilisées exclusivement pour le suivi de l'allaitement avec votre consultante et ne sont jamais partagées avec un tiers. Vous pouvez les supprimer à tout moment depuis votre espace client."

- [ ] **Step 3: Verify manually**

Run: `pnpm dev`, open `/politique-de-confidentialite`, confirm the new paragraph renders correctly and reads consistently with the rest of the page.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/politique-de-confidentialite/page.tsx"
git commit -m "docs: mentionne les données de santé enfant dans la politique de confidentialité"
```

---

## Self-review notes

- **Spec coverage**: sections 1–6 of the design doc are each covered — data model (Task 1), consent gate (Task 3), client UI (Tasks 6–7), CRM UI (Tasks 8–9), chart/OMS data (Tasks 4–5). The out-of-scope list (section 6) is respected: no alerts, no corrected age in the percentile calc, no PDF export, no new role.
- **RLS correction vs. initial design doc**: the design doc's table used `parent_id`; this plan uses `client_id` to match the repo's existing naming convention (`bookings.client_id`, `crm_notes.client_id`) — same field, renamed for consistency, not a scope change.
- **Consultant access model correction**: the design doc assumed a `crm_notes`-style RLS pattern for consultant access; codebase research (Task 8) showed the real pattern is an app-code relationship check via `bookings`, since `children` carries no `consultant_id`. This plan follows the verified pattern instead of the design doc's assumption.
- **Type consistency check**: `Child`/`WeightMeasurement` (Task 2) are used with identical field names in Tasks 3, 4, 5, 8, 9 — `sex: "female" | "male"`, `source: "home" | "consultation"` match throughout.

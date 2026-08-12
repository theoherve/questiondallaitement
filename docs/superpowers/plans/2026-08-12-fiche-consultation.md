# Fiche de consultation structurée légère — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the consultant open a lightweight structured consultation note (motif/antécédents/observation/conclusion) from a booking, attach it to a child or to "consultation parent seule", save it as a draft, and publish it so the client can read it (read-only) from their client space.

**Architecture:** One new Postgres table (`consultation_notes`), owned by the booking (`booking_id UNIQUE`), following this repo's Server Actions + `createAdminClient()` (service-role, RLS bypassed in app code, RLS kept as browser-client backstop) pattern — same shape as `children`/`weight_measurements` (`supabase/migrations/00094_children_weight_measurements.sql`). Every consultant-side action re-verifies that the booking belongs to the requesting consultant by querying `bookings` directly; no action accepts a parameter that represents an authorization result already computed by the caller (see `docs/superpowers/specs/2026-08-12-fiche-consultation-design.md`, section "Server actions", and the project memory on this exact risk). The client-side read action takes no `clientId` parameter at all — it scopes strictly to `auth.uid()`.

**Tech Stack:** Next.js Server Actions, Supabase (Postgres + RLS), Zod v4, Vitest, shadcn/ui, lucide-react, date-fns.

## Global Constraints

- Test file naming: `*.spec.ts`/`*.spec.tsx`, colocated next to the file under test.
- All mutations are Server Actions (`"use server"` files), never API routes, never client-side Supabase writes.
- All Server Actions use `createAdminClient()` (`src/lib/supabase/admin.ts`); RLS on `consultation_notes` is a backstop for the client-side read path, not the primary authorization mechanism for consultant-side actions.
- **No exported server action may accept a parameter that represents an authorization check already performed by the caller** (e.g. a `bookingBelongsToConsultant: boolean` flag). Every consultant-side action re-derives booking ownership itself, from `bookingId` alone, exactly as `getFamilyDossierForContact` re-derives the consultant/client relationship from `clientId` alone (`src/app/(dashboard)/espace-consultante/crm/actions.ts:438`).
- Validation via Zod v4 schemas in `src/validations/<domain>.ts`, following the exact style of `src/validations/children.ts`.
- Mutations return `ActionResult<T>` (`src/types/index.ts`), never throw for expected validation/business errors.
- Out of scope per the design doc: Initiale/Suivi distinction, detailed clinical fields (chirurgie mammaire by incision type, EPDS, detailed mother/newborn exam), webcam photo upload, transmission letter, version history/traçabilité, locking after publication.
- French copy throughout the UI, matching the tone of existing CRM/client-space pages (see `src/app/(dashboard)/espace-consultante/crm/[clientId]/page.tsx` and `src/app/(public)/espace-client/enfants/page.tsx`).

---

### Task 1: Migration — `consultation_notes` table

**Files:**
- Create: `supabase/migrations/00095_consultation_notes.sql`

**Interfaces:**
- Consumes: none.
- Produces: table `consultation_notes(id, booking_id, client_id, consultant_id, child_id, motif, antecedents_medicaux, antecedents_medicaux_detail, antecedents_chirurgicaux, antecedents_chirurgicaux_detail, allergies, allergies_detail, traitements_en_cours, traitements_en_cours_detail, observation, conclusion, notes_internes, status, published_at, created_at, updated_at)` — consumed by Task 2 onward.

- [ ] **Step 1: Write the migration file**

```sql
-- Fiche de consultation structurée légère (motif/antécédents/observation/conclusion),
-- rattachée à un booking et à un enfant (ou "consultation parent seule" si child_id est NULL).
CREATE TABLE consultation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,

  motif TEXT NOT NULL DEFAULT '',

  antecedents_medicaux BOOLEAN NOT NULL DEFAULT false,
  antecedents_medicaux_detail TEXT,
  antecedents_chirurgicaux BOOLEAN NOT NULL DEFAULT false,
  antecedents_chirurgicaux_detail TEXT,
  allergies BOOLEAN NOT NULL DEFAULT false,
  allergies_detail TEXT,
  traitements_en_cours BOOLEAN NOT NULL DEFAULT false,
  traitements_en_cours_detail TEXT,

  observation TEXT NOT NULL DEFAULT '',
  conclusion TEXT NOT NULL DEFAULT '',

  notes_internes TEXT,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultation_notes_client ON consultation_notes(client_id);
CREATE INDEX idx_consultation_notes_child ON consultation_notes(child_id);

CREATE TRIGGER consultation_notes_updated_at
  BEFORE UPDATE ON consultation_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;

-- Le client ne lit jamais une fiche en brouillon, ni les colonnes internes
-- via une policy à part : notes_internes reste exclu au niveau de la query
-- côté action (jamais un SELECT *), la policy ne porte que sur les lignes.
CREATE POLICY consultation_notes_select_own_published ON consultation_notes
  FOR SELECT USING (client_id = auth.uid() AND status = 'published');

CREATE POLICY consultation_notes_select_admin ON consultation_notes
  FOR SELECT USING (is_admin());

-- Aucune policy d'écriture pour le client : toutes les écritures passent par
-- le service role (server actions consultante), qui contourne RLS. La
-- policy de lecture ci-dessus est le seul filet de sécurité pour le client.
```

Motif/observation/conclusion default to `''` (not `NOT NULL` without default) so that `upsertConsultationNote` can create a row before every required field is filled in (the fiche is saved as a draft incrementally); the "non vide" requirement is enforced in application code by `publishConsultationNote` (Task 3), not by a DB constraint — this mirrors the design doc's explicit choice to keep publication validation in the action layer.

- [ ] **Step 2: Apply the migration locally**

Run: `supabase db reset` (or the project's usual local migration command — check `package.json` for a `db:reset`/`db:push` script first and prefer that).
Expected: migration `00095_consultation_notes.sql` applies with no error; `consultation_notes` visible via `supabase db diff` or the Supabase Studio table list, with RLS enabled and the two `SELECT` policies present.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00095_consultation_notes.sql
git commit -m "feat(db): ajoute la table consultation_notes"
```

---

### Task 2: Types and Zod validation schema

**Files:**
- Modify: `src/types/database.ts` (add `ConsultationNote` type near `WeightMeasurement`)
- Create: `src/validations/consultation-notes.ts`
- Test: `src/validations/consultation-notes.spec.ts`

**Interfaces:**
- Consumes: none.
- Produces: `ConsultationNote` type (`src/types/database.ts`); `consultationNoteFieldsSchema` and inferred `ConsultationNoteFieldsInput` type (`src/validations/consultation-notes.ts`) — used by Tasks 3, 4, 5, 6.

- [ ] **Step 1: Add the domain type**

In `src/types/database.ts`, right after the `WeightMeasurement` type block, add:

```ts
export type ConsultationNoteStatus = "draft" | "published";

export type ConsultationNote = {
  id: string;
  booking_id: string;
  client_id: string;
  consultant_id: string;
  child_id: string | null;
  motif: string;
  antecedents_medicaux: boolean;
  antecedents_medicaux_detail: string | null;
  antecedents_chirurgicaux: boolean;
  antecedents_chirurgicaux_detail: string | null;
  allergies: boolean;
  allergies_detail: string | null;
  traitements_en_cours: boolean;
  traitements_en_cours_detail: string | null;
  observation: string;
  conclusion: string;
  notes_internes: string | null;
  status: ConsultationNoteStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Vue publique d'une fiche : jamais de notes_internes, jamais de brouillon. */
export type PublishedConsultationNote = Omit<
  ConsultationNote,
  "notes_internes" | "consultant_id"
>;
```

- [ ] **Step 2: Write the failing validation test**

```ts
// src/validations/consultation-notes.spec.ts
import { describe, it, expect } from "vitest";
import { consultationNoteFieldsSchema } from "./consultation-notes";

describe("consultationNoteFieldsSchema", () => {
  const base = {
    child_id: null,
    motif: "Douleur à la tétée",
    antecedents_medicaux: false,
    antecedents_medicaux_detail: null,
    antecedents_chirurgicaux: false,
    antecedents_chirurgicaux_detail: null,
    allergies: false,
    allergies_detail: null,
    traitements_en_cours: false,
    traitements_en_cours_detail: null,
    observation: "Mise au sein observée, prise superficielle",
    conclusion: "À revoir dans une semaine",
    notes_internes: null,
  };

  it("accepte une fiche valide sans enfant (consultation parent seule)", () => {
    const result = consultationNoteFieldsSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("accepte une fiche valide rattachée à un enfant", () => {
    const result = consultationNoteFieldsSchema.safeParse({
      ...base,
      child_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepte des champs vides (sauvegarde en brouillon)", () => {
    const result = consultationNoteFieldsSchema.safeParse({
      ...base,
      motif: "",
      observation: "",
      conclusion: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un child_id qui n'est pas un UUID", () => {
    const result = consultationNoteFieldsSchema.safeParse({
      ...base,
      child_id: "pas-un-uuid",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/validations/consultation-notes.spec.ts`
Expected: FAIL — `Cannot find module './consultation-notes'`.

- [ ] **Step 4: Write the schema implementation**

```ts
// src/validations/consultation-notes.ts
import { z } from "zod/v4";

/**
 * Validation des champs saisis par la consultante. Volontairement permissive
 * sur les textes (une fiche se sauvegarde en brouillon même incomplète) — le
 * garde-fou "champs obligatoires non vides" ne s'applique qu'à la
 * publication, côté server action (voir publishConsultationNote).
 */
export const consultationNoteFieldsSchema = z.object({
  child_id: z.string().uuid("Enfant invalide").nullable(),
  motif: z.string().max(4000, "Maximum 4000 caractères"),
  antecedents_medicaux: z.boolean(),
  antecedents_medicaux_detail: z.string().max(2000).nullable(),
  antecedents_chirurgicaux: z.boolean(),
  antecedents_chirurgicaux_detail: z.string().max(2000).nullable(),
  allergies: z.boolean(),
  allergies_detail: z.string().max(2000).nullable(),
  traitements_en_cours: z.boolean(),
  traitements_en_cours_detail: z.string().max(2000).nullable(),
  observation: z.string().max(8000, "Maximum 8000 caractères"),
  conclusion: z.string().max(4000, "Maximum 4000 caractères"),
  notes_internes: z.string().max(4000).nullable(),
});

export type ConsultationNoteFieldsInput = z.infer<
  typeof consultationNoteFieldsSchema
>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/validations/consultation-notes.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/types/database.ts src/validations/consultation-notes.ts src/validations/consultation-notes.spec.ts
git commit -m "feat: ajoute type et schéma de validation pour la fiche de consultation"
```

---

### Task 3: CRM Server Actions — read, upsert, publish, unpublish

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.ts`
- Modify: `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts`

**Interfaces:**
- Consumes: `requireConsultant()` (existing, same file); `consultationNoteFieldsSchema`, `ConsultationNoteFieldsInput` (Task 2); `ConsultationNote` type (Task 2).
- Produces: `getConsultationNoteForBooking(bookingId: string): Promise<ConsultationNote | null>`, `upsertConsultationNote(bookingId: string, fields: unknown): Promise<ActionResult<{ id: string }>>`, `publishConsultationNote(bookingId: string): Promise<ActionResult>`, `unpublishConsultationNote(bookingId: string): Promise<ActionResult>`, `getConsultationNotesForFamilyDossier(clientId: string): Promise<ConsultationNote[]>` — consumed by Task 4 (CRM UI).

- [ ] **Step 1: Read the existing mock in full**

Open `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts` and read it end to end before writing anything. It hoists a table-based `createAdminClient` mock (`vi.mock("@/lib/supabase/admin", ...)`) with a `switch`-like `if (table === ...)` structure per table, plus a `thenableWith(value, extra)` helper that makes a mock query chain both directly awaitable and further chainable (used today for the `"children"` branch to support both `.eq().order()` and `.eq().single()` from the same first `.eq()` call). This task extends that same mock — do not replace it, and do not create a second competing mock.

- [ ] **Step 2: Write the failing tests**

Append to `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts`, inside the existing `vi.hoisted` block that declares `mockChildrenData`, `mockChildSingleData`, etc., add two more hoisted mock holders (edit the existing `vi.hoisted(() => ({ ... }))` call, don't add a second one):

```ts
mockBookingSingleData: {
  data: null as { id: string; client_id: string; consultant_id: string } | null,
},
mockConsultationNoteSingleData: {
  data: null as Record<string, unknown> | null,
},
mockConsultationNotesListData: { data: [] as unknown[] },
upsertCalls: [] as { table: string; data: unknown; onConflict?: string }[],
updateCalls: [] as { table: string; data: unknown }[],
```

Destructure these four new names (`mockBookingSingleData`, `mockConsultationNoteSingleData`, `mockConsultationNotesListData`, `upsertCalls`, `updateCalls`) out of the same `vi.hoisted` return value in the `const { ... } = vi.hoisted(...)` line above it, alongside the existing destructured names.

In the `createAdminClient` mock's `from(table)` switch, replace the existing `if (table === "bookings") { ... }` branch with this version, which keeps the existing two-`eq()`-then-`not()`-then-`limit()` chain (used by `hasClientRelationship`) working exactly as before, and adds a `.single()` branch off the *first* `eq()` for the new booking-ownership lookup:

```ts
if (table === "bookings") {
  return {
    select: () => ({
      eq: () =>
        thenableWith(mockBookingsData, {
          eq: () => ({
            not: (column: string, operator: string, value: unknown) => {
              bookingsNotCalls.push({ column, operator, value });
              return { limit: () => Promise.resolve(mockBookingsData) };
            },
          }),
          single: () => Promise.resolve(mockBookingSingleData),
        }),
    }),
  };
}
```

Add a new branch for `"consultation_notes"` right after the `"weight_measurements"` branch:

```ts
if (table === "consultation_notes") {
  return {
    select: () => ({
      eq: () =>
        thenableWith(mockConsultationNotesListData, {
          single: () => Promise.resolve(mockConsultationNoteSingleData),
          order: () => Promise.resolve(mockConsultationNotesListData),
        }),
    }),
    upsert: (data: unknown, options?: { onConflict?: string }) => {
      upsertCalls.push({ table, data, onConflict: options?.onConflict });
      return {
        select: () => ({
          single: () =>
            Promise.resolve({ data: { id: "note-1" }, error: null }),
        }),
      };
    },
    update: (data: unknown) => {
      updateCalls.push({ table, data });
      return { eq: () => Promise.resolve({ error: null }) };
    },
  };
}
```

In the `resetMocks` helper, add resets for the four new mock holders:

```ts
mockBookingSingleData.data = null;
mockConsultationNoteSingleData.data = null;
mockConsultationNotesListData.data = [];
upsertCalls.length = 0;
updateCalls.length = 0;
```

Add the import and the new `describe` blocks at the end of the file:

```ts
import {
  getConsultationNoteForBooking,
  upsertConsultationNote,
  publishConsultationNote,
  unpublishConsultationNote,
  getConsultationNotesForFamilyDossier,
} from "./actions";

describe("getConsultationNoteForBooking", () => {
  beforeEach(resetMocks);

  it("retourne null si le booking n'appartient pas à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "autre-consultante",
    };

    const result = await getConsultationNoteForBooking("booking-1");

    expect(result).toBeNull();
  });

  it("retourne null si aucune fiche n'existe encore pour ce booking", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };
    mockConsultationNoteSingleData.data = null;

    const result = await getConsultationNoteForBooking("booking-1");

    expect(result).toBeNull();
  });

  it("retourne la fiche quand le booking appartient à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };
    mockConsultationNoteSingleData.data = {
      id: "note-1",
      booking_id: "booking-1",
      status: "draft",
    };

    const result = await getConsultationNoteForBooking("booking-1");

    expect(result).toMatchObject({ id: "note-1", status: "draft" });
  });
});

describe("upsertConsultationNote", () => {
  beforeEach(resetMocks);

  const validFields = {
    child_id: null,
    motif: "Douleur à la tétée",
    antecedents_medicaux: false,
    antecedents_medicaux_detail: null,
    antecedents_chirurgicaux: false,
    antecedents_chirurgicaux_detail: null,
    allergies: false,
    allergies_detail: null,
    traitements_en_cours: false,
    traitements_en_cours_detail: null,
    observation: "",
    conclusion: "",
    notes_internes: null,
  };

  it("refuse si le booking n'appartient pas à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "autre-consultante",
    };

    const result = await upsertConsultationNote("booking-1", validFields);

    expect(result.success).toBe(false);
    expect(upsertCalls).toHaveLength(0);
  });

  it("upsert sur booking_id quand le booking appartient à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };

    const result = await upsertConsultationNote("booking-1", validFields);

    expect(result.success).toBe(true);
    expect(upsertCalls.at(-1)).toMatchObject({
      table: "consultation_notes",
      data: {
        booking_id: "booking-1",
        client_id: "client-1",
        consultant_id: "consultant-1",
        motif: "Douleur à la tétée",
      },
      onConflict: "booking_id",
    });
  });

  it("rejette une entrée invalide avant tout accès base", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };

    const result = await upsertConsultationNote("booking-1", {
      ...validFields,
      child_id: "pas-un-uuid",
    });

    expect(result.success).toBe(false);
    expect(upsertCalls).toHaveLength(0);
  });
});

describe("publishConsultationNote", () => {
  beforeEach(resetMocks);

  it("refuse si le booking n'appartient pas à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "autre-consultante",
    };

    const result = await publishConsultationNote("booking-1");

    expect(result.success).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it("refuse si motif, observation ou conclusion est vide", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };
    mockConsultationNoteSingleData.data = {
      id: "note-1",
      motif: "Douleur",
      observation: "",
      conclusion: "À revoir",
    };

    const result = await publishConsultationNote("booking-1");

    expect(result.success).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it("publie la fiche quand tous les champs obligatoires sont remplis", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };
    mockConsultationNoteSingleData.data = {
      id: "note-1",
      motif: "Douleur",
      observation: "Observation détaillée",
      conclusion: "À revoir",
    };

    const result = await publishConsultationNote("booking-1");

    expect(result.success).toBe(true);
    expect(updateCalls.at(-1)).toMatchObject({
      table: "consultation_notes",
      data: { status: "published" },
    });
  });
});

describe("unpublishConsultationNote", () => {
  beforeEach(resetMocks);

  it("refuse si le booking n'appartient pas à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "autre-consultante",
    };

    const result = await unpublishConsultationNote("booking-1");

    expect(result.success).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it("repasse la fiche en brouillon", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };

    const result = await unpublishConsultationNote("booking-1");

    expect(result.success).toBe(true);
    expect(updateCalls.at(-1)).toMatchObject({
      table: "consultation_notes",
      data: { status: "draft" },
    });
  });
});

describe("getConsultationNotesForFamilyDossier", () => {
  beforeEach(resetMocks);

  it("ne renvoie rien si le consultant n'a aucune relation avec ce client", async () => {
    asConsultant();
    mockConsultationNotesListData.data = [{ id: "note-1" }];

    const result = await getConsultationNotesForFamilyDossier("client-1");

    expect(result).toEqual([]);
  });

  it("retourne les fiches du client quand une relation existe", async () => {
    asConsultant();
    mockBookingsData.data = [{ id: "booking-1" }];
    mockConsultationNotesListData.data = [{ id: "note-1" }];

    const result = await getConsultationNotesForFamilyDossier("client-1");

    expect(result).toEqual([{ id: "note-1" }]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test src/app/\(dashboard\)/espace-consultante/crm/actions.spec.ts`
Expected: FAIL — the five new functions are not exported yet.

- [ ] **Step 4: Add the implementation to `actions.ts`**

Add the import at the top of the file, alongside the existing imports:

```ts
import {
  consultationNoteFieldsSchema,
  type ConsultationNoteFieldsInput,
} from "@/validations/consultation-notes";
import type { ConsultationNote } from "@/types/database";
```

Add the actions near `getFamilyDossierForContact`, reusing its "verify ownership from the ID alone, never trust a caller-supplied flag" shape:

```ts
/**
 * Vérifie que le booking appartient bien à la consultante courante et
 * retourne sa fiche (client_id, consultant_id) — jamais un paramètre
 * "déjà vérifié" fourni par l'appelant, comme pour hasClientRelationship.
 */
const getOwnedBooking = async (
  supabase: ReturnType<typeof createAdminClient>,
  consultantId: string,
  bookingId: string,
): Promise<{ id: string; client_id: string; consultant_id: string } | null> => {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, client_id, consultant_id")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.consultant_id !== consultantId) return null;
  return booking;
};

export const getConsultationNoteForBooking = async (
  bookingId: string,
): Promise<ConsultationNote | null> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const booking = await getOwnedBooking(supabase, user.id, bookingId);
  if (!booking) return null;

  const { data } = await supabase
    .from("consultation_notes")
    .select("*")
    .eq("booking_id", bookingId)
    .single();

  return (data as ConsultationNote | null) ?? null;
};

export const upsertConsultationNote = async (
  bookingId: string,
  fields: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const booking = await getOwnedBooking(supabase, user.id, bookingId);
  if (!booking) {
    return { success: false, error: "Aucune relation avec ce rendez-vous" };
  }

  const parsed = consultationNoteFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { data: note, error } = await supabase
    .from("consultation_notes")
    .upsert(
      {
        booking_id: bookingId,
        client_id: booking.client_id,
        consultant_id: user.id,
        ...(parsed.data as ConsultationNoteFieldsInput),
      },
      { onConflict: "booking_id" },
    )
    .select("id")
    .single();

  if (error || !note) {
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }

  revalidatePath(`/espace-consultante/reservations/${bookingId}`);
  return { success: true, data: note };
};

export const publishConsultationNote = async (
  bookingId: string,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const booking = await getOwnedBooking(supabase, user.id, bookingId);
  if (!booking) {
    return { success: false, error: "Aucune relation avec ce rendez-vous" };
  }

  const { data: note } = await supabase
    .from("consultation_notes")
    .select("motif, observation, conclusion")
    .eq("booking_id", bookingId)
    .single();

  if (!note || !note.motif.trim() || !note.observation.trim() || !note.conclusion.trim()) {
    return {
      success: false,
      error: "Le motif, l'observation et la conclusion doivent être renseignés avant publication",
    };
  }

  const { error } = await supabase
    .from("consultation_notes")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("booking_id", bookingId);

  if (error) {
    return { success: false, error: "Erreur lors de la publication" };
  }

  revalidatePath(`/espace-consultante/reservations/${bookingId}`);
  return { success: true };
};

export const unpublishConsultationNote = async (
  bookingId: string,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const booking = await getOwnedBooking(supabase, user.id, bookingId);
  if (!booking) {
    return { success: false, error: "Aucune relation avec ce rendez-vous" };
  }

  const { error } = await supabase
    .from("consultation_notes")
    .update({ status: "draft" })
    .eq("booking_id", bookingId);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath(`/espace-consultante/reservations/${bookingId}`);
  return { success: true };
};

/**
 * Panneau "consultations précédentes" du dossier famille : une seule
 * vérification de relation consultante/client, comme getFamilyDossierForContact.
 */
export const getConsultationNotesForFamilyDossier = async (
  clientId: string,
): Promise<ConsultationNote[]> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  if (!(await hasClientRelationship(supabase, user.id, clientId))) {
    return [];
  }

  const { data } = await supabase
    .from("consultation_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return (data as ConsultationNote[] | null) ?? [];
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/app/\(dashboard\)/espace-consultante/crm/actions.spec.ts`
Expected: PASS (all existing tests plus the 12 new ones).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/crm/actions.ts" "src/app/(dashboard)/espace-consultante/crm/actions.spec.ts"
git commit -m "feat: server actions CRM pour la fiche de consultation (lecture, upsert, publication)"
```

---

### Task 4: CRM UI — consultation note form on the booking detail page

**Files:**
- Create: `src/app/(dashboard)/espace-consultante/reservations/[id]/_components/consultation-note-form.tsx`
- Create: `src/app/(dashboard)/espace-consultante/reservations/[id]/_components/previous-notes-panel.tsx`
- Modify: `src/app/(dashboard)/espace-consultante/reservations/[id]/page.tsx`

**Interfaces:**
- Consumes: `getConsultationNoteForBooking`, `upsertConsultationNote`, `publishConsultationNote`, `unpublishConsultationNote`, `getConsultationNotesForFamilyDossier` (Task 3); `getFamilyDossierForContact` (existing, `src/app/(dashboard)/espace-consultante/crm/actions.ts:438`); `ConsultationNote`, `Child` types (Task 2 / existing).
- Produces: `<ConsultationNoteForm bookingId={string} initialNote={ConsultationNote | null} children={Child[]} />`, `<PreviousNotesPanel notes={ConsultationNote[]} currentBookingId={string} />`, both rendered on the booking detail page.

- [ ] **Step 1: Write `ConsultationNoteForm`**

```tsx
// src/app/(dashboard)/espace-consultante/reservations/[id]/_components/consultation-note-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  upsertConsultationNote,
  publishConsultationNote,
  unpublishConsultationNote,
} from "../../../crm/actions";
import type { Child, ConsultationNote } from "@/types/database";

type AntecedentKey =
  | "antecedents_medicaux"
  | "antecedents_chirurgicaux"
  | "allergies"
  | "traitements_en_cours";

const ANTECEDENT_LABELS: Record<AntecedentKey, string> = {
  antecedents_medicaux: "Antécédents médicaux",
  antecedents_chirurgicaux: "Antécédents chirurgicaux",
  allergies: "Allergies",
  traitements_en_cours: "Traitements en cours",
};

export const ConsultationNoteForm = ({
  bookingId,
  initialNote,
  children,
}: {
  bookingId: string;
  initialNote: ConsultationNote | null;
  children: Child[];
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [childId, setChildId] = useState<string | null>(
    initialNote?.child_id ?? null,
  );
  const [motif, setMotif] = useState(initialNote?.motif ?? "");
  const [observation, setObservation] = useState(
    initialNote?.observation ?? "",
  );
  const [conclusion, setConclusion] = useState(initialNote?.conclusion ?? "");
  const [notesInternes, setNotesInternes] = useState(
    initialNote?.notes_internes ?? "",
  );
  const [antecedents, setAntecedents] = useState<Record<AntecedentKey, boolean>>({
    antecedents_medicaux: initialNote?.antecedents_medicaux ?? false,
    antecedents_chirurgicaux: initialNote?.antecedents_chirurgicaux ?? false,
    allergies: initialNote?.allergies ?? false,
    traitements_en_cours: initialNote?.traitements_en_cours ?? false,
  });
  const [antecedentDetails, setAntecedentDetails] = useState<
    Record<AntecedentKey, string>
  >({
    antecedents_medicaux: initialNote?.antecedents_medicaux_detail ?? "",
    antecedents_chirurgicaux:
      initialNote?.antecedents_chirurgicaux_detail ?? "",
    allergies: initialNote?.allergies_detail ?? "",
    traitements_en_cours: initialNote?.traitements_en_cours_detail ?? "",
  });

  const status = initialNote?.status ?? "draft";

  const buildFields = () => ({
    child_id: childId,
    motif,
    antecedents_medicaux: antecedents.antecedents_medicaux,
    antecedents_medicaux_detail: antecedentDetails.antecedents_medicaux || null,
    antecedents_chirurgicaux: antecedents.antecedents_chirurgicaux,
    antecedents_chirurgicaux_detail:
      antecedentDetails.antecedents_chirurgicaux || null,
    allergies: antecedents.allergies,
    allergies_detail: antecedentDetails.allergies || null,
    traitements_en_cours: antecedents.traitements_en_cours,
    traitements_en_cours_detail:
      antecedentDetails.traitements_en_cours || null,
    observation,
    conclusion,
    notes_internes: notesInternes || null,
  });

  const handleSave = () => {
    startTransition(async () => {
      const result = await upsertConsultationNote(bookingId, buildFields());
      if (result.success) {
        toast.success("Fiche enregistrée");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      const saveResult = await upsertConsultationNote(bookingId, buildFields());
      if (!saveResult.success) {
        toast.error(saveResult.error);
        return;
      }
      const publishResult = await publishConsultationNote(bookingId);
      if (publishResult.success) {
        toast.success("Fiche publiée, la patiente peut la consulter");
        router.refresh();
      } else {
        toast.error(publishResult.error);
      }
    });
  };

  const handleUnpublish = () => {
    startTransition(async () => {
      const result = await unpublishConsultationNote(bookingId);
      if (result.success) {
        toast.success("Fiche repassée en brouillon");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Badge variant={status === "published" ? "default" : "secondary"}>
          {status === "published" ? "Publiée" : "Brouillon"}
        </Badge>
      </div>

      <div>
        <Label htmlFor="note-child">Enfant concerné</Label>
        <select
          id="note-child"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={childId ?? ""}
          onChange={(e) => setChildId(e.target.value || null)}
        >
          <option value="">Consultation parent seule</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.first_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="note-motif">Motif</Label>
        <Textarea
          id="note-motif"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Antécédents</Label>
        {(Object.keys(ANTECEDENT_LABELS) as AntecedentKey[]).map((key) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`note-${key}`}
                checked={antecedents[key]}
                onCheckedChange={(checked) =>
                  setAntecedents((prev) => ({ ...prev, [key]: checked === true }))
                }
              />
              <Label htmlFor={`note-${key}`}>{ANTECEDENT_LABELS[key]}</Label>
            </div>
            {antecedents[key] && (
              <Textarea
                value={antecedentDetails[key]}
                onChange={(e) =>
                  setAntecedentDetails((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
                placeholder="Détail"
                rows={2}
              />
            )}
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="note-observation">Observation</Label>
        <Textarea
          id="note-observation"
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="note-conclusion">Conclusion</Label>
        <Textarea
          id="note-conclusion"
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="note-internal">
          Notes internes (jamais visibles de la patiente)
        </Label>
        <Textarea
          id="note-internal"
          value={notesInternes}
          onChange={(e) => setNotesInternes(e.target.value)}
          rows={3}
          className="border-dashed"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={isPending} variant="outline">
          Enregistrer
        </Button>
        {status === "draft" ? (
          <Button onClick={handlePublish} disabled={isPending}>
            Publier
          </Button>
        ) : (
          <Button onClick={handleUnpublish} disabled={isPending} variant="outline">
            Repasser en brouillon
          </Button>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write `PreviousNotesPanel`**

```tsx
// src/app/(dashboard)/espace-consultante/reservations/[id]/_components/previous-notes-panel.tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ConsultationNote } from "@/types/database";

export const PreviousNotesPanel = ({
  notes,
  currentBookingId,
}: {
  notes: ConsultationNote[];
  currentBookingId: string;
}) => {
  const otherNotes = notes.filter((n) => n.booking_id !== currentBookingId);

  if (otherNotes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune autre fiche de consultation pour ce client.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {otherNotes.map((note) => (
        <li key={note.id}>
          <Link
            href={`/espace-consultante/reservations/${note.booking_id}`}
            className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
          >
            <span className="line-clamp-1">{note.motif || "(motif non renseigné)"}</span>
            <span className="ml-3 flex shrink-0 items-center gap-2 text-muted-foreground">
              {format(new Date(note.created_at), "d MMM yyyy", { locale: fr })}
              <Badge variant={note.status === "published" ? "default" : "secondary"}>
                {note.status === "published" ? "Publiée" : "Brouillon"}
              </Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
```

- [ ] **Step 3: Wire both into the booking detail page**

In `src/app/(dashboard)/espace-consultante/reservations/[id]/page.tsx`, add the imports:

```tsx
import {
  getConsultationNoteForBooking,
  getConsultationNotesForFamilyDossier,
  getFamilyDossierForContact,
} from "../../crm/actions";
import { ConsultationNoteForm } from "./_components/consultation-note-form";
import { PreviousNotesPanel } from "./_components/previous-notes-panel";
```

After the existing `if (!booking) notFound();` line, fetch the three additional pieces of data in parallel:

```tsx
const [consultationNote, familyDossier, previousNotes] = await Promise.all([
  getConsultationNoteForBooking(booking.id),
  getFamilyDossierForContact(booking.client_id),
  getConsultationNotesForFamilyDossier(booking.client_id),
]);
```

Add a new `<Card>` block right after the "Motif & notes" card and before the "Paiement" card:

```tsx
{/* Fiche de consultation */}
<Card>
  <CardHeader>
    <CardTitle className="font-serif text-lg">
      Fiche de consultation
    </CardTitle>
  </CardHeader>
  <CardContent>
    <ConsultationNoteForm
      bookingId={booking.id}
      initialNote={consultationNote}
      children={familyDossier.children}
    />
  </CardContent>
</Card>

{/* Consultations précédentes */}
<Card>
  <CardHeader>
    <CardTitle className="font-serif text-lg">
      Consultations précédentes
    </CardTitle>
  </CardHeader>
  <CardContent>
    <PreviousNotesPanel notes={previousNotes} currentBookingId={booking.id} />
  </CardContent>
</Card>
```

- [ ] **Step 4: Verify manually**

Run: `pnpm dev`, log in as the consultant, open `/espace-consultante/reservations`, click into a past booking, confirm the "Fiche de consultation" card renders, fill motif/observation/conclusion, click "Enregistrer" (stays in brouillon), then "Publier" (badge switches to "Publiée"), then "Repasser en brouillon". Confirm a second booking for the same client shows the first one under "Consultations précédentes".

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/reservations/[id]/"
git commit -m "feat: affiche la fiche de consultation et les consultations précédentes sur la réservation"
```

---

### Task 5: Client-side Server Action — published notes for the current client

**Files:**
- Create: `src/app/(public)/espace-client/consultations/actions.ts`
- Test: `src/app/(public)/espace-client/consultations/actions.spec.ts`

**Interfaces:**
- Consumes: `getSupabaseAndUser` (`src/lib/supabase/server-auth.ts`); `PublishedConsultationNote` type (Task 2).
- Produces: `getMyPublishedConsultationNotes(): Promise<PublishedConsultationNote[]>` — consumed by Task 6 (client UI).

- [ ] **Step 1: Write the failing test**

```ts
// src/app/(public)/espace-client/consultations/actions.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSupabaseAndUser, selectCalls } = vi.hoisted(() => ({
  mockGetSupabaseAndUser: vi.fn(),
  selectCalls: [] as { table: string; columns: string }[],
}));

vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: mockGetSupabaseAndUser,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: (columns: string) => {
        selectCalls.push({ table, columns });
        return {
          eq: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [{ id: "note-1", status: "published" }],
                  error: null,
                }),
            }),
          }),
        };
      },
    }),
  }),
}));

import { getMyPublishedConsultationNotes } from "./actions";

describe("getMyPublishedConsultationNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCalls.length = 0;
  });

  it("scope la requête au client courant, sans paramètre clientId", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });

    const result = await getMyPublishedConsultationNotes();

    expect(result).toEqual([{ id: "note-1", status: "published" }]);
  });

  it("ne sélectionne jamais la colonne notes_internes", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });

    await getMyPublishedConsultationNotes();

    const call = selectCalls.at(-1);
    expect(call?.columns).not.toContain("notes_internes");
    expect(call?.columns).not.toBe("*");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/app/\(public\)/espace-client/consultations/actions.spec.ts`
Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/(public)/espace-client/consultations/actions.ts
"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import type { PublishedConsultationNote } from "@/types/database";

const PUBLIC_COLUMNS =
  "id, booking_id, client_id, child_id, motif, antecedents_medicaux, antecedents_medicaux_detail, antecedents_chirurgicaux, antecedents_chirurgicaux_detail, allergies, allergies_detail, traitements_en_cours, traitements_en_cours_detail, observation, conclusion, status, published_at, created_at, updated_at";

/**
 * Ne prend aucun paramètre : le seul filtre est auth.uid() côté serveur, rien
 * à falsifier depuis l'appelant. Sélectionne explicitement les colonnes
 * publiques — notes_internes n'est jamais chargé, pas juste caché en JS.
 */
export const getMyPublishedConsultationNotes = async (): Promise<
  PublishedConsultationNote[]
> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data } = await supabase
    .from("consultation_notes")
    .select(PUBLIC_COLUMNS)
    .eq("client_id", user.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return (data as PublishedConsultationNote[] | null) ?? [];
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/app/\(public\)/espace-client/consultations/actions.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/espace-client/consultations/actions.ts" "src/app/(public)/espace-client/consultations/actions.spec.ts"
git commit -m "feat: server action espace-client pour lire les fiches de consultation publiées"
```

---

### Task 6: Client-side UI — "Mes consultations" page and nav entry

**Files:**
- Create: `src/app/(public)/espace-client/consultations/page.tsx`
- Modify: `src/config/navigation.ts`

**Interfaces:**
- Consumes: `getMyPublishedConsultationNotes` (Task 5); `PublishedConsultationNote` type (Task 2); `clientNav` array shape (existing), `ClipboardList` icon key (already registered in `src/config/navigation-icons.tsx` — no icon change needed).
- Produces: route `/espace-client/consultations`.

- [ ] **Step 1: Write the page**

```tsx
// src/app/(public)/espace-client/consultations/page.tsx
import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getMyPublishedConsultationNotes } from "./actions";

export const metadata: Metadata = {
  title: "Mes consultations",
};

const ANTECEDENT_LABELS = {
  antecedents_medicaux: "Antécédents médicaux",
  antecedents_chirurgicaux: "Antécédents chirurgicaux",
  allergies: "Allergies",
  traitements_en_cours: "Traitements en cours",
} as const;

const MyConsultationsPage = async () => {
  const notes = await getMyPublishedConsultationNotes();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Mes consultations
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Les comptes-rendus de vos consultations, une fois partagés par votre consultante.
      </p>

      {notes.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Aucune fiche de consultation n&apos;a encore été partagée.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="space-y-3 pt-6">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(note.created_at), "d MMMM yyyy", {
                    locale: fr,
                  })}
                </p>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Motif
                  </p>
                  <p className="text-sm">{note.motif}</p>
                </div>
                {(Object.keys(ANTECEDENT_LABELS) as Array<keyof typeof ANTECEDENT_LABELS>)
                  .filter((key) => note[key])
                  .map((key) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-muted-foreground">
                        {ANTECEDENT_LABELS[key]}
                      </p>
                      <p className="text-sm">
                        {note[`${key}_detail` as keyof typeof note] || "—"}
                      </p>
                    </div>
                  ))}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Observation
                  </p>
                  <p className="text-sm">{note.observation}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Conclusion
                  </p>
                  <p className="text-sm">{note.conclusion}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyConsultationsPage;
```

- [ ] **Step 2: Add the nav entry**

In `src/config/navigation.ts`, add to `clientNav`, right after "Mes enfants":

```ts
{
  title: "Mes enfants",
  href: "/espace-client/enfants",
  iconKey: "Baby",
},
{
  title: "Mes consultations",
  href: "/espace-client/consultations",
  iconKey: "ClipboardList",
},
```

- [ ] **Step 3: Verify manually**

Run: `pnpm dev`, log in as a client whose consultant has published at least one fiche (create one via Task 4's flow first), open `/espace-client/consultations`, confirm the published fiche renders with motif/antécédents cochés/observation/conclusion, and confirm no "notes internes" content ever appears on this page regardless of what was typed in that field in the CRM.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/espace-client/consultations/page.tsx" src/config/navigation.ts
git commit -m "feat: ajoute la page Mes consultations et son entrée de navigation côté client"
```

---

## Self-review notes

- **Spec coverage**: data model (Task 1), types/validation (Task 2), CRM actions incl. publish/unpublish/family-dossier panel (Task 3), CRM UI incl. "consultations précédentes" (Task 4), client-side read action scoped to `auth.uid()` with no `notes_internes` (Task 5), client-side UI + nav (Task 6). Out-of-scope items from the design doc (Initiale/Suivi split, detailed clinical fields, webcam, transmission letter, version history, post-publish locking) are not implemented anywhere in this plan.
- **Authorization pattern check**: every consultant-side action in Task 3 (`getConsultationNoteForBooking`, `upsertConsultationNote`, `publishConsultationNote`, `unpublishConsultationNote`) re-derives booking ownership from `bookingId` alone via the private `getOwnedBooking` helper — none accepts a boolean/flag parameter representing a precomputed authorization result, matching the project's memory on this exact risk (`server-actions-parametre-autorisation-attaquable`). `getMyPublishedConsultationNotes` (Task 5) takes zero parameters, scoping strictly to `auth.uid()`.
- **Type consistency check**: `ConsultationNote`/`PublishedConsultationNote` (Task 2) field names are used identically across Tasks 3, 4, 5, 6 — `antecedents_medicaux`/`antecedents_medicaux_detail` naming pattern repeated consistently for all four antécédent fields, `status: "draft" | "published"` matches throughout, `child_id: string | null` matches throughout.
- **Mock extension risk (Task 3)**: the existing `bookings` mock branch in `crm/actions.spec.ts` is modified, not replaced — Step 1 of Task 3 explicitly instructs reading the file in full first, and the new `single()` branch is additive to the existing `eq().eq().not().limit()` chain via the same `thenableWith` pattern already used for the `children` branch, so `hasClientRelationship`'s existing tests keep passing unchanged.
- **UI location decision vs. design doc wording**: the design doc says the fiche is opened "depuis un booking dans l'agenda" and shown "sur la fiche enfant ou la fiche mère" client-side. This repo has no per-mother profile page and no separate "agenda" module (bookings live under `espace-consultante/reservations`), so Task 4 wires the CRM form into the existing booking detail page (`reservations/[id]/page.tsx`), and Task 6 introduces a single "Mes consultations" client page listing all published fiches (including "consultation parent seule" ones) rather than splitting across a nonexistent mother page — same information, adapted to the codebase's actual structure.

# Export comptable CSV + relances impayés — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual/free invoice creation with a payment-status lifecycle (unpaid/partial/paid), manual settlement recording, a manual "relancer" trigger on overdue invoices, and a filterable CSV export of invoices + settlements — closing the gap between today's Stripe-only invoicing and Carole's real need to bill outside Stripe (transfer/check/cash) and chase payment afterwards.

**Architecture:** Extend the existing `invoices` table (nullable `payment_id`/`reference_id`/`type`, new `origin`/`payment_status`/`due_date` columns) rather than a parallel table, so manual and Stripe-issued invoices share one legally-required continuous numbering sequence. A new `invoice_settlements` table records manual payments (insert-only, RLS-scoped, trigger-maintained status). All new logic lives in `src/lib/invoicing/` (pure, tested) and `espace-consultante/facturation/actions.ts` (thin server actions), following the exact patterns already used by `correction.ts` / `resendInvoice` / `correctInvoice` in this codebase.

**Tech Stack:** Next.js App Router server actions, Supabase Postgres (RLS, SECURITY DEFINER RPC, trigger), Vitest, `@react-pdf/renderer`, shadcn/ui (`Dialog`, `Select`, `Input`, `Badge`).

## Global Constraints

- Server actions never accept a parameter that represents "an authorization check already passed" — the relation between a `clientId` and the calling consultant must be re-verified **inside** every exported action that touches client data (see `docs/superpowers/specs/2026-08-12-export-csv-relances-design.md` and project memory `server-actions-parametre-autorisation-attaquable`).
- Every new table gets RLS **enabled** in the same migration that creates it, with policies that match its actual access pattern (no "add RLS later" step).
- VAT is a flat 20% everywhere (`STANDARD_VAT_RATE` from `src/lib/invoicing/vat.ts`) — no dual regime.
- CSV cells use `;` as separator and quote-escape `"`/`;`/newline, matching `src/lib/surveys/csv.ts` exactly (French Excel reads `,` as a decimal separator).
- No FEC export, no automated relance cascade, no devis, no CA/impayés dashboard widget (§6.2's "tableau de bord" line) — explicitly out of scope per the design doc; the design doc bounds this chantier to manual invoicing + settlement tracking + CSV export + manual relance, not the full module 6 spec.

---

### Task 1: Migration — schema, RLS, trigger, RPC

**Files:**
- Create: `supabase/migrations/00099_manual_invoices_and_settlements.sql`

**Interfaces:**
- Produces: `invoices.origin` (`'stripe' | 'manual'`), `invoices.payment_status` (`'unpaid' | 'partial' | 'paid'`), `invoices.due_date` (nullable timestamptz), `invoices.payment_id`/`reference_id`/`type` now nullable. New table `invoice_settlements(id, invoice_id, method, amount_cents, paid_at, note, recorded_by, created_at)`. New RPC `create_manual_invoice(p_content JSONB) RETURNS JSONB`. New columns `consultants.billing_iban`, `consultants.billing_bic` (nullable text).

- [ ] **Step 1: Write the migration**

```sql
-- Facturation manuelle + suivi de reglement (module 6 backlog Lacteo).
--
-- Une facture manuelle (virement/cheque/especes attendu) n'a ni paiement
-- Stripe ni reference a un booking/formation/event : payment_id, reference_id
-- et type deviennent nullables. `origin` distingue les deux provenances sans
-- toucher a l'enum payment_type (PostgreSQL interdit d'utiliser une valeur
-- d'enum tout juste ajoutee dans la meme transaction qui l'a creee, et chaque
-- fichier de migration ici s'execute comme une seule transaction).

ALTER TABLE invoices
  ALTER COLUMN payment_id DROP NOT NULL,
  ALTER COLUMN reference_id DROP NOT NULL,
  ALTER COLUMN type DROP NOT NULL,
  ADD COLUMN origin TEXT NOT NULL DEFAULT 'stripe'
    CHECK (origin IN ('stripe', 'manual')),
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  ADD COLUMN due_date TIMESTAMPTZ;

-- Une facture Stripe est payee des l'emission (le paiement l'a precedee) :
-- corrige le defaut pour les lignes existantes et toutes les futures
-- factures automatiques, create_invoice fixera explicitement 'paid' aussi.
UPDATE invoices SET payment_status = 'paid' WHERE origin = 'stripe';

CREATE TABLE invoice_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  method TEXT NOT NULL CHECK (method IN ('cash', 'check', 'transfer')),
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  paid_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_settlements_invoice ON invoice_settlements(invoice_id);

ALTER TABLE invoice_settlements ENABLE ROW LEVEL SECURITY;

-- Lecture : la consultante proprietaire de la facture, ou l'admin. Pas de
-- policy INSERT/UPDATE/DELETE cote client : l'ecriture ne passe que par le
-- service role (server action recordSettlement), et un reglement mal saisi
-- se corrige par un reglement complementaire, jamais par une modification
-- silencieuse de l'historique financier.
CREATE POLICY invoice_settlements_select_consultant ON invoice_settlements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_settlements.invoice_id
        AND invoices.consultant_id = auth.uid()
    )
  );

CREATE POLICY invoice_settlements_select_admin ON invoice_settlements
  FOR SELECT USING (is_admin());

-- Recalcule le statut de reglement de la facture a chaque reglement saisi.
CREATE OR REPLACE FUNCTION recompute_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_settled INT;
  v_ttc INT;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_settled
  FROM invoice_settlements WHERE invoice_id = NEW.invoice_id;

  SELECT amount_ttc_cents INTO v_ttc
  FROM invoices WHERE id = NEW.invoice_id;

  UPDATE invoices
  SET payment_status = CASE
    WHEN v_total_settled >= v_ttc THEN 'paid'
    WHEN v_total_settled > 0 THEN 'partial'
    ELSE 'unpaid'
  END
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER invoice_settlements_recompute_status
  AFTER INSERT ON invoice_settlements
  FOR EACH ROW
  EXECUTE FUNCTION recompute_invoice_payment_status();

-- Coordonnees pour un reglement par virement, affichees sur la facture
-- manuelle en attente. En clair : elles sont de toute facon imprimees en
-- clair sur le PDF envoye a la cliente, chiffrer la colonne ne protegerait
-- rien de reel.
ALTER TABLE consultants
  ADD COLUMN billing_iban TEXT,
  ADD COLUMN billing_bic TEXT;

/**
 * Emet une facture manuelle (hors paiement Stripe). Meme mecanique de
 * numerotation que create_invoice (00054) : sequence verrouillee par
 * (consultant_id, annee, mois), pour garantir la continuite legale entre
 * factures automatiques et manuelles.
 */
CREATE OR REPLACE FUNCTION create_manual_invoice(p_content JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultant_id UUID := (p_content->>'consultant_id')::UUID;
  v_now TIMESTAMPTZ := now();
  v_year INT := EXTRACT(YEAR FROM v_now);
  v_month INT := EXTRACT(MONTH FROM v_now);
  v_seq INT;
  v_number TEXT;
  v_row invoices;
BEGIN
  INSERT INTO invoice_sequences AS s (consultant_id, year, month, last_number)
  VALUES (v_consultant_id, v_year, v_month, 1)
  ON CONFLICT (consultant_id, year, month)
    DO UPDATE SET last_number = s.last_number + 1
  RETURNING s.last_number INTO v_seq;

  v_number := to_char(v_year, 'FM0000') || '-'
           || to_char(v_month, 'FM00') || '-'
           || to_char(v_seq, 'FM0000');

  INSERT INTO invoices (
    payment_id, consultant_id, client_id, type, reference_id,
    number, year, month, sequence, issued_at, due_date,
    currency, vat_rate, amount_ttc_cents, amount_ht_cents, amount_vat_cents,
    description, client_name, client_email,
    issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number,
    issuer_legal_form, status, origin, payment_status
  ) VALUES (
    NULL,
    v_consultant_id,
    (p_content->>'client_id')::UUID,
    NULL,
    NULL,
    v_number, v_year, v_month, v_seq, v_now,
    (p_content->>'due_date')::TIMESTAMPTZ,
    p_content->>'currency',
    (p_content->>'vat_rate')::NUMERIC,
    (p_content->>'amount_ttc_cents')::INT,
    (p_content->>'amount_ht_cents')::INT,
    (p_content->>'amount_vat_cents')::INT,
    p_content->>'description',
    p_content->>'client_name',
    p_content->>'client_email',
    p_content->>'issuer_legal_name',
    p_content->>'issuer_address',
    p_content->>'issuer_siren',
    p_content->>'issuer_vat_number',
    p_content->>'issuer_legal_form',
    'issued',
    'manual',
    'unpaid'
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;
```

- [ ] **Step 2: Also mark Stripe-issued invoices as paid at creation time**

Edit `supabase/migrations/00054_invoices.sql` is **not** touched (never edit an already-applied migration). Instead add this to the same new migration file, right after the `UUID NOT NULL DEFAULT` block above — it patches `create_invoice` (00054) to set `payment_status = 'paid'` and `origin = 'stripe'` explicitly for new rows, so the trigger-free path still ends up correct going forward:

```sql
CREATE OR REPLACE FUNCTION create_invoice(p_content JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID := (p_content->>'payment_id')::UUID;
  v_consultant_id UUID := (p_content->>'consultant_id')::UUID;
  v_now TIMESTAMPTZ := now();
  v_year INT := EXTRACT(YEAR FROM v_now);
  v_month INT := EXTRACT(MONTH FROM v_now);
  v_seq INT;
  v_number TEXT;
  v_row invoices;
BEGIN
  SELECT * INTO v_row FROM invoices WHERE payment_id = v_payment_id;
  IF FOUND THEN
    RETURN to_jsonb(v_row);
  END IF;

  INSERT INTO invoice_sequences AS s (consultant_id, year, month, last_number)
  VALUES (v_consultant_id, v_year, v_month, 1)
  ON CONFLICT (consultant_id, year, month)
    DO UPDATE SET last_number = s.last_number + 1
  RETURNING s.last_number INTO v_seq;

  v_number := to_char(v_year, 'FM0000') || '-'
           || to_char(v_month, 'FM00') || '-'
           || to_char(v_seq, 'FM0000');

  INSERT INTO invoices (
    payment_id, consultant_id, client_id, type, reference_id,
    number, year, month, sequence, issued_at,
    currency, vat_rate, amount_ttc_cents, amount_ht_cents, amount_vat_cents,
    description, client_name, client_email,
    issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number,
    issuer_legal_form, status, origin, payment_status
  ) VALUES (
    v_payment_id,
    v_consultant_id,
    (p_content->>'client_id')::UUID,
    (p_content->>'type')::payment_type,
    (p_content->>'reference_id')::UUID,
    v_number, v_year, v_month, v_seq, v_now,
    p_content->>'currency',
    (p_content->>'vat_rate')::NUMERIC,
    (p_content->>'amount_ttc_cents')::INT,
    (p_content->>'amount_ht_cents')::INT,
    (p_content->>'amount_vat_cents')::INT,
    p_content->>'description',
    p_content->>'client_name',
    p_content->>'client_email',
    p_content->>'issuer_legal_name',
    p_content->>'issuer_address',
    p_content->>'issuer_siren',
    p_content->>'issuer_vat_number',
    p_content->>'issuer_legal_form',
    COALESCE(p_content->>'status', 'issued'),
    'stripe',
    'paid'
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;
```

- [ ] **Step 3: Validate the migration syntax**

Run: `pnpm db:push:dry`
Expected: no error, diff shows the new columns/table/functions listed above. Do not run `pnpm db:push` yet — that applies to the live shared Supabase project (per project convention, migrations are pushed once the whole branch is reviewed, not per-task). Flag in the task's review that this migration is staged but not pushed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00099_manual_invoices_and_settlements.sql
git commit -m "feat(facturation): factures manuelles, statut de règlement, invoice_settlements"
```

---

### Task 2: Pure builder — `buildManualInvoiceContent`

**Files:**
- Create: `src/lib/invoicing/manual-invoice.ts`
- Test: `src/lib/invoicing/manual-invoice.spec.ts`

**Interfaces:**
- Consumes: `breakdownFromTTC` from `./vat` (existing).
- Produces: `buildManualInvoiceContent(input: { description: string; ttcCents: number; dueDate?: string }): { description: string; amount_ttc_cents: number; amount_ht_cents: number; amount_vat_cents: number; vat_rate: number; due_date: string | null }`, used by Task 5's `createManualInvoice` action.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { buildManualInvoiceContent } from "./manual-invoice";

describe("buildManualInvoiceContent", () => {
  it("decompose le TTC en HT + TVA a 20%", () => {
    const content = buildManualInvoiceContent({
      description: "Pack de 3 consultations",
      ttcCents: 24000,
    });
    expect(content).toEqual({
      description: "Pack de 3 consultations",
      vat_rate: 20,
      amount_ttc_cents: 24000,
      amount_ht_cents: 20000,
      amount_vat_cents: 4000,
      due_date: null,
    });
  });

  it("reprend l'echeance fournie telle quelle", () => {
    const content = buildManualInvoiceContent({
      description: "Formation sur mesure",
      ttcCents: 15000,
      dueDate: "2026-09-15T00:00:00.000Z",
    });
    expect(content.due_date).toBe("2026-09-15T00:00:00.000Z");
  });

  it("refuse une designation vide", () => {
    expect(() =>
      buildManualInvoiceContent({ description: "   ", ttcCents: 8000 }),
    ).toThrow();
  });

  it("refuse un montant nul ou negatif", () => {
    expect(() =>
      buildManualInvoiceContent({ description: "x", ttcCents: 0 }),
    ).toThrow();
    expect(() =>
      buildManualInvoiceContent({ description: "x", ttcCents: -500 }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/invoicing/manual-invoice.spec.ts`
Expected: FAIL with "Cannot find module './manual-invoice'"

- [ ] **Step 3: Write minimal implementation**

```typescript
import { breakdownFromTTC, STANDARD_VAT_RATE } from "./vat";

export type ManualInvoiceInput = {
  description: string;
  ttcCents: number;
  dueDate?: string;
};

export type ManualInvoiceContent = {
  description: string;
  vat_rate: number;
  amount_ttc_cents: number;
  amount_ht_cents: number;
  amount_vat_cents: number;
  due_date: string | null;
};

export const buildManualInvoiceContent = (
  input: ManualInvoiceInput,
): ManualInvoiceContent => {
  if (input.description.trim().length === 0) {
    throw new Error("La désignation est obligatoire.");
  }
  if (input.ttcCents <= 0) {
    throw new Error("Le montant doit être strictement positif.");
  }

  const { htCents, vatCents } = breakdownFromTTC(
    input.ttcCents,
    STANDARD_VAT_RATE,
  );

  return {
    description: input.description.trim(),
    vat_rate: STANDARD_VAT_RATE,
    amount_ttc_cents: input.ttcCents,
    amount_ht_cents: htCents,
    amount_vat_cents: vatCents,
    due_date: input.dueDate ?? null,
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/invoicing/manual-invoice.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoicing/manual-invoice.ts src/lib/invoicing/manual-invoice.spec.ts
git commit -m "feat(facturation): buildManualInvoiceContent"
```

---

### Task 3: Pure builder — CSV export

**Files:**
- Create: `src/lib/invoicing/csv-export.ts`
- Test: `src/lib/invoicing/csv-export.spec.ts`

**Interfaces:**
- Produces: `type InvoiceExportRow = { number: string; issued_at: string; document_type: string; status: string; payment_status: string; client_name: string; amount_ht_cents: number; amount_vat_cents: number; amount_ttc_cents: number; currency: string; settlements: { method: string; amount_cents: number; paid_at: string }[] }` and `buildInvoicesCsv(rows: InvoiceExportRow[]): string`, consumed by Task 7's `exportInvoicesCsv` action.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { buildInvoicesCsv, type InvoiceExportRow } from "./csv-export";

const row = (overrides: Partial<InvoiceExportRow> = {}): InvoiceExportRow => ({
  number: "2026-08-0001",
  issued_at: "2026-08-01T10:00:00.000Z",
  document_type: "invoice",
  status: "issued",
  payment_status: "paid",
  client_name: "Marie Dupont",
  amount_ht_cents: 10000,
  amount_vat_cents: 2000,
  amount_ttc_cents: 12000,
  currency: "eur",
  settlements: [],
  ...overrides,
});

describe("buildInvoicesCsv", () => {
  it("produit un en-tete et une ligne par facture, separees par point-virgule", () => {
    const csv = buildInvoicesCsv([row()]);
    const [header, line] = csv.split("\n");
    expect(header).toBe(
      "Numéro;Date d'émission;Type;Statut document;Statut règlement;Cliente;Montant HT;Montant TVA;Montant TTC;Devise;Règlements",
    );
    expect(line).toBe(
      "2026-08-0001;2026-08-01T10:00:00.000Z;invoice;issued;paid;Marie Dupont;100.00;20.00;120.00;eur;",
    );
  });

  it("resume les reglements dans une seule cellule", () => {
    const csv = buildInvoicesCsv([
      row({
        payment_status: "partial",
        settlements: [
          { method: "transfer", amount_cents: 5000, paid_at: "2026-08-05T00:00:00.000Z" },
          { method: "cash", amount_cents: 2000, paid_at: "2026-08-10T00:00:00.000Z" },
        ],
      }),
    ]);
    const [, line] = csv.split("\n");
    expect(line).toContain(
      "transfer 50.00 (2026-08-05T00:00:00.000Z) | cash 20.00 (2026-08-10T00:00:00.000Z)",
    );
  });

  it("echappe les cellules contenant un point-virgule ou des guillemets", () => {
    const csv = buildInvoicesCsv([row({ client_name: 'Dupont; "Marie"' })]);
    const [, line] = csv.split("\n");
    expect(line).toContain('"Dupont; ""Marie"""');
  });

  it("ne produit que l'en-tete pour une liste vide", () => {
    const csv = buildInvoicesCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/invoicing/csv-export.spec.ts`
Expected: FAIL with "Cannot find module './csv-export'"

- [ ] **Step 3: Write minimal implementation**

```typescript
const SEPARATOR = ";";

const escape = (value: string): string =>
  /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const centsToEuros = (cents: number): string => (cents / 100).toFixed(2);

export type InvoiceExportRow = {
  number: string;
  issued_at: string;
  document_type: string;
  status: string;
  payment_status: string;
  client_name: string;
  amount_ht_cents: number;
  amount_vat_cents: number;
  amount_ttc_cents: number;
  currency: string;
  settlements: { method: string; amount_cents: number; paid_at: string }[];
};

const HEADER = [
  "Numéro",
  "Date d'émission",
  "Type",
  "Statut document",
  "Statut règlement",
  "Cliente",
  "Montant HT",
  "Montant TVA",
  "Montant TTC",
  "Devise",
  "Règlements",
];

export const buildInvoicesCsv = (rows: InvoiceExportRow[]): string => {
  const lines = rows.map((row) => {
    const settlementsCell = row.settlements
      .map(
        (s) => `${s.method} ${centsToEuros(s.amount_cents)} (${s.paid_at})`,
      )
      .join(" | ");

    const cells = [
      row.number,
      row.issued_at,
      row.document_type,
      row.status,
      row.payment_status,
      row.client_name,
      centsToEuros(row.amount_ht_cents),
      centsToEuros(row.amount_vat_cents),
      centsToEuros(row.amount_ttc_cents),
      row.currency,
      settlementsCell,
    ];

    return cells.map(escape).join(SEPARATOR);
  });

  return [HEADER.map(escape).join(SEPARATOR), ...lines].join("\n");
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/invoicing/csv-export.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoicing/csv-export.ts src/lib/invoicing/csv-export.spec.ts
git commit -m "feat(facturation): export CSV factures + règlements"
```

---

### Task 4: Payment instructions on invoice view + PDF, billing profile IBAN/BIC type

**Files:**
- Modify: `src/lib/invoicing/billing-profile.ts`
- Modify: `src/lib/invoicing/invoice-view.ts`
- Modify: `src/lib/invoicing/invoice-view.spec.ts`
- Modify: `src/lib/invoicing/invoice-pdf.tsx`

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: `BillingProfile` gains optional `billing_iban: string | null; billing_bic: string | null` (not in `REQUIRED_BILLING_FIELDS` — a manual invoice can be issued for cash/check without IBAN). `InvoiceRecord` gains `origin?: "stripe" | "manual"`, `payment_status?: "unpaid" | "partial" | "paid"`, `due_date?: string | null`, `issuer_iban?: string | null`, `issuer_bic?: string | null`. `InvoiceView` gains optional `paymentInstructions?: { iban: string; bic: string }`, populated only when `origin === "manual" && payment_status !== "paid" && issuer_iban && issuer_bic`. Used by Task 5 (email/PDF for a freshly created manual invoice) and Task 9 (UI reads `payment_status`/`due_date` directly from the DB row, not through this view).

- [ ] **Step 1: Write the failing test (add to existing `invoice-view.spec.ts`)**

Read the existing file first, then add:

```typescript
  it("expose les instructions de virement pour une facture manuelle impayee avec IBAN", () => {
    const view = buildInvoiceView({
      ...baseRecord, // reuse whatever fixture the existing tests build from
      origin: "manual",
      payment_status: "unpaid",
      issuer_iban: "FR7630006000011234567890189",
      issuer_bic: "BNPAFRPPXXX",
    });
    expect(view.paymentInstructions).toEqual({
      iban: "FR7630006000011234567890189",
      bic: "BNPAFRPPXXX",
    });
  });

  it("n'expose pas d'instructions de virement une fois la facture payee", () => {
    const view = buildInvoiceView({
      ...baseRecord,
      origin: "manual",
      payment_status: "paid",
      issuer_iban: "FR7630006000011234567890189",
      issuer_bic: "BNPAFRPPXXX",
    });
    expect(view.paymentInstructions).toBeUndefined();
  });

  it("n'expose pas d'instructions pour une facture Stripe", () => {
    const view = buildInvoiceView({
      ...baseRecord,
      origin: "stripe",
      payment_status: "paid",
      issuer_iban: "FR7630006000011234567890189",
      issuer_bic: "BNPAFRPPXXX",
    });
    expect(view.paymentInstructions).toBeUndefined();
  });
```

If the existing spec file builds its fixture record inline per test rather than via a shared `baseRecord`, follow that file's actual existing pattern instead — read the file before writing this step so the new tests use the same fixture style as the tests already there.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/invoicing/invoice-view.spec.ts`
Expected: FAIL — `paymentInstructions` is `undefined` in the first new test (property doesn't exist yet) or a TypeScript error on the new `InvoiceRecord` fields.

- [ ] **Step 3: Extend `billing-profile.ts`**

```typescript
export type BillingProfile = {
  billing_legal_name: string | null;
  billing_address: string | null;
  billing_siren: string | null;
  billing_vat_number: string | null;
  billing_iban?: string | null;
  billing_bic?: string | null;
};
```
(`REQUIRED_BILLING_FIELDS` stays unchanged — IBAN/BIC are optional.)

- [ ] **Step 4: Extend `invoice-view.ts`**

Add to `InvoiceRecord`:
```typescript
  origin?: "stripe" | "manual";
  payment_status?: "unpaid" | "partial" | "paid";
  issuer_iban?: string | null;
  issuer_bic?: string | null;
```

Add to `InvoiceView`:
```typescript
  paymentInstructions?: { iban: string; bic: string };
```

In `buildInvoiceView`, add after the existing `discount` spread:
```typescript
  ...(record.origin === "manual" &&
  record.payment_status !== "paid" &&
  record.issuer_iban &&
  record.issuer_bic
    ? { paymentInstructions: { iban: record.issuer_iban, bic: record.issuer_bic } }
    : {}),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/lib/invoicing/invoice-view.spec.ts`
Expected: PASS, including all pre-existing tests in the file.

- [ ] **Step 6: Add the payment instructions block to the PDF**

In `invoice-pdf.tsx`, add a style and a conditional block right after the `totals` `View` and before the closing `legal` `Text`:

```typescript
  paymentInstructions: {
    marginTop: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#cccccc",
  },
```
(add to the `StyleSheet.create` object)

```tsx
      {view.paymentInstructions && (
        <View style={s.paymentInstructions}>
          <Text style={s.label}>Règlement par virement</Text>
          <Text>IBAN : {view.paymentInstructions.iban}</Text>
          <Text>BIC : {view.paymentInstructions.bic}</Text>
        </View>
      )}
```
(insert right before `<Text style={s.legal}>`)

There is no existing spec for `invoice-pdf.tsx` (PDF rendering isn't unit-tested in this codebase — `renderInvoicePdf` is exercised indirectly through `sendInvoiceEmail`); do not add one, follow the existing convention.

- [ ] **Step 7: Commit**

```bash
git add src/lib/invoicing/billing-profile.ts src/lib/invoicing/invoice-view.ts src/lib/invoicing/invoice-view.spec.ts src/lib/invoicing/invoice-pdf.tsx
git commit -m "feat(facturation): instructions de virement sur la facture manuelle en attente"
```

---

### Task 5: Server action — `createManualInvoice`

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/facturation/actions.ts`
- Create: `src/app/(dashboard)/espace-consultante/facturation/actions.spec.ts`

**Interfaces:**
- Consumes: `buildManualInvoiceContent` (Task 2), `sendInvoiceEmail` (existing).
- Produces: `createManualInvoice(input: { clientId: string; description: string; ttcCents: number; dueDate?: string }): Promise<ActionResult<{ invoiceId: string }>>`, private helper `hasClientRelationship(supabase, consultantId, clientId): Promise<boolean>` (not exported — same shape as the one in `crm/actions.ts`, duplicated here rather than imported since it isn't exported from that module and this file has its own `getSupabaseAndUser`-based auth pattern, not `requireConsultant`).

- [ ] **Step 1: Write the failing test**

This is the first spec file for this actions module — read `src/app/(dashboard)/espace-consultante/crm/actions.spec.ts` first to copy its exact mocking pattern (`vi.mock("@/lib/supabase/server-auth", ...)`, chainable query builder mock) before writing this file, since `facturation/actions.ts` uses `getSupabaseAndUser` (not `requireConsultant`/`createAdminClient` directly imported at call sites).

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createManualInvoice } from "./actions";

const mockGetSupabaseAndUser = vi.fn();
vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: () => mockGetSupabaseAndUser(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/invoicing/send-invoice-email", () => ({
  sendInvoiceEmail: vi.fn().mockResolvedValue(undefined),
}));

const CONSULTANT_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_CLIENT_ID = "33333333-3333-3333-3333-333333333333";

type Table = { name: string; data: unknown[] | null };

const buildSupabase = (tables: Record<string, unknown[]>) => {
  const from = (name: string) => {
    const rows = tables[name] ?? [];
    const query = {
      select: () => query,
      eq: () => query,
      not: () => query,
      limit: () => Promise.resolve({ data: rows }),
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null }),
      single: () => Promise.resolve({ data: rows[0] ?? null }),
      update: () => query,
      rpc: undefined,
    };
    return query;
  };
  return {
    from,
    rpc: vi.fn().mockResolvedValue({
      data: {
        id: "invoice-1",
        number: "2026-08-0001",
        client_email: "marie@example.com",
        client_name: "Marie Dupont",
      },
      error: null,
    }),
  };
};

describe("createManualInvoice", () => {
  beforeEach(() => {
    mockGetSupabaseAndUser.mockReset();
  });

  it("refuse un client sans relation avec la consultante", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildSupabase({ bookings: [], accompagnements: [] }),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: OTHER_CLIENT_ID,
      description: "Pack de consultations",
      ttcCents: 24000,
    });

    expect(result.success).toBe(false);
  });

  it("emet la facture pour un client ayant une relation existante", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildSupabase({
        bookings: [{ id: "b1" }],
        accompagnements: [],
      }),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: CLIENT_ID,
      description: "Pack de consultations",
      ttcCents: 24000,
    });

    expect(result.success).toBe(true);
  });

  it("refuse une designation vide avant tout appel base", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildSupabase({ bookings: [{ id: "b1" }], accompagnements: [] }),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: CLIENT_ID,
      description: "   ",
      ttcCents: 24000,
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts`
Expected: FAIL — `createManualInvoice` is not exported yet.

- [ ] **Step 3: Write the implementation**

Add to `src/app/(dashboard)/espace-consultante/facturation/actions.ts`, after the imports (add `createAdminClient` is NOT needed — this file already receives an admin client from `getSupabaseAndUser`):

```typescript
import { buildManualInvoiceContent } from "@/lib/invoicing/manual-invoice";

/**
 * Verifie qu'un client a une relation reelle avec la consultante (booking non
 * annule ou inscription a un accompagnement) avant de lui emettre une facture
 * libre. Controle interne, jamais un parametre fourni par l'appelant — voir
 * la note de cadrage sur les server actions exportees.
 */
const hasClientRelationship = async (
  supabase: Awaited<ReturnType<typeof getSupabaseAndUser>>["supabase"],
  consultantId: string,
  clientId: string,
): Promise<boolean> => {
  const { data: bookingLink } = await supabase
    .from("bookings")
    .select("id")
    .eq("client_id", clientId)
    .eq("consultant_id", consultantId)
    .not("status", "eq", "cancelled")
    .limit(1);
  if (bookingLink && bookingLink.length > 0) return true;

  const { data: accompagnements } = await supabase
    .from("accompagnements")
    .select("id")
    .eq("consultant_id", consultantId);

  const accompagnementIds = (accompagnements ?? []).map(
    (a: { id: string }) => a.id,
  );
  if (accompagnementIds.length === 0) return false;

  const { data: enrollmentLink } = await supabase
    .from("accompagnement_enrollments")
    .select("client_id")
    .eq("client_id", clientId)
    .in("accompagnement_id", accompagnementIds)
    .limit(1);

  return Boolean(enrollmentLink && enrollmentLink.length > 0);
};

/**
 * Emet une facture libre (hors Stripe) : virement, cheque ou especes a
 * venir. Consomme la meme sequence de numerotation que les factures
 * automatiques (create_manual_invoice, migration 00099).
 */
export const createManualInvoice = async (input: {
  clientId: string;
  description: string;
  ttcCents: number;
  dueDate?: string;
}): Promise<ActionResult<{ invoiceId: string }>> => {
  const { supabase, user } = await getSupabaseAndUser();

  if (!(await hasClientRelationship(supabase, user.id, input.clientId))) {
    return { success: false, error: "Cette cliente n'est pas rattachée à votre patientèle." };
  }

  let content;
  try {
    content = buildManualInvoiceContent({
      description: input.description,
      ttcCents: input.ttcCents,
      dueDate: input.dueDate,
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Saisie invalide.",
    };
  }

  const { data: client } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", input.clientId)
    .maybeSingle();

  const { data: consultant } = await supabase
    .from("consultants")
    .select(
      "billing_legal_name, billing_address, billing_siren, billing_vat_number, billing_legal_form, billing_iban, billing_bic",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!client || !consultant) {
    return { success: false, error: "Informations de facturation incomplètes." };
  }

  const { data: invoice, error } = await supabase.rpc("create_manual_invoice", {
    p_content: {
      consultant_id: user.id,
      client_id: input.clientId,
      due_date: content.due_date,
      currency: "eur",
      vat_rate: content.vat_rate,
      amount_ttc_cents: content.amount_ttc_cents,
      amount_ht_cents: content.amount_ht_cents,
      amount_vat_cents: content.amount_vat_cents,
      description: content.description,
      client_name: `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || "Cliente",
      client_email: client.email,
      issuer_legal_name: consultant.billing_legal_name,
      issuer_address: consultant.billing_address,
      issuer_siren: consultant.billing_siren,
      issuer_vat_number: consultant.billing_vat_number,
      issuer_legal_form: consultant.billing_legal_form,
    },
  });

  if (error || !invoice) {
    console.error("[createManualInvoice]", error);
    return { success: false, error: "La création de la facture a échoué." };
  }

  const created = invoice as { id: string };

  try {
    await sendInvoiceEmail({
      ...(invoice as Parameters<typeof sendInvoiceEmail>[0]),
      origin: "manual",
      issuer_iban: consultant.billing_iban,
      issuer_bic: consultant.billing_bic,
    });
    await supabase
      .from("invoices")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", created.id);
  } catch (mailErr) {
    console.error("[createManualInvoice] envoi email", mailErr);
  }

  revalidatePath("/espace-consultante/facturation");
  return { success: true, data: { invoiceId: created.id } };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts`
Expected: PASS (3 tests). If the mock query builder shape doesn't match how `hasClientRelationship`/`profiles`/`consultants` selects chain their calls, adjust the test's `buildSupabase` helper (not the implementation) until it does — the implementation follows the existing `crm/actions.ts` query shapes exactly.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/espace-consultante/facturation/actions.ts src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts
git commit -m "feat(facturation): createManualInvoice"
```

---

### Task 6: Server action — `recordSettlement`

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/facturation/actions.ts`
- Modify: `src/app/(dashboard)/espace-consultante/facturation/actions.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `recordSettlement(input: { invoiceId: string; method: "cash" | "check" | "transfer"; amountCents: number; paidAt: string; note?: string }): Promise<ActionResult>`, used by Task 9's settlement dialog.

- [ ] **Step 1: Write the failing test (append to `actions.spec.ts`)**

```typescript
import { recordSettlement } from "./actions";

describe("recordSettlement", () => {
  beforeEach(() => {
    mockGetSupabaseAndUser.mockReset();
  });

  it("refuse une facture d'un autre consultant", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: {
        from: (name: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
            }),
          }),
        }),
      },
      user: { id: CONSULTANT_ID },
    });

    const result = await recordSettlement({
      invoiceId: "invoice-1",
      method: "transfer",
      amountCents: 5000,
      paidAt: "2026-08-05T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("refuse un montant superieur au solde restant", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: {
        from: (name: string) => {
          if (name === "invoices") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: { id: "invoice-1", amount_ttc_cents: 10000 },
                      }),
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ amount_cents: 8000 }] }),
            }),
          };
        },
      },
      user: { id: CONSULTANT_ID },
    });

    const result = await recordSettlement({
      invoiceId: "invoice-1",
      method: "transfer",
      amountCents: 5000,
      paidAt: "2026-08-05T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("enregistre un reglement dans la limite du solde", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: {
        from: (name: string) => {
          if (name === "invoices") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: { id: "invoice-1", amount_ttc_cents: 10000 },
                      }),
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ amount_cents: 3000 }] }),
            }),
            insert,
          };
        },
      },
      user: { id: CONSULTANT_ID },
    });

    const result = await recordSettlement({
      invoiceId: "invoice-1",
      method: "transfer",
      amountCents: 5000,
      paidAt: "2026-08-05T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_id: "invoice-1", amount_cents: 5000 }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts`
Expected: FAIL — `recordSettlement` is not exported yet.

- [ ] **Step 3: Write the implementation**

Add to `actions.ts`:

```typescript
/**
 * Enregistre un reglement manuel (espece/cheque/virement) sur une facture de
 * la consultante appelante. Le statut de reglement de la facture est
 * recalcule par le trigger `invoice_settlements_recompute_status` (00099),
 * jamais ecrit ici directement.
 */
export const recordSettlement = async (input: {
  invoiceId: string;
  method: "cash" | "check" | "transfer";
  amountCents: number;
  paidAt: string;
  note?: string;
}): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, amount_ttc_cents")
    .eq("id", input.invoiceId)
    .eq("consultant_id", user.id)
    .maybeSingle();

  if (!invoice) {
    return { success: false, error: "Facture introuvable." };
  }

  if (input.amountCents <= 0) {
    return { success: false, error: "Le montant doit être strictement positif." };
  }

  const { data: existingSettlements } = await supabase
    .from("invoice_settlements")
    .select("amount_cents")
    .eq("invoice_id", input.invoiceId);

  const alreadySettled = (existingSettlements ?? []).reduce(
    (sum: number, s: { amount_cents: number }) => sum + s.amount_cents,
    0,
  );
  const remaining = invoice.amount_ttc_cents - alreadySettled;

  if (input.amountCents > remaining) {
    return {
      success: false,
      error: `Ce règlement dépasserait le solde restant (${(remaining / 100).toFixed(2)} €).`,
    };
  }

  const { error } = await supabase.from("invoice_settlements").insert({
    invoice_id: input.invoiceId,
    method: input.method,
    amount_cents: input.amountCents,
    paid_at: input.paidAt,
    note: input.note ?? null,
    recorded_by: user.id,
  });

  if (error) {
    console.error("[recordSettlement]", error);
    return { success: false, error: "L'enregistrement du règlement a échoué." };
  }

  revalidatePath("/espace-consultante/facturation");
  return { success: true };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts`
Expected: PASS (all tests in the file so far).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/espace-consultante/facturation/actions.ts src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts
git commit -m "feat(facturation): recordSettlement"
```

---

### Task 7: Server action — `exportInvoicesCsv`

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/facturation/actions.ts`
- Modify: `src/app/(dashboard)/espace-consultante/facturation/actions.spec.ts`

**Interfaces:**
- Consumes: `buildInvoicesCsv` (Task 3).
- Produces: `exportInvoicesCsv(filters: { from?: string; to?: string; status?: "unpaid" | "partial" | "paid"; clientId?: string }): Promise<ActionResult<string>>` — `data` is the raw CSV text, used by Task 10's download button.

- [ ] **Step 1: Write the failing test (append to `actions.spec.ts`)**

```typescript
import { exportInvoicesCsv } from "./actions";

describe("exportInvoicesCsv", () => {
  beforeEach(() => {
    mockGetSupabaseAndUser.mockReset();
  });

  it("ne renvoie que les factures de la consultante appelante, filtrees", async () => {
    const eq = vi.fn().mockReturnThis();
    const gte = vi.fn().mockReturnThis();
    const lte = vi.fn().mockReturnThis();
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "invoice-1",
          number: "2026-08-0001",
          issued_at: "2026-08-01T00:00:00.000Z",
          document_type: "invoice",
          status: "issued",
          payment_status: "paid",
          client_name: "Marie Dupont",
          amount_ht_cents: 10000,
          amount_vat_cents: 2000,
          amount_ttc_cents: 12000,
          currency: "eur",
        },
      ],
    });
    const select = vi.fn().mockReturnValue({ eq, gte, lte, order });

    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: {
        from: (name: string) => {
          if (name === "invoice_settlements") {
            return { select: () => ({ in: () => Promise.resolve({ data: [] }) }) };
          }
          return { select };
        },
      },
      user: { id: CONSULTANT_ID },
    });

    const result = await exportInvoicesCsv({});

    expect(result.success).toBe(true);
    expect(result.data).toContain("2026-08-0001");
    expect(eq).toHaveBeenCalledWith("consultant_id", CONSULTANT_ID);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts`
Expected: FAIL — `exportInvoicesCsv` is not exported yet.

- [ ] **Step 3: Write the implementation**

Add to `actions.ts`:

```typescript
import { buildInvoicesCsv, type InvoiceExportRow } from "@/lib/invoicing/csv-export";

/**
 * Export CSV factures + reglements, filtre par periode/statut/patiente
 * (module Facturation §6.4). Pas de FEC.
 */
export const exportInvoicesCsv = async (filters: {
  from?: string;
  to?: string;
  status?: "unpaid" | "partial" | "paid";
  clientId?: string;
}): Promise<ActionResult<string>> => {
  const { supabase, user } = await getSupabaseAndUser();

  let query = supabase
    .from("invoices")
    .select(
      "id, number, issued_at, document_type, status, payment_status, client_name, amount_ht_cents, amount_vat_cents, amount_ttc_cents, currency",
    )
    .eq("consultant_id", user.id);

  if (filters.from) query = query.gte("issued_at", filters.from);
  if (filters.to) query = query.lte("issued_at", filters.to);
  if (filters.status) query = query.eq("payment_status", filters.status);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);

  const { data: invoices } = await query.order("issued_at", { ascending: false });
  const rows = invoices ?? [];

  const invoiceIds = rows.map((r: { id: string }) => r.id);
  const { data: settlements } =
    invoiceIds.length > 0
      ? await supabase
          .from("invoice_settlements")
          .select("invoice_id, method, amount_cents, paid_at")
          .in("invoice_id", invoiceIds)
      : { data: [] };

  const settlementsByInvoice = new Map<
    string,
    { method: string; amount_cents: number; paid_at: string }[]
  >();
  for (const s of settlements ?? []) {
    const list = settlementsByInvoice.get(s.invoice_id) ?? [];
    list.push({ method: s.method, amount_cents: s.amount_cents, paid_at: s.paid_at });
    settlementsByInvoice.set(s.invoice_id, list);
  }

  const exportRows: InvoiceExportRow[] = rows.map((row) => ({
    number: row.number,
    issued_at: row.issued_at,
    document_type: row.document_type,
    status: row.status,
    payment_status: row.payment_status,
    client_name: row.client_name,
    amount_ht_cents: row.amount_ht_cents,
    amount_vat_cents: row.amount_vat_cents,
    amount_ttc_cents: row.amount_ttc_cents,
    currency: row.currency,
    settlements: settlementsByInvoice.get(row.id) ?? [],
  }));

  return { success: true, data: buildInvoicesCsv(exportRows) };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/espace-consultante/facturation/actions.ts src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts
git commit -m "feat(facturation): exportInvoicesCsv"
```

---

### Task 8: Settings UI — IBAN/BIC fields

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/parametres/actions.ts`
- Modify: `src/app/(dashboard)/espace-consultante/parametres/_components/billing-tab.tsx`
- Modify: `src/app/(dashboard)/espace-consultante/parametres/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `updateBillingProfile` persists `billing_iban`/`billing_bic`; `BillingTab` renders the two new optional fields. Used at runtime by Task 5's manual invoice flow (reads `consultants.billing_iban`/`billing_bic`).

There's no meaningful "test" for a form field addition beyond the existing manual UI verification convention in this codebase (no `.spec.tsx` exists for `billing-tab.tsx` today) — this task is verified by the final manual browser check in Task 10, not its own automated test.

- [ ] **Step 1: Extend `updateBillingProfile`**

In `parametres/actions.ts`, add two lines to the `.update({...})` object:

```typescript
      billing_iban: value("billing_iban"),
      billing_bic: value("billing_bic"),
```

- [ ] **Step 2: Extend the `BillingTab` props and form**

In `billing-tab.tsx`, update the type and add fields after the "Forme juridique" block:

```typescript
type BillingTabProps = {
  billing: BillingProfile & {
    billing_legal_form: string | null;
    billing_iban: string | null;
    billing_bic: string | null;
  };
};
```

```tsx
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="billing_iban">
              IBAN{" "}
              <span className="text-muted-foreground">(facultatif)</span>
            </Label>
            <Input
              id="billing_iban"
              name="billing_iban"
              defaultValue={billing.billing_iban ?? ""}
              placeholder="FR76 3000 6000 0112 3456 7890 189"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_bic">
              BIC{" "}
              <span className="text-muted-foreground">(facultatif)</span>
            </Label>
            <Input
              id="billing_bic"
              name="billing_bic"
              defaultValue={billing.billing_bic ?? ""}
              placeholder="BNPAFRPPXXX"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Affiché sur les factures manuelles réglées par virement, tant
          qu&apos;elles ne sont pas soldées.
        </p>
```

(place this block right after the "Forme juridique" `<div>` and before the submit `<div className="flex items-center gap-3">`)

- [ ] **Step 3: Pass the new fields from the page**

In `parametres/page.tsx`, add to the `billing={{...}}` prop:

```typescript
                billing_iban: consultant?.billing_iban ?? null,
                billing_bic: consultant?.billing_bic ?? null,
```

- [ ] **Step 4: Manual check**

Run: `pnpm dev`, open `/espace-consultante/parametres`, fill IBAN/BIC, save, reload — confirm the values persist. (Requires a real login; if not feasible in this environment, defer to Task 10's manual pass and note it there.)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/espace-consultante/parametres/actions.ts src/app/\(dashboard\)/espace-consultante/parametres/_components/billing-tab.tsx src/app/\(dashboard\)/espace-consultante/parametres/page.tsx
git commit -m "feat(facturation): champs IBAN/BIC sur le profil de facturation"
```

---

### Task 9: UI — Nouvelle facture (manual invoice creation)

**Files:**
- Create: `src/app/(dashboard)/espace-consultante/facturation/_components/new-invoice-button.tsx`
- Modify: `src/app/(dashboard)/espace-consultante/facturation/page.tsx`

**Interfaces:**
- Consumes: `createManualInvoice` (Task 5), `getContacts` from `@/app/(dashboard)/espace-consultante/crm/actions` (existing, exported).
- Produces: `<NewInvoiceButton clients={{ id: string; label: string }[]} />`, rendered at the top of the facturation page.

- [ ] **Step 1: Fetch the client list in the page**

In `facturation/page.tsx`, add the import and fetch, then render the button above the invoice list:

```typescript
import { getContacts } from "../crm/actions";
import { NewInvoiceButton } from "./_components/new-invoice-button";
```

```typescript
  const contacts = await getContacts();
  const clients = contacts.map((c) => ({
    id: c.id,
    label: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email,
  }));
```

```tsx
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            Facturation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les factures émises automatiquement à chaque encaissement, et
            celles créées manuellement.
          </p>
        </div>
        <NewInvoiceButton clients={clients} />
      </div>
```
(replace the existing header `<div>` that only contains the title/paragraph)

- [ ] **Step 2: Write the component**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { createManualInvoice } from "../actions";

type Client = { id: string; label: string };

/**
 * Creation d'une facture libre (hors Stripe) : virement, cheque ou especes a
 * venir. L'echeance est optionnelle — vide, la facture est due a reception.
 */
export const NewInvoiceButton = ({ clients }: { clients: Client[] }) => {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setClientId("");
    setDescription("");
    setAmount("");
    setDueDate("");
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);
    const euros = Number(amount.replace(",", "."));
    if (!clientId || !description.trim() || !Number.isFinite(euros) || euros <= 0) {
      setError("Renseignez une cliente, une désignation et un montant valide.");
      return;
    }
    startTransition(async () => {
      const result = await createManualInvoice({
        clientId,
        description: description.trim(),
        ttcCents: Math.round(euros * 100),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      if (result.success) {
        setOpen(false);
        reset();
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-primary-green hover:bg-primary-green/90">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle facture
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-invoice-client">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="new-invoice-client">
                <SelectValue placeholder="Choisir une cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-invoice-description">Désignation</Label>
            <Input
              id="new-invoice-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pack de 3 consultations"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-invoice-amount">Montant TTC (€)</Label>
              <Input
                id="new-invoice-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-invoice-due-date">
                Échéance{" "}
                <span className="text-muted-foreground">(à réception si vide)</span>
              </Label>
              <Input
                id="new-invoice-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-primary-green hover:bg-primary-green/90"
          >
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Émettre la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 3: Manual check**

Run: `pnpm dev`, open `/espace-consultante/facturation`, click "Nouvelle facture", pick a client, fill in the form, submit. Confirm a new invoice row appears and an email is attempted (check server logs since Resend may be sandboxed in dev).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/espace-consultante/facturation/_components/new-invoice-button.tsx src/app/\(dashboard\)/espace-consultante/facturation/page.tsx
git commit -m "feat(facturation): UI de création de facture manuelle"
```

---

### Task 10: UI — statut de règlement, enregistrement de règlement, relance, export

**Files:**
- Create: `src/app/(dashboard)/espace-consultante/facturation/_components/settlement-button.tsx`
- Create: `src/app/(dashboard)/espace-consultante/facturation/_components/export-button.tsx`
- Modify: `src/app/(dashboard)/espace-consultante/facturation/page.tsx`

**Interfaces:**
- Consumes: `recordSettlement` (Task 6), `exportInvoicesCsv` (Task 7), `resendInvoice` (existing, reused for "Relancer").

- [ ] **Step 1: Add status pill and due-date display to the invoice list**

In `page.tsx`, extend the `select(...)` on the `invoices` query to include `payment_status, due_date, origin`, then add a status badge and conditional actions. Replace the row's status area:

```tsx
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "En attente",
  partial: "Partiellement payée",
  paid: "Payée",
};

const isOverdue = (dueDate: string | null, paymentStatus: string) =>
  Boolean(dueDate) && paymentStatus !== "paid" && new Date(dueDate as string) < new Date();
```

```tsx
                  {invoice.origin === "manual" && (
                    <Badge
                      variant={isOverdue(invoice.due_date, invoice.payment_status) ? "destructive" : "outline"}
                      className="ml-2"
                    >
                      {isOverdue(invoice.due_date, invoice.payment_status)
                        ? "En retard"
                        : PAYMENT_STATUS_LABELS[invoice.payment_status]}
                    </Badge>
                  )}
```
(place next to the existing "Annulée" badge, inside the same `<p className="font-medium">` block)

```tsx
                  {invoice.origin === "manual" && invoice.payment_status !== "paid" && (
                    <>
                      <SettlementButton
                        invoiceId={invoice.id}
                        remainingCents={invoice.amount_ttc_cents}
                      />
                      {isOverdue(invoice.due_date, invoice.payment_status) && (
                        <ResendInvoiceButton
                          invoiceId={invoice.id}
                          alreadySent
                        />
                      )}
                    </>
                  )}
```
(place among the existing action buttons, before `ResendInvoiceButton`'s existing unconditional usage — note `ResendInvoiceButton` is reused as-is for "Relancer": pass `alreadySent` so its label reads "Renvoyer", which reads correctly as a relance)

Add these imports to `page.tsx`:

```typescript
import { SettlementButton } from "./_components/settlement-button";
import { ExportButton } from "./_components/export-button";
```

And extend the `select` string with `, payment_status, due_date, origin`.

- [ ] **Step 2: Write `SettlementButton`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Wallet, Loader2 } from "lucide-react";
import { recordSettlement } from "../actions";

const METHODS = [
  { value: "transfer", label: "Virement" },
  { value: "check", label: "Chèque" },
  { value: "cash", label: "Espèces" },
] as const;

export const SettlementButton = ({
  invoiceId,
  remainingCents,
}: {
  invoiceId: string;
  remainingCents: number;
}) => {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<(typeof METHODS)[number]["value"]>("transfer");
  const [amount, setAmount] = useState((remainingCents / 100).toFixed(2));
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    const euros = Number(amount.replace(",", "."));
    if (!Number.isFinite(euros) || euros <= 0) {
      setError("Montant invalide.");
      return;
    }
    startTransition(async () => {
      const result = await recordSettlement({
        invoiceId,
        method,
        amountCents: Math.round(euros * 100),
        paidAt: new Date(paidAt).toISOString(),
      });
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Wallet className="mr-1 h-4 w-4" />
          Enregistrer un règlement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un règlement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settlement-method">Moyen de paiement</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger id="settlement-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settlement-amount">Montant (€)</Label>
              <Input
                id="settlement-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlement-date">Date</Label>
              <Input
                id="settlement-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-primary-green hover:bg-primary-green/90">
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 3: Write `ExportButton`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { exportInvoicesCsv } from "../actions";

/**
 * Telecharge un export CSV des factures + reglements. Pas de filtre pour la
 * V1 (periode/statut/patiente restent a ajouter s'ils s'averent necessaires
 * a l'usage — voir le design doc).
 */
export const ExportButton = () => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await exportInvoicesCsv({});
      if (!result.success || !result.data) {
        setError(result.error ?? "Erreur");
        return;
      }
      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factures-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-1 h-4 w-4" />
        )}
        Exporter
      </Button>
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Wire both into the page header**

```tsx
        <div className="flex items-center gap-3">
          <ExportButton />
          <NewInvoiceButton clients={clients} />
        </div>
```
(replace the single `<NewInvoiceButton clients={clients} />` added in Task 9 with this pair)

- [ ] **Step 5: Manual check**

Run: `pnpm dev`, open `/espace-consultante/facturation`:
- Create a manual invoice (from Task 9), confirm it shows "En attente".
- Click "Enregistrer un règlement", partially settle it, confirm the badge updates to "Partiellement payée" after reload.
- Fully settle it, confirm "Payée" and that the settlement/relance buttons disappear.
- Click "Exporter", confirm a CSV downloads and opens correctly in a spreadsheet app (semicolons as separators, one row per invoice).
- Set a manual invoice's due date in the past (via a direct DB edit if there's no UI path to backdate), confirm the badge reads "En retard" and the relance button appears.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/espace-consultante/facturation/_components/settlement-button.tsx src/app/\(dashboard\)/espace-consultante/facturation/_components/export-button.tsx src/app/\(dashboard\)/espace-consultante/facturation/page.tsx
git commit -m "feat(facturation): règlement manuel, badge de statut, relance, export CSV"
```

---

### Task 11: Push the migration and final branch review

**Files:** none (operational task)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass, including every new spec added in Tasks 2–7. Watch for the nested-worktree false-failure issue noted in project memory (`vitest-config-nested-worktrees`) if any unrelated failures show up.

- [ ] **Step 2: Push the migration to the live Supabase project**

Run: `pnpm db:push`
Expected: migration `00099_manual_invoices_and_settlements.sql` applies cleanly. This is a real, hard-to-reverse action against the shared hosted database — confirm with the user before running it, and run it only once the rest of the branch is reviewed and ready to ship together.

- [ ] **Step 3: Full branch review**

Review the entire diff since this branch started, with particular attention to:
- Every exported server action touching `clientId`/`invoiceId` re-verifies ownership/relationship internally (Tasks 5, 6, 7) — no parameter that substitutes for that check.
- RLS on `invoice_settlements` matches the intended access pattern exactly (select: owning consultant + admin; no insert/update/delete policy at all) — re-read the applied migration, not just the file, once pushed.
- `payment_status` is never set directly by application code outside the trigger and `create_manual_invoice`/`create_invoice` (Task 1) — grep for `.update(` calls touching `invoices` to confirm none also writes `payment_status`.
- The `origin`/`payment_status` backfill in Task 1 Step 1 correctly marks all pre-existing rows as `stripe`/`paid`.

- [ ] **Step 4: Update project memory**

Once merged, add a `*-shipped` memory entry for this chantier (module 6), following the exact structure of `tracabilite-notes-crm-shipped.md` — what shipped, why, what was found in final review, and the updated "top restant du backlog Lactéo" (should now list only: sync Google Calendar bidirectionnelle, module cartes cadeaux).

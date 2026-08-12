# Cartes cadeaux — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core of the gift card module — issuance (online purchase + manual back-office), balance ledger, redemption at booking and at manual invoice creation, back-office listing.

**Architecture:** Extends the existing `payments`/`invoices` pipeline (`emitInvoiceForPayment`, `PaymentType`) with a new `gift_card` payment type, so purchase reuses the existing Stripe Checkout → webhook → invoice → email flow verbatim. A new `gift_card_redemptions` append-only ledger, written exclusively through a `SECURITY DEFINER` SQL function (`redeem_gift_card`) for atomicity, is the single source of truth for balance. Redeeming a gift card on an invoice reuses the existing `invoice_settlements` table (new `'gift_card'` method) so the existing due-balance/payment-status computation picks it up for free.

**Tech Stack:** Next.js App Router server actions, Supabase Postgres (RLS, `SECURITY DEFINER` functions), Stripe Checkout, `@react-pdf/renderer`, Resend (`sendTransactionalEmail`), Vitest.

## Global Constraints

- Montants prédéfinis (carte "montant") : 90€ / 130€ / 170€ (9000/13000/17000 cents).
- Durée de validité : 12 mois à partir de l'achat (`expires_at = issued_at + interval '12 months'`).
- Aucune case de rétractation, aucun enforcement serveur associé — même traitement que le module formations (décision assumée, voir mémoire `withdrawal-waiver-removed`). Ne pas ajouter de champ/flag de ce type dans ce plan.
- Aucun paramètre transmis par le client à une server action d'écriture ne doit représenter un solde ou une validité déjà vérifiée côté client — `redeemGiftCard`/`redeem_gift_card` recalculent systématiquement depuis le ledger en base.
- Toute nouvelle table a RLS activé, avec policies SELECT séparées (consultant / admin) et zéro policy INSERT/UPDATE/DELETE — écritures uniquement via fonctions `SECURITY DEFINER` ou service-role.
- Hors scope (ne pas implémenter ici) : rappel avant expiration, procédure de remboursement/prolongation après expiration.

---

### Task 1: Migration — types, tables, RLS, fonction de redemption

**Files:**
- Create: `supabase/migrations/00100_gift_cards.sql`
- Test: manual (`pnpm supabase db reset` or equivalent local check — no automated migration test in this repo; verified indirectly by Task 2/3 tests running against the local Supabase instance)

**Interfaces:**
- Produces: tables `gift_cards`, `gift_card_redemptions`; enum types `gift_card_type`, `gift_card_status`, `gift_card_delivery_mode`; SQL function `redeem_gift_card(p_code TEXT, p_amount_cents INT, p_booking_id UUID, p_invoice_id UUID, p_recorded_by UUID) RETURNS JSONB`; widened `payment_type` enum (adds `'gift_card'`); widened `invoice_settlements.method` check constraint (adds `'gift_card'`).

- [ ] **Step 1: Write the migration file**

```sql
-- 00100_gift_cards.sql

ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'gift_card';

CREATE TYPE gift_card_type AS ENUM ('amount', 'service');
CREATE TYPE gift_card_status AS ENUM ('active', 'used', 'expired', 'cancelled');
CREATE TYPE gift_card_delivery_mode AS ENUM ('email', 'pdf');
CREATE TYPE gift_card_created_by AS ENUM ('purchase', 'manual');

CREATE TABLE gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type gift_card_type NOT NULL,
  initial_amount_cents INT,
  consultation_type_id UUID REFERENCES consultation_types(id),
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  beneficiary_name TEXT,
  beneficiary_email TEXT,
  personal_message TEXT,
  delivery_mode gift_card_delivery_mode NOT NULL,
  status gift_card_status NOT NULL DEFAULT 'active',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  created_by gift_card_created_by NOT NULL,
  created_by_admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gift_cards_amount_type_chk CHECK (
    (type = 'amount' AND initial_amount_cents IS NOT NULL AND consultation_type_id IS NULL)
    OR (type = 'service' AND initial_amount_cents IS NULL AND consultation_type_id IS NOT NULL)
  )
);

CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_gift_cards_consultant ON gift_cards(consultant_id);

CREATE TABLE gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id),
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  booking_id UUID REFERENCES bookings(id),
  invoice_id UUID REFERENCES invoices(id),
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gift_card_redemptions_card ON gift_card_redemptions(gift_card_id);

ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY gift_cards_select_consultant ON gift_cards
  FOR SELECT USING (consultant_id = auth.uid());

CREATE POLICY gift_cards_select_admin ON gift_cards
  FOR SELECT USING (is_admin());

CREATE POLICY gift_card_redemptions_select_consultant ON gift_card_redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gift_cards
      WHERE gift_cards.id = gift_card_redemptions.gift_card_id
        AND gift_cards.consultant_id = auth.uid()
    )
  );

CREATE POLICY gift_card_redemptions_select_admin ON gift_card_redemptions
  FOR SELECT USING (is_admin());

-- Elargit le mode de reglement existant (00099) pour accepter une carte
-- cadeau comme moyen de solder une facture, sans dupliquer la logique de
-- statut deja calculee par le trigger invoice_settlements_recompute_status.
ALTER TABLE invoice_settlements DROP CONSTRAINT IF EXISTS invoice_settlements_method_check;
ALTER TABLE invoice_settlements ADD CONSTRAINT invoice_settlements_method_check
  CHECK (method IN ('cash', 'check', 'transfer', 'gift_card'));

-- Redemption atomique : verrouille la carte, verifie statut/expiration/solde,
-- ecrit la ligne de ledger, et si un invoice_id est fourni, ecrit aussi le
-- reglement correspondant pour que le solde du reutilise le calcul existant.
CREATE OR REPLACE FUNCTION redeem_gift_card(
  p_code TEXT,
  p_amount_cents INT,
  p_booking_id UUID DEFAULT NULL,
  p_invoice_id UUID DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_card gift_cards%ROWTYPE;
  v_used_cents INT;
  v_balance_cents INT;
  v_redemption gift_card_redemptions%ROWTYPE;
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT * INTO v_card FROM gift_cards WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'gift_card_not_found';
  END IF;

  IF v_card.status != 'active' THEN
    RAISE EXCEPTION 'gift_card_not_active';
  END IF;

  IF v_card.expires_at < now() THEN
    RAISE EXCEPTION 'gift_card_expired';
  END IF;

  IF v_card.type = 'service' THEN
    IF EXISTS (SELECT 1 FROM gift_card_redemptions WHERE gift_card_id = v_card.id) THEN
      RAISE EXCEPTION 'gift_card_already_used';
    END IF;

    INSERT INTO gift_card_redemptions (gift_card_id, amount_cents, booking_id, invoice_id, recorded_by)
    VALUES (v_card.id, p_amount_cents, p_booking_id, p_invoice_id, p_recorded_by)
    RETURNING * INTO v_redemption;

    UPDATE gift_cards SET status = 'used' WHERE id = v_card.id;
  ELSE
    SELECT COALESCE(SUM(amount_cents), 0) INTO v_used_cents
    FROM gift_card_redemptions WHERE gift_card_id = v_card.id;

    v_balance_cents := v_card.initial_amount_cents - v_used_cents;

    IF v_balance_cents < p_amount_cents THEN
      RAISE EXCEPTION 'gift_card_insufficient_balance';
    END IF;

    INSERT INTO gift_card_redemptions (gift_card_id, amount_cents, booking_id, invoice_id, recorded_by)
    VALUES (v_card.id, p_amount_cents, p_booking_id, p_invoice_id, p_recorded_by)
    RETURNING * INTO v_redemption;

    IF v_balance_cents - p_amount_cents <= 0 THEN
      UPDATE gift_cards SET status = 'used' WHERE id = v_card.id;
    END IF;
  END IF;

  IF p_invoice_id IS NOT NULL THEN
    INSERT INTO invoice_settlements (invoice_id, method, amount_cents, paid_at, note, recorded_by)
    VALUES (p_invoice_id, 'gift_card', p_amount_cents, now(), 'Carte cadeau ' || v_card.code, p_recorded_by);
  END IF;

  RETURN to_jsonb(v_redemption);
END;
$$;
```

- [ ] **Step 2: Apply the migration locally and confirm it runs clean**

Run: `supabase db reset` (or the project's equivalent local migration command — check `package.json` scripts for `db:reset`/`supabase:reset` first and use that if present)
Expected: migration `00100_gift_cards.sql` applies with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00100_gift_cards.sql
git commit -m "feat(cartes-cadeaux): migration gift_cards, ledger, redeem_gift_card()"
```

---

### Task 2: Génération de code unique

**Files:**
- Create: `src/lib/gift-cards/code.ts`
- Test: `src/lib/gift-cards/code.spec.ts`

**Interfaces:**
- Produces: `randomGiftCardCode(): string` (pure, format `CADEAU-XXXXXX`, alphabet sans caractères ambigus `0/O/1/I`); `insertGiftCardWithUniqueCode(supabase: SupabaseClient, buildRow: (code: string) => Record<string, unknown>, maxAttempts = 5): Promise<{ id: string; code: string } & Record<string, unknown>>` — insère dans `gift_cards`, retente sur violation d'unicité (`error.code === "23505"`), échoue après `maxAttempts`.

- [ ] **Step 1: Write the failing test for the pure generator**

```ts
import { describe, it, expect } from "vitest";
import { randomGiftCardCode } from "./code";

describe("randomGiftCardCode", () => {
  it("returns a CADEAU- prefixed code with 6 unambiguous characters", () => {
    const code = randomGiftCardCode();
    expect(code).toMatch(/^CADEAU-[A-HJ-NP-Z2-9]{6}$/);
  });

  it("returns different codes across calls", () => {
    const codes = new Set(Array.from({ length: 50 }, () => randomGiftCardCode()));
    expect(codes.size).toBeGreaterThan(45);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/gift-cards/code.spec.ts`
Expected: FAIL — `randomGiftCardCode` not defined.

- [ ] **Step 3: Implement the pure generator**

```ts
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I

export const randomGiftCardCode = (): string => {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `CADEAU-${suffix}`;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/gift-cards/code.spec.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for the insert-with-retry helper**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { insertGiftCardWithUniqueCode } from "./code";

describe("insertGiftCardWithUniqueCode", () => {
  let singleImpl: () => Promise<{ data: unknown; error: unknown }>;
  const mockSingle = vi.fn(() => singleImpl());
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const supabase = { from: vi.fn(() => ({ insert: mockInsert })) } as never;

  beforeEach(() => {
    mockInsert.mockClear();
    mockSelect.mockClear();
    mockSingle.mockClear();
  });

  it("returns the row on first successful insert", async () => {
    singleImpl = async () => ({ data: { id: "gc-1", code: "CADEAU-ABC234" }, error: null });

    const row = await insertGiftCardWithUniqueCode(supabase, (code) => ({
      code,
      buyer_email: "a@b.com",
    }));

    expect(row.id).toBe("gc-1");
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("retries on unique violation (23505) then succeeds", async () => {
    let call = 0;
    singleImpl = async () => {
      call += 1;
      if (call === 1) return { data: null, error: { code: "23505" } };
      return { data: { id: "gc-2", code: "CADEAU-XYZ987" }, error: null };
    };

    const row = await insertGiftCardWithUniqueCode(supabase, (code) => ({ code }));

    expect(row.id).toBe("gc-2");
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("throws after maxAttempts consecutive collisions", async () => {
    singleImpl = async () => ({ data: null, error: { code: "23505" } });

    await expect(
      insertGiftCardWithUniqueCode(supabase, (code) => ({ code }), 3),
    ).rejects.toThrow("gift_card_code_generation_failed");
    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  it("rethrows immediately on a non-collision error", async () => {
    singleImpl = async () => ({ data: null, error: { code: "42501" } });

    await expect(
      insertGiftCardWithUniqueCode(supabase, (code) => ({ code })),
    ).rejects.toBeTruthy();
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm vitest run src/lib/gift-cards/code.spec.ts`
Expected: FAIL — `insertGiftCardWithUniqueCode` not defined.

- [ ] **Step 7: Implement the retry helper**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export const insertGiftCardWithUniqueCode = async <
  T extends Record<string, unknown>,
>(
  supabase: SupabaseClient,
  buildRow: (code: string) => T,
  maxAttempts = 5,
): Promise<T & { id: string; code: string }> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = randomGiftCardCode();
    const { data, error } = await supabase
      .from("gift_cards")
      .insert(buildRow(code))
      .select()
      .single();

    if (!error) return data as T & { id: string; code: string };

    lastError = error;
    const pgError = error as { code?: string };
    if (pgError.code !== "23505") throw error;
  }

  throw new Error("gift_card_code_generation_failed", { cause: lastError });
};
```

- [ ] **Step 8: Run all tests in the file to verify they pass**

Run: `pnpm vitest run src/lib/gift-cards/code.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 9: Commit**

```bash
git add src/lib/gift-cards/code.ts src/lib/gift-cards/code.spec.ts
git commit -m "feat(cartes-cadeaux): générateur de code unique avec retry sur collision"
```

---

### Task 3: Redemption (`redeemGiftCard`)

**Files:**
- Create: `src/lib/gift-cards/redeem.ts`
- Test: `src/lib/gift-cards/redeem.spec.ts`

**Interfaces:**
- Consumes: none from earlier tasks (calls the `redeem_gift_card` RPC from Task 1 directly).
- Produces: `type RedeemGiftCardInput = { code: string; amountCents: number; bookingId?: string; invoiceId?: string; recordedBy: string }`; `type RedeemGiftCardResult = { ok: true; redemptionId: string; amountCents: number } | { ok: false; error: "not_found" | "not_active" | "expired" | "already_used" | "insufficient_balance" | "unknown" }`; `redeemGiftCard(supabase: SupabaseClient, input: RedeemGiftCardInput): Promise<RedeemGiftCardResult>` — used by both the booking flow (Task 8) and the manual invoice flow (Task 9). Never trusts a client-supplied balance/validity flag: always calls the RPC, which recomputes from the ledger.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from "vitest";
import { redeemGiftCard } from "./redeem";

const buildSupabase = (rpcImpl: () => Promise<{ data: unknown; error: unknown }>) =>
  ({ rpc: vi.fn(() => rpcImpl()) }) as never;

describe("redeemGiftCard", () => {
  it("returns ok with the redemption id on success", async () => {
    const supabase = buildSupabase(async () => ({
      data: { id: "red-1", amount_cents: 5000 },
      error: null,
    }));

    const result = await redeemGiftCard(supabase, {
      code: "CADEAU-ABC234",
      amountCents: 5000,
      bookingId: "booking-1",
      recordedBy: "consultant-1",
    });

    expect(result).toEqual({ ok: true, redemptionId: "red-1", amountCents: 5000 });
  });

  it("maps gift_card_not_found to a typed error", async () => {
    const supabase = buildSupabase(async () => ({
      data: null,
      error: { message: "gift_card_not_found" },
    }));

    const result = await redeemGiftCard(supabase, {
      code: "CADEAU-NOPE00",
      amountCents: 1000,
      recordedBy: "consultant-1",
    });

    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it.each([
    ["gift_card_not_active", "not_active"],
    ["gift_card_expired", "expired"],
    ["gift_card_already_used", "already_used"],
    ["gift_card_insufficient_balance", "insufficient_balance"],
    ["something_else", "unknown"],
  ])("maps RPC error %s to %s", async (rpcMessage, expected) => {
    const supabase = buildSupabase(async () => ({
      data: null,
      error: { message: rpcMessage },
    }));

    const result = await redeemGiftCard(supabase, {
      code: "CADEAU-ABC234",
      amountCents: 1000,
      recordedBy: "consultant-1",
    });

    expect(result).toEqual({ ok: false, error: expected });
  });

  it("passes bookingId/invoiceId/recordedBy through to the RPC call", async () => {
    const rpc = vi.fn(async () => ({ data: { id: "red-2", amount_cents: 100 }, error: null }));
    const supabase = { rpc } as never;

    await redeemGiftCard(supabase, {
      code: "CADEAU-ABC234",
      amountCents: 100,
      invoiceId: "invoice-1",
      recordedBy: "consultant-1",
    });

    expect(rpc).toHaveBeenCalledWith("redeem_gift_card", {
      p_code: "CADEAU-ABC234",
      p_amount_cents: 100,
      p_booking_id: null,
      p_invoice_id: "invoice-1",
      p_recorded_by: "consultant-1",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/gift-cards/redeem.spec.ts`
Expected: FAIL — `redeemGiftCard` not defined.

- [ ] **Step 3: Implement**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type RedeemGiftCardInput = {
  code: string;
  amountCents: number;
  bookingId?: string;
  invoiceId?: string;
  recordedBy: string;
};

export type RedeemGiftCardError =
  | "not_found"
  | "not_active"
  | "expired"
  | "already_used"
  | "insufficient_balance"
  | "unknown";

export type RedeemGiftCardResult =
  | { ok: true; redemptionId: string; amountCents: number }
  | { ok: false; error: RedeemGiftCardError };

const ERROR_MAP: Record<string, RedeemGiftCardError> = {
  gift_card_not_found: "not_found",
  gift_card_not_active: "not_active",
  gift_card_expired: "expired",
  gift_card_already_used: "already_used",
  gift_card_insufficient_balance: "insufficient_balance",
};

export const redeemGiftCard = async (
  supabase: SupabaseClient,
  input: RedeemGiftCardInput,
): Promise<RedeemGiftCardResult> => {
  const { data, error } = await supabase.rpc("redeem_gift_card", {
    p_code: input.code,
    p_amount_cents: input.amountCents,
    p_booking_id: input.bookingId ?? null,
    p_invoice_id: input.invoiceId ?? null,
    p_recorded_by: input.recordedBy,
  });

  if (error) {
    const message = (error as { message?: string }).message ?? "";
    return { ok: false, error: ERROR_MAP[message] ?? "unknown" };
  }

  const row = data as { id: string; amount_cents: number };
  return { ok: true, redemptionId: row.id, amountCents: row.amount_cents };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/gift-cards/redeem.spec.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/gift-cards/redeem.ts src/lib/gift-cards/redeem.spec.ts
git commit -m "feat(cartes-cadeaux): redeemGiftCard, wrapper typé sur redeem_gift_card()"
```

---

### Task 4: Lecture du solde (vérification temps réel)

**Files:**
- Create: `src/lib/gift-cards/balance.ts`
- Test: `src/lib/gift-cards/balance.spec.ts`

**Interfaces:**
- Produces: `type GiftCardLookup = { ok: true; giftCardId: string; type: "amount" | "service"; balanceCents: number | null; consultationTypeId: string | null; expiresAt: string } | { ok: false; error: "not_found" | "not_active" | "expired" | "already_used" }`; `lookupGiftCard(supabase: SupabaseClient, code: string): Promise<GiftCardLookup>` — lecture seule, utilisée par l'UI pour la vérification en temps réel avant soumission (§7.2). Ne fait jamais foi pour l'écriture : `redeemGiftCard` (Task 3) revalide tout côté serveur au moment de la confirmation.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from "vitest";
import { lookupGiftCard } from "./balance";

const buildSupabase = (giftCard: unknown, redemptions: unknown[]) => {
  const from = vi.fn((table: string) => {
    if (table === "gift_cards") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: giftCard, error: null }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: async () => ({ data: redemptions, error: null }),
      }),
    };
  });
  return { from } as never;
};

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();

describe("lookupGiftCard", () => {
  it("returns not_found when no row matches", async () => {
    const result = await lookupGiftCard(buildSupabase(null, []), "CADEAU-NOPE00");
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("returns expired when past expires_at", async () => {
    const supabase = buildSupabase(
      { id: "gc-1", type: "amount", status: "active", expires_at: PAST, initial_amount_cents: 9000, consultation_type_id: null },
      [],
    );
    const result = await lookupGiftCard(supabase, "CADEAU-ABC234");
    expect(result).toEqual({ ok: false, error: "expired" });
  });

  it("returns not_active when status is cancelled", async () => {
    const supabase = buildSupabase(
      { id: "gc-1", type: "amount", status: "cancelled", expires_at: FUTURE, initial_amount_cents: 9000, consultation_type_id: null },
      [],
    );
    const result = await lookupGiftCard(supabase, "CADEAU-ABC234");
    expect(result).toEqual({ ok: false, error: "not_active" });
  });

  it("returns the remaining balance for an amount card with partial usage", async () => {
    const supabase = buildSupabase(
      { id: "gc-1", type: "amount", status: "active", expires_at: FUTURE, initial_amount_cents: 9000, consultation_type_id: null },
      [{ amount_cents: 3000 }],
    );
    const result = await lookupGiftCard(supabase, "CADEAU-ABC234");
    expect(result).toEqual({
      ok: true,
      giftCardId: "gc-1",
      type: "amount",
      balanceCents: 6000,
      consultationTypeId: null,
      expiresAt: FUTURE,
    });
  });

  it("returns already_used for a service card already redeemed", async () => {
    const supabase = buildSupabase(
      { id: "gc-1", type: "service", status: "active", expires_at: FUTURE, initial_amount_cents: null, consultation_type_id: "ct-1" },
      [{ amount_cents: 1 }],
    );
    const result = await lookupGiftCard(supabase, "CADEAU-ABC234");
    expect(result).toEqual({ ok: false, error: "already_used" });
  });

  it("returns null balanceCents for an unused service card", async () => {
    const supabase = buildSupabase(
      { id: "gc-1", type: "service", status: "active", expires_at: FUTURE, initial_amount_cents: null, consultation_type_id: "ct-1" },
      [],
    );
    const result = await lookupGiftCard(supabase, "CADEAU-ABC234");
    expect(result).toEqual({
      ok: true,
      giftCardId: "gc-1",
      type: "service",
      balanceCents: null,
      consultationTypeId: "ct-1",
      expiresAt: FUTURE,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/gift-cards/balance.spec.ts`
Expected: FAIL — `lookupGiftCard` not defined.

- [ ] **Step 3: Implement**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type GiftCardLookup =
  | {
      ok: true;
      giftCardId: string;
      type: "amount" | "service";
      balanceCents: number | null;
      consultationTypeId: string | null;
      expiresAt: string;
    }
  | { ok: false; error: "not_found" | "not_active" | "expired" | "already_used" };

export const lookupGiftCard = async (
  supabase: SupabaseClient,
  code: string,
): Promise<GiftCardLookup> => {
  const { data: card } = await supabase
    .from("gift_cards")
    .select("id, type, status, expires_at, initial_amount_cents, consultation_type_id")
    .eq("code", code)
    .maybeSingle();

  if (!card) return { ok: false, error: "not_found" };
  if (card.status !== "active") return { ok: false, error: "not_active" };
  if (new Date(card.expires_at) < new Date()) return { ok: false, error: "expired" };

  const { data: redemptions } = await supabase
    .from("gift_card_redemptions")
    .select("amount_cents")
    .eq("gift_card_id", card.id);

  const used = (redemptions ?? []).reduce(
    (sum: number, r: { amount_cents: number }) => sum + r.amount_cents,
    0,
  );

  if (card.type === "service") {
    if (used > 0) return { ok: false, error: "already_used" };
    return {
      ok: true,
      giftCardId: card.id,
      type: "service",
      balanceCents: null,
      consultationTypeId: card.consultation_type_id,
      expiresAt: card.expires_at,
    };
  }

  return {
    ok: true,
    giftCardId: card.id,
    type: "amount",
    balanceCents: card.initial_amount_cents - used,
    consultationTypeId: null,
    expiresAt: card.expires_at,
  };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/gift-cards/balance.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/gift-cards/balance.ts src/lib/gift-cards/balance.spec.ts
git commit -m "feat(cartes-cadeaux): lookupGiftCard, vérification temps réel en lecture seule"
```

---

### Task 5: PDF de la carte cadeau

**Files:**
- Create: `src/lib/gift-cards/pdf.tsx`
- Test: `src/lib/gift-cards/pdf.spec.ts`

**Interfaces:**
- Consumes: none.
- Produces: `type GiftCardPdfView = { code: string; typeLabel: string; amountLabel: string | null; expiresAtLabel: string; beneficiaryName: string | null; personalMessage: string | null; consultantName: string }`; `renderGiftCardPdf(view: GiftCardPdfView): Promise<Buffer>`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { renderGiftCardPdf, type GiftCardPdfView } from "./pdf";

describe("renderGiftCardPdf", () => {
  it("renders a non-empty PDF buffer", async () => {
    const view: GiftCardPdfView = {
      code: "CADEAU-ABC234",
      typeLabel: "Carte cadeau — 90 €",
      amountLabel: "90,00 €",
      expiresAtLabel: "12 août 2027",
      beneficiaryName: "Marie Dupont",
      personalMessage: "Joyeux anniversaire !",
      consultantName: "Carole Hervé",
    };

    const buffer = await renderGiftCardPdf(view);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    // En-tête PDF standard.
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/gift-cards/pdf.spec.ts`
Expected: FAIL — `renderGiftCardPdf` not defined.

- [ ] **Step 3: Implement, following the pattern of `src/lib/invoicing/invoice-pdf.tsx` (Document/Page/View/Text/StyleSheet from `@react-pdf/renderer`)**

```tsx
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export type GiftCardPdfView = {
  code: string;
  typeLabel: string;
  amountLabel: string | null;
  expiresAtLabel: string;
  beneficiaryName: string | null;
  personalMessage: string | null;
  consultantName: string;
};

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 12 },
  title: { fontSize: 20, marginBottom: 16 },
  code: { fontSize: 16, marginBottom: 24, fontFamily: "Courier" },
  row: { marginBottom: 8 },
  message: { marginTop: 24, fontStyle: "italic" },
});

const GiftCardPdf = ({ view }: { view: GiftCardPdfView }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Carte cadeau — {view.consultantName}</Text>
      <Text style={styles.code}>{view.code}</Text>
      <Text style={styles.row}>{view.typeLabel}</Text>
      {view.amountLabel && <Text style={styles.row}>Valeur : {view.amountLabel}</Text>}
      <Text style={styles.row}>Valable jusqu&apos;au {view.expiresAtLabel}</Text>
      {view.beneficiaryName && (
        <Text style={styles.row}>Pour : {view.beneficiaryName}</Text>
      )}
      {view.personalMessage && (
        <Text style={styles.message}>{view.personalMessage}</Text>
      )}
    </Page>
  </Document>
);

export const renderGiftCardPdf = (view: GiftCardPdfView): Promise<Buffer> =>
  renderToBuffer(<GiftCardPdf view={view} />);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/gift-cards/pdf.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/gift-cards/pdf.tsx src/lib/gift-cards/pdf.spec.ts
git commit -m "feat(cartes-cadeaux): template PDF de la carte cadeau"
```

---

### Task 6: Emails d'achat (confirmation acheteur + code bénéficiaire)

**Files:**
- Create: `src/lib/gift-cards/emails.ts`
- Test: `src/lib/gift-cards/emails.spec.ts`

**Interfaces:**
- Consumes: `renderGiftCardPdf`, `GiftCardPdfView` (Task 5); `sendTransactionalEmail` (`src/lib/resend/client.ts`, existing).
- Produces: `type GiftCardEmailInput = { code: string; typeLabel: string; amountLabel: string | null; expiresAtLabel: string; buyerName: string; buyerEmail: string; beneficiaryName: string | null; beneficiaryEmail: string | null; personalMessage: string | null; deliveryMode: "email" | "pdf"; consultantName: string }`; `sendGiftCardPurchaseEmails(input: GiftCardEmailInput): Promise<void>` — envoie toujours la confirmation à l'acheteur ; si `deliveryMode === "email"` et `beneficiaryEmail` renseigné, envoie aussi l'email avec le code au bénéficiaire ; si `deliveryMode === "pdf"`, joint le PDF à l'email de l'acheteur.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();
vi.mock("@/lib/resend/client", () => ({
  sendTransactionalEmail: (...args: unknown[]) => mockSend(...args),
}));

const mockRenderPdf = vi.fn(async () => Buffer.from("pdf-bytes"));
vi.mock("./pdf", () => ({
  renderGiftCardPdf: (...args: unknown[]) => mockRenderPdf(...args),
}));

import { sendGiftCardPurchaseEmails, type GiftCardEmailInput } from "./emails";

const baseInput: GiftCardEmailInput = {
  code: "CADEAU-ABC234",
  typeLabel: "Carte cadeau — 90 €",
  amountLabel: "90,00 €",
  expiresAtLabel: "12 août 2027",
  buyerName: "Jean Martin",
  buyerEmail: "jean@example.com",
  beneficiaryName: null,
  beneficiaryEmail: null,
  personalMessage: null,
  deliveryMode: "email",
  consultantName: "Carole Hervé",
};

describe("sendGiftCardPurchaseEmails", () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockRenderPdf.mockClear();
  });

  it("always sends a confirmation email to the buyer", async () => {
    await sendGiftCardPurchaseEmails(baseInput);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jean@example.com" }),
    );
  });

  it("sends a second email with the code when delivery_mode=email and a beneficiary is set", async () => {
    await sendGiftCardPurchaseEmails({
      ...baseInput,
      beneficiaryName: "Marie Dupont",
      beneficiaryEmail: "marie@example.com",
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "marie@example.com" }),
    );
  });

  it("does not send a beneficiary email when delivery_mode=email but no beneficiary email is set", async () => {
    await sendGiftCardPurchaseEmails(baseInput);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("attaches the PDF to the buyer email when delivery_mode=pdf", async () => {
    await sendGiftCardPurchaseEmails({ ...baseInput, deliveryMode: "pdf" });

    expect(mockRenderPdf).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jean@example.com",
        attachments: [
          expect.objectContaining({ filename: expect.stringContaining("CADEAU-ABC234") }),
        ],
      }),
    );
  });

  it("does not send a beneficiary email when delivery_mode=pdf", async () => {
    await sendGiftCardPurchaseEmails({
      ...baseInput,
      deliveryMode: "pdf",
      beneficiaryEmail: "marie@example.com",
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/gift-cards/emails.spec.ts`
Expected: FAIL — `sendGiftCardPurchaseEmails` not defined.

- [ ] **Step 3: Implement**

```ts
import { sendTransactionalEmail } from "@/lib/resend/client";
import { renderGiftCardPdf } from "./pdf";

export type GiftCardEmailInput = {
  code: string;
  typeLabel: string;
  amountLabel: string | null;
  expiresAtLabel: string;
  buyerName: string;
  buyerEmail: string;
  beneficiaryName: string | null;
  beneficiaryEmail: string | null;
  personalMessage: string | null;
  deliveryMode: "email" | "pdf";
  consultantName: string;
};

export const sendGiftCardPurchaseEmails = async (
  input: GiftCardEmailInput,
): Promise<void> => {
  const pdfView = {
    code: input.code,
    typeLabel: input.typeLabel,
    amountLabel: input.amountLabel,
    expiresAtLabel: input.expiresAtLabel,
    beneficiaryName: input.beneficiaryName,
    personalMessage: input.personalMessage,
    consultantName: input.consultantName,
  };

  const buyerHtml = `
    <p>Bonjour ${input.buyerName},</p>
    <p>Votre carte cadeau <strong>${input.code}</strong> est confirmée.</p>
    <p>${input.typeLabel}${input.amountLabel ? ` — ${input.amountLabel}` : ""}</p>
    <p>Valable jusqu'au ${input.expiresAtLabel}.</p>
  `;

  if (input.deliveryMode === "pdf") {
    const pdf = await renderGiftCardPdf(pdfView);
    await sendTransactionalEmail({
      to: input.buyerEmail,
      subject: "Votre carte cadeau",
      html: buyerHtml,
      attachments: [{ filename: `${input.code}.pdf`, content: pdf }],
    });
    return;
  }

  await sendTransactionalEmail({
    to: input.buyerEmail,
    subject: "Votre carte cadeau",
    html: buyerHtml,
  });

  if (input.beneficiaryEmail) {
    const beneficiaryHtml = `
      <p>Bonjour ${input.beneficiaryName ?? ""},</p>
      <p>${input.buyerName} vous offre une carte cadeau.</p>
      <p>Votre code : <strong>${input.code}</strong></p>
      <p>${input.typeLabel}${input.amountLabel ? ` — ${input.amountLabel}` : ""}</p>
      <p>Valable jusqu'au ${input.expiresAtLabel}.</p>
      ${input.personalMessage ? `<p><em>${input.personalMessage}</em></p>` : ""}
    `;

    await sendTransactionalEmail({
      to: input.beneficiaryEmail,
      subject: `${input.buyerName} vous offre une carte cadeau`,
      html: beneficiaryHtml,
    });
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/gift-cards/emails.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/gift-cards/emails.ts src/lib/gift-cards/emails.spec.ts
git commit -m "feat(cartes-cadeaux): emails de confirmation achat et code bénéficiaire"
```

---

### Task 7: Achat en ligne — Checkout Session + page

**Files:**
- Create: `src/app/(public)/cartes-cadeaux/actions.ts`
- Create: `src/app/(public)/cartes-cadeaux/page.tsx`
- Test: `src/app/(public)/cartes-cadeaux/actions.spec.ts`

**Interfaces:**
- Consumes: `createCheckoutSession` (`src/lib/stripe/connect.ts`, existing — same signature as documented for `/reserver`).
- Produces: `type PurchaseGiftCardInput = { type: "amount" | "service"; amountCents?: number; consultationTypeId?: string; buyerName: string; buyerEmail: string; beneficiaryName?: string; beneficiaryEmail?: string; personalMessage?: string; deliveryMode: "email" | "pdf" }`; `purchaseGiftCard(input: PurchaseGiftCardInput): Promise<ActionResult<{ checkoutUrl: string }>>` (reuse the existing `ActionResult<T>` type used across the app's other server actions).

- [ ] **Step 1: Write the failing tests, following the mocking pattern of `src/app/(public)/reserver/actions.spec.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "consultant-1", stripe_account_id: "acct_1", commission_rate: 15 },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

const mockCreateCheckoutSession = vi.fn(async () => ({
  id: "cs_test_1",
  url: "https://checkout.stripe.com/cs_test_1",
}));
vi.mock("@/lib/stripe/connect", () => ({
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
}));

import { purchaseGiftCard } from "./actions";

describe("purchaseGiftCard", () => {
  beforeEach(() => mockCreateCheckoutSession.mockClear());

  it("rejects an amount not in the predefined list", async () => {
    const result = await purchaseGiftCard({
      type: "amount",
      amountCents: 4200,
      buyerName: "Jean Martin",
      buyerEmail: "jean@example.com",
      deliveryMode: "email",
    });

    expect(result.success).toBe(false);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("rejects an amount-type card missing amountCents", async () => {
    const result = await purchaseGiftCard({
      type: "amount",
      buyerName: "Jean Martin",
      buyerEmail: "jean@example.com",
      deliveryMode: "email",
    });

    expect(result.success).toBe(false);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("rejects a service-type card missing consultationTypeId", async () => {
    const result = await purchaseGiftCard({
      type: "service",
      buyerName: "Jean Martin",
      buyerEmail: "jean@example.com",
      deliveryMode: "email",
    });

    expect(result.success).toBe(false);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("creates a checkout session with gift_card metadata for a valid amount card", async () => {
    const result = await purchaseGiftCard({
      type: "amount",
      amountCents: 9000,
      buyerName: "Jean Martin",
      buyerEmail: "jean@example.com",
      beneficiaryEmail: "marie@example.com",
      deliveryMode: "email",
    });

    expect(result).toEqual({
      success: true,
      data: { checkoutUrl: "https://checkout.stripe.com/cs_test_1" },
    });
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        priceInCents: 9000,
        customerEmail: "jean@example.com",
        metadata: expect.objectContaining({
          type: "gift_card",
          gift_card_type: "amount",
          gift_card_amount_cents: "9000",
          buyer_email: "jean@example.com",
          delivery_mode: "email",
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/\(public\)/cartes-cadeaux/actions.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the server action**

```ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe/connect";
import { siteConfig } from "@/config/site";
import type { ActionResult } from "@/types/actions";

const PREDEFINED_AMOUNTS_CENTS = [9000, 13000, 17000];

export type PurchaseGiftCardInput = {
  type: "amount" | "service";
  amountCents?: number;
  consultationTypeId?: string;
  buyerName: string;
  buyerEmail: string;
  beneficiaryName?: string;
  beneficiaryEmail?: string;
  personalMessage?: string;
  deliveryMode: "email" | "pdf";
};

export const purchaseGiftCard = async (
  input: PurchaseGiftCardInput,
): Promise<ActionResult<{ checkoutUrl: string }>> => {
  if (input.type === "amount") {
    if (!input.amountCents || !PREDEFINED_AMOUNTS_CENTS.includes(input.amountCents)) {
      return { success: false, error: "Montant invalide." };
    }
  } else {
    if (!input.consultationTypeId) {
      return { success: false, error: "Prestation manquante." };
    }
  }

  const supabase = createAdminClient();
  // Site solo-praticienne : une seule consultante active.
  const { data: consultant } = await supabase
    .from("consultants")
    .select("id, stripe_account_id, commission_rate")
    .eq("is_active", true)
    .maybeSingle();

  if (!consultant) {
    return { success: false, error: "Praticienne introuvable." };
  }

  const priceInCents =
    input.type === "amount"
      ? input.amountCents!
      : await getConsultationTypePrice(supabase, input.consultationTypeId!);

  if (priceInCents == null) {
    return { success: false, error: "Prestation introuvable." };
  }

  const session = await createCheckoutSession({
    consultantStripeAccountId: consultant.stripe_account_id ?? undefined,
    commissionRate: consultant.commission_rate,
    priceInCents,
    currency: "eur",
    productName: "Carte cadeau",
    customerEmail: input.buyerEmail,
    metadata: {
      type: "gift_card",
      gift_card_type: input.type,
      ...(input.type === "amount"
        ? { gift_card_amount_cents: String(input.amountCents) }
        : { consultation_type_id: input.consultationTypeId! }),
      consultant_id: consultant.id,
      buyer_name: input.buyerName,
      buyer_email: input.buyerEmail,
      ...(input.beneficiaryName ? { beneficiary_name: input.beneficiaryName } : {}),
      ...(input.beneficiaryEmail ? { beneficiary_email: input.beneficiaryEmail } : {}),
      ...(input.personalMessage ? { personal_message: input.personalMessage } : {}),
      delivery_mode: input.deliveryMode,
    },
    successUrl: `${siteConfig.url}/cartes-cadeaux/confirmation`,
    cancelUrl: `${siteConfig.url}/cartes-cadeaux`,
  });

  if (!session.url) {
    return { success: false, error: "Impossible de créer la session de paiement." };
  }

  return { success: true, data: { checkoutUrl: session.url } };
};

const getConsultationTypePrice = async (
  supabase: ReturnType<typeof createAdminClient>,
  consultationTypeId: string,
): Promise<number | null> => {
  const { data } = await supabase
    .from("consultation_types")
    .select("price_cents")
    .eq("id", consultationTypeId)
    .maybeSingle();
  return data?.price_cents ?? null;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/app/\(public\)/cartes-cadeaux/actions.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the purchase page (minimal functional form, no dedicated test — covered indirectly by `actions.spec.ts`)**

```tsx
"use client";

import { useState } from "react";
import { purchaseGiftCard } from "./actions";

const AMOUNTS_CENTS = [9000, 13000, 17000];

export default function GiftCardPurchasePage() {
  const [amountCents, setAmountCents] = useState(AMOUNTS_CENTS[0]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"email" | "pdf">("email");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    setPending(true);
    setError(null);
    const result = await purchaseGiftCard({
      type: "amount",
      amountCents,
      buyerName,
      buyerEmail,
      beneficiaryName: beneficiaryName || undefined,
      beneficiaryEmail: beneficiaryEmail || undefined,
      personalMessage: personalMessage || undefined,
      deliveryMode,
    });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.href = result.data.checkoutUrl;
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Offrir une carte cadeau</h1>
      <div className="space-y-4">
        <div className="flex gap-2">
          {AMOUNTS_CENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => setAmountCents(cents)}
              className={amountCents === cents ? "border-2 border-primary p-2" : "border p-2"}
            >
              {(cents / 100).toFixed(0)} €
            </button>
          ))}
        </div>
        <input
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="Votre nom"
          className="w-full border p-2"
        />
        <input
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          placeholder="Votre email"
          className="w-full border p-2"
        />
        <input
          value={beneficiaryName}
          onChange={(e) => setBeneficiaryName(e.target.value)}
          placeholder="Nom du/de la bénéficiaire (optionnel)"
          className="w-full border p-2"
        />
        <input
          value={beneficiaryEmail}
          onChange={(e) => setBeneficiaryEmail(e.target.value)}
          placeholder="Email du/de la bénéficiaire (optionnel)"
          className="w-full border p-2"
        />
        <textarea
          value={personalMessage}
          onChange={(e) => setPersonalMessage(e.target.value)}
          placeholder="Message personnalisé (optionnel)"
          className="w-full border p-2"
        />
        <div className="flex gap-4">
          <label>
            <input
              type="radio"
              checked={deliveryMode === "email"}
              onChange={() => setDeliveryMode("email")}
            />
            {" "}Envoi par email
          </label>
          <label>
            <input
              type="radio"
              checked={deliveryMode === "pdf"}
              onChange={() => setDeliveryMode("pdf")}
            />
            {" "}PDF imprimable
          </label>
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="w-full bg-primary p-3 text-white"
        >
          {pending ? "Redirection…" : "Payer"}
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(public\)/cartes-cadeaux/actions.ts src/app/\(public\)/cartes-cadeaux/actions.spec.ts src/app/\(public\)/cartes-cadeaux/page.tsx
git commit -m "feat(cartes-cadeaux): achat en ligne via Stripe Checkout"
```

---

### Task 8: Webhook — création de la carte à l'achat

**Files:**
- Modify: `src/lib/stripe/webhooks.ts` (add `case "gift_card":` in `handleCheckoutCompleted`'s switch, add `handleGiftCardPurchase`)
- Modify: `src/lib/invoicing/emit.ts` (`describeSale`: add `if (type === "gift_card") return "Carte cadeau";`)
- Modify: `src/types/database.ts:44` (`PaymentType` union: add `"gift_card"`)
- Test: `src/lib/stripe/webhooks.gift-card.spec.ts`

**Interfaces:**
- Consumes: `insertGiftCardWithUniqueCode` (Task 2), `sendGiftCardPurchaseEmails` (Task 6).
- Produces: `handleGiftCardPurchase(metadata: Record<string, string | undefined>, paymentIntentId: string | null): Promise<void>` — exported for the test; creates the `gift_cards` row and sends the purchase emails. Does not touch `payments`/`invoices` directly — the existing generic code right after the `switch` in `handleCheckoutCompleted` (unchanged) upserts the `payments` row with `type: "gift_card"` and calls `emitInvoiceForPayment`, exactly as it already does for `accompagnement`/`booking`/`formation`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn(async () => ({
  id: "gc-1",
  code: "CADEAU-ABC234",
  expires_at: "2027-08-12T00:00:00.000Z",
}));
vi.mock("@/lib/gift-cards/code", () => ({
  insertGiftCardWithUniqueCode: (...args: unknown[]) => mockInsert(...args),
}));

const mockSendEmails = vi.fn(async () => {});
vi.mock("@/lib/gift-cards/emails", () => ({
  sendGiftCardPurchaseEmails: (...args: unknown[]) => mockSendEmails(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
  }),
}));

import { handleGiftCardPurchase } from "./webhooks";

describe("handleGiftCardPurchase", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockSendEmails.mockClear();
  });

  it("creates an amount gift card with a 12-month expiry and sends emails", async () => {
    await handleGiftCardPurchase(
      {
        gift_card_type: "amount",
        gift_card_amount_cents: "9000",
        consultant_id: "consultant-1",
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        delivery_mode: "email",
      },
      "pi_123",
    );

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-ABC234");
    expect(row).toMatchObject({
      type: "amount",
      initial_amount_cents: 9000,
      consultant_id: "consultant-1",
      buyer_name: "Jean Martin",
      buyer_email: "jean@example.com",
      delivery_mode: "email",
      created_by: "purchase",
    });
    expect(mockSendEmails).toHaveBeenCalledTimes(1);
  });

  it("creates a service gift card with the consultation_type_id", async () => {
    await handleGiftCardPurchase(
      {
        gift_card_type: "service",
        consultation_type_id: "ct-1",
        consultant_id: "consultant-1",
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        delivery_mode: "pdf",
      },
      "pi_123",
    );

    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-XYZ987");
    expect(row).toMatchObject({
      type: "service",
      consultation_type_id: "ct-1",
      initial_amount_cents: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/stripe/webhooks.gift-card.spec.ts`
Expected: FAIL — `handleGiftCardPurchase` not exported.

- [ ] **Step 3: Add `handleGiftCardPurchase` to `src/lib/stripe/webhooks.ts`, export it, wire it in the switch**

Add near the top with the other imports:
```ts
import { insertGiftCardWithUniqueCode } from "@/lib/gift-cards/code";
import { sendGiftCardPurchaseEmails } from "@/lib/gift-cards/emails";
```

Add the case in the `switch (type)` block inside `handleCheckoutCompleted` (after the existing `case "formation":` branch):
```ts
    case "gift_card":
      await handleGiftCardPurchase(metadata, paymentIntentId ?? null);
      break;
```

Add the exported function (near `handleFormationPurchase`, same file):
```ts
export const handleGiftCardPurchase = async (
  metadata: Record<string, string | undefined>,
  _paymentIntentId: string | null,
): Promise<void> => {
  const supabase = getSupabase();
  const isAmount = metadata.gift_card_type === "amount";

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  const card = await insertGiftCardWithUniqueCode(supabase, (code) => ({
    code,
    type: metadata.gift_card_type,
    initial_amount_cents: isAmount ? Number(metadata.gift_card_amount_cents) : null,
    consultation_type_id: isAmount ? null : metadata.consultation_type_id,
    consultant_id: metadata.consultant_id,
    buyer_name: metadata.buyer_name,
    buyer_email: metadata.buyer_email,
    beneficiary_name: metadata.beneficiary_name ?? null,
    beneficiary_email: metadata.beneficiary_email ?? null,
    personal_message: metadata.personal_message ?? null,
    delivery_mode: metadata.delivery_mode,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_by: "purchase",
  }));

  await sendGiftCardPurchaseEmails({
    code: card.code,
    typeLabel: isAmount ? "Carte cadeau" : "Carte cadeau — prestation offerte",
    amountLabel: isAmount
      ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
          Number(metadata.gift_card_amount_cents) / 100,
        )
      : null,
    expiresAtLabel: new Date(card.expires_at).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    buyerName: metadata.buyer_name ?? "",
    buyerEmail: metadata.buyer_email ?? "",
    beneficiaryName: metadata.beneficiary_name ?? null,
    beneficiaryEmail: metadata.beneficiary_email ?? null,
    personalMessage: metadata.personal_message ?? null,
    deliveryMode: metadata.delivery_mode as "email" | "pdf",
    consultantName: "Carole Hervé",
  });
};
```

- [ ] **Step 4: Extend `PaymentType` and `describeSale`**

In `src/types/database.ts:44`:
```ts
export type PaymentType = "accompagnement" | "booking" | "formation" | "gift_card";
```

In `src/lib/invoicing/emit.ts`, inside `describeSale`, add before the final `booking` fallback branch:
```ts
  if (type === "gift_card") {
    return "Carte cadeau";
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/stripe/webhooks.gift-card.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Run the full existing webhook test suite to confirm no regression**

Run: `pnpm vitest run src/lib/stripe/webhooks.spec.ts`
Expected: PASS (no change to existing behavior for `accompagnement`/`booking`/`formation`)

- [ ] **Step 7: Commit**

```bash
git add src/lib/stripe/webhooks.ts src/lib/stripe/webhooks.gift-card.spec.ts src/lib/invoicing/emit.ts src/types/database.ts
git commit -m "feat(cartes-cadeaux): création de la carte au webhook, facture immédiate réutilisée"
```

---

### Task 9: Application à la réservation (`/reserver`)

**Files:**
- Modify: `src/app/(public)/reserver/actions.ts` (around lines 580-660 — the promo-code and checkout-session block described in Task interfaces below)
- Modify: `src/lib/stripe/webhooks.ts` (`handleBookingConfirmation` — finalize the redemption once the booking is confirmed)
- Test: `src/app/(public)/reserver/actions.gift-card.spec.ts`

**Interfaces:**
- Consumes: `lookupGiftCard` (Task 4) for the real-time check exposed to the UI; `redeemGiftCard` (Task 3), called from the webhook after payment confirmation, not from the booking action itself.
- Produces: `checkGiftCardForBooking(code: string, amountCents: number): Promise<{ ok: true; discountCents: number } | { ok: false; error: string }>` (new exported server action in `reserver/actions.ts`, read-only, wraps `lookupGiftCard` and computes `discountCents = min(balanceCents, amountCents)` for an amount card, or `amountCents` itself for a matching service card) — used by the booking form before submission. `createBooking`'s existing input gains one optional field: `giftCardCode?: string` (not a validity/amount flag — just the code the redemption re-verifies server-side).

- [ ] **Step 1: Write the failing test for `checkGiftCardForBooking`**

```ts
import { describe, it, expect, vi } from "vitest";

const mockLookup = vi.fn();
vi.mock("@/lib/gift-cards/balance", () => ({
  lookupGiftCard: (...args: unknown[]) => mockLookup(...args),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { checkGiftCardForBooking } from "./actions";

describe("checkGiftCardForBooking", () => {
  it("caps the discount to the remaining balance for an amount card", async () => {
    mockLookup.mockResolvedValueOnce({
      ok: true,
      giftCardId: "gc-1",
      type: "amount",
      balanceCents: 4000,
      consultationTypeId: null,
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    const result = await checkGiftCardForBooking("CADEAU-ABC234", 9000);
    expect(result).toEqual({ ok: true, discountCents: 4000 });
  });

  it("applies the full price for a service card", async () => {
    mockLookup.mockResolvedValueOnce({
      ok: true,
      giftCardId: "gc-2",
      type: "service",
      balanceCents: null,
      consultationTypeId: "ct-1",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    const result = await checkGiftCardForBooking("CADEAU-XYZ987", 9000);
    expect(result).toEqual({ ok: true, discountCents: 9000 });
  });

  it("surfaces a not-found error", async () => {
    mockLookup.mockResolvedValueOnce({ ok: false, error: "not_found" });
    const result = await checkGiftCardForBooking("CADEAU-NOPE00", 9000);
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/\(public\)/reserver/actions.gift-card.spec.ts`
Expected: FAIL — `checkGiftCardForBooking` not exported.

- [ ] **Step 3: Add `checkGiftCardForBooking` to `src/app/(public)/reserver/actions.ts`**

```ts
import { lookupGiftCard } from "@/lib/gift-cards/balance";

export const checkGiftCardForBooking = async (
  code: string,
  amountCents: number,
): Promise<{ ok: true; discountCents: number } | { ok: false; error: string }> => {
  const supabase = createAdminClient();
  const lookup = await lookupGiftCard(supabase, code);

  if (!lookup.ok) return { ok: false, error: lookup.error };

  const discountCents =
    lookup.type === "amount" ? Math.min(lookup.balanceCents!, amountCents) : amountCents;

  return { ok: true, discountCents };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/\(public\)/reserver/actions.gift-card.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Wire the discount into `createBooking`'s pricing (around `actions.ts:601`)**

Read the surrounding ~40 lines of `src/app/(public)/reserver/actions.ts` first (the promo block ending at `const chargedCents = promo?.ok ? promo.finalCents : totalPriceCents;`, line 601) to confirm the exact current variable names before editing — they may have shifted since this plan was written. Then add, immediately after that line:

```ts
    let giftCardDiscountCents = 0;
    if (giftCardCode) {
      const giftCardCheck = await checkGiftCardForBooking(giftCardCode, chargedCents);
      if (giftCardCheck.ok) giftCardDiscountCents = giftCardCheck.discountCents;
    }
    const finalChargedCents = Math.max(0, chargedCents - giftCardDiscountCents);
```

Replace the subsequent use of `chargedCents` in the `createCheckoutSession(...)` call (`priceInCents: chargedCents`) with `finalChargedCents`, and add to that call's `metadata`:
```ts
      ...(giftCardCode
        ? { gift_card_code: giftCardCode, gift_card_discount_cents: String(giftCardDiscountCents) }
        : {}),
```

Add `giftCardCode?: string` to `createBooking`'s input parameter type (find the type alongside the function signature at `actions.ts:421` and extend it there).

- [ ] **Step 6: Write the failing test for finalizing the redemption in the webhook**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedeem = vi.fn(async () => ({ ok: true, redemptionId: "red-1", amountCents: 4000 }));
vi.mock("@/lib/gift-cards/redeem", () => ({
  redeemGiftCard: (...args: unknown[]) => mockRedeem(...args),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ insert: () => ({ error: null }) }),
  }),
}));

import { finalizeBookingGiftCardRedemption } from "./webhooks";

describe("finalizeBookingGiftCardRedemption", () => {
  beforeEach(() => mockRedeem.mockClear());

  it("does nothing when no gift card code is present", async () => {
    await finalizeBookingGiftCardRedemption(
      { booking_id: "b-1", consultant_id: "c-1" },
      "b-1",
    );
    expect(mockRedeem).not.toHaveBeenCalled();
  });

  it("redeems the discounted amount against the booking when a code is present", async () => {
    await finalizeBookingGiftCardRedemption(
      {
        gift_card_code: "CADEAU-ABC234",
        gift_card_discount_cents: "4000",
        consultant_id: "c-1",
      },
      "b-1",
    );

    expect(mockRedeem).toHaveBeenCalledWith(
      expect.anything(),
      {
        code: "CADEAU-ABC234",
        amountCents: 4000,
        bookingId: "b-1",
        recordedBy: "c-1",
      },
    );
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm vitest run src/lib/stripe/webhooks.gift-card.spec.ts`
Expected: FAIL — `finalizeBookingGiftCardRedemption` not exported.

- [ ] **Step 8: Implement and wire it into `handleCheckoutCompleted`**

Add to `src/lib/stripe/webhooks.ts`:
```ts
import { redeemGiftCard } from "@/lib/gift-cards/redeem";

export const finalizeBookingGiftCardRedemption = async (
  metadata: Record<string, string | undefined>,
  bookingId: string,
): Promise<void> => {
  if (!metadata.gift_card_code) return;

  const result = await redeemGiftCard(getSupabase(), {
    code: metadata.gift_card_code,
    amountCents: Number(metadata.gift_card_discount_cents ?? "0"),
    bookingId,
    recordedBy: metadata.consultant_id!,
  });

  if (!result.ok) {
    // Cas rare : le solde a ete consomme entre la verification temps reel et
    // la confirmation du paiement (deux reservations concurrentes sur le
    // meme code). L'argent est deja encaisse ; on trace plutot que d'echouer
    // le webhook, meme logique que logInvoiceIssue.
    await getSupabase().from("audit_logs").insert({
      user_id: metadata.consultant_id,
      action: "gift_card_redemption_failed",
      entity_type: "booking",
      entity_id: bookingId,
      metadata: { code: metadata.gift_card_code, error: result.error },
    });
  }
};
```

In `handleCheckoutCompleted`, after the existing `bookingOutcome` handling and before the `payments` upsert (i.e. right after the `if (redemptionId && slotConflict) { await cancelRedemption(redemptionId); }` block), add:
```ts
  if (type === "booking" && bookingOutcome === "created" && !slotConflict) {
    await finalizeBookingGiftCardRedemption(metadata, reference_id);
  }
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/stripe/webhooks.gift-card.spec.ts src/app/\(public\)/reserver/actions.gift-card.spec.ts`
Expected: PASS (all tests from steps 1 and 6)

- [ ] **Step 10: Run the full existing reserver and webhook suites to confirm no regression**

Run: `pnpm vitest run src/app/\(public\)/reserver/actions.spec.ts src/lib/stripe/webhooks.spec.ts`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/app/\(public\)/reserver/actions.ts src/app/\(public\)/reserver/actions.gift-card.spec.ts src/lib/stripe/webhooks.ts src/lib/stripe/webhooks.gift-card.spec.ts
git commit -m "feat(cartes-cadeaux): application d'une carte cadeau à la réservation"
```

---

### Task 10: Application à la facture (back-office)

**Files:**
- Modify: `src/app/(dashboard)/espace-consultante/facturation/actions.ts` (`createManualInvoice`, around line 168)
- Test: modify `src/app/(dashboard)/espace-consultante/facturation/actions.spec.ts` (add cases) or create `src/app/(dashboard)/espace-consultante/facturation/actions.gift-card.spec.ts` if the existing file's mocking setup is easier to extend as a sibling file — check the existing file first and pick whichever avoids duplicating its full mock setup.

**Interfaces:**
- Consumes: `redeemGiftCard` (Task 3).
- Produces: `createManualInvoice`'s input gains one optional field: `giftCardCode?: string`. When present, after the invoice is created (existing `created.id` from the RPC), calls `redeemGiftCard` with `amountCents = min(remaining balance/service price, invoice.amount_ttc_cents)` and `invoiceId: created.id`, `recordedBy: user.id`. On failure, the invoice still stands (already created) — return `{ success: true, data: { invoiceId }, warning: "..." }` if the codebase's `ActionResult` type supports a warning field; otherwise (verify by reading `src/types/actions.ts` first) return success as today and log via `console.error`, matching the existing non-blocking pattern used for `sendInvoiceEmail` failures three lines below in the same function.

- [ ] **Step 1: Read `src/types/actions.ts` to confirm the exact `ActionResult<T>` shape before writing the test (whether it supports an optional `warning` field)**

- [ ] **Step 2: Write the failing test**

```ts
// Add to the existing describe("createManualInvoice", ...) block, or a new
// sibling file reusing the same vi.mock setup as the existing spec file.
const mockRedeem = vi.fn(async () => ({ ok: true, redemptionId: "red-1", amountCents: 5000 }));
vi.mock("@/lib/gift-cards/redeem", () => ({
  redeemGiftCard: (...args: unknown[]) => mockRedeem(...args),
}));

it("redeems the gift card against the invoice when giftCardCode is provided", async () => {
  const result = await createManualInvoice({
    clientId: "client-1",
    description: "Consultation",
    ttcCents: 5000,
    giftCardCode: "CADEAU-ABC234",
  });

  expect(result.success).toBe(true);
  expect(mockRedeem).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      code: "CADEAU-ABC234",
      amountCents: 5000,
      invoiceId: expect.any(String),
    }),
  );
});

it("still returns the created invoice when giftCardCode is omitted", async () => {
  const result = await createManualInvoice({
    clientId: "client-1",
    description: "Consultation",
    ttcCents: 5000,
  });

  expect(result.success).toBe(true);
  expect(mockRedeem).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts`
Expected: FAIL — `giftCardCode` ignored / `redeemGiftCard` not called.

- [ ] **Step 4: Implement — add the import and extend `createManualInvoice`**

Add the import:
```ts
import { redeemGiftCard } from "@/lib/gift-cards/redeem";
```

Extend the input type (`actions.ts:168`):
```ts
export const createManualInvoice = async (input: {
  clientId: string;
  description: string;
  ttcCents: number;
  dueDate?: string;
  giftCardCode?: string;
}): Promise<ActionResult<{ invoiceId: string }>> => {
```

Immediately after `const created = invoice as { id: string };` (line 240), before the `sendInvoiceEmail` try block:
```ts
  if (input.giftCardCode) {
    const redemption = await redeemGiftCard(supabase, {
      code: input.giftCardCode,
      amountCents: input.ttcCents,
      invoiceId: created.id,
      recordedBy: user.id,
    });
    if (!redemption.ok) {
      console.error("[createManualInvoice] carte cadeau", redemption.error);
    }
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/app/\(dashboard\)/espace-consultante/facturation/actions.spec.ts`
Expected: PASS (all existing tests + the 2 new ones)

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/espace-consultante/facturation/actions.ts" "src/app/(dashboard)/espace-consultante/facturation/actions.spec.ts"
git commit -m "feat(cartes-cadeaux): application d'une carte cadeau à une facture manuelle"
```

---

### Task 11: Back-office — liste et émission manuelle

**Files:**
- Create: `src/app/(dashboard)/admin/cartes-cadeaux/actions.ts`
- Create: `src/app/(dashboard)/admin/cartes-cadeaux/page.tsx`
- Test: `src/app/(dashboard)/admin/cartes-cadeaux/actions.spec.ts`

**Interfaces:**
- Consumes: `insertGiftCardWithUniqueCode` (Task 2). Does not call `createManualInvoice` directly to avoid a client/server-action-relationship circular check (`hasClientRelationship` requires an existing client, but a manually-issued gift card's buyer may not be an existing client) — instead builds the same `create_manual_invoice` RPC payload inline, scoped to `is_admin()`.
- Produces: `listGiftCards(): Promise<ActionResult<GiftCardListItem[]>>` where `type GiftCardListItem = { id: string; code: string; type: "amount" | "service"; status: string; balanceCents: number | null; buyerName: string; issuedAt: string; expiresAt: string }`; `issueGiftCardManually(input: { type: "amount" | "service"; amountCents?: number; consultationTypeId?: string; buyerName: string; buyerEmail: string; beneficiaryName?: string; beneficiaryEmail?: string; personalMessage?: string; deliveryMode: "email" | "pdf" }): Promise<ActionResult<{ giftCardId: string; code: string }>>`.

- [ ] **Step 1: Write the failing tests, following the `requireAdmin` pattern from `src/app/(dashboard)/admin/consultantes/actions.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockInsert = vi.fn(async () => ({
  id: "gc-1",
  code: "CADEAU-ABC234",
  expires_at: "2027-08-12T00:00:00.000Z",
}));
vi.mock("@/lib/gift-cards/code", () => ({
  insertGiftCardWithUniqueCode: (...args: unknown[]) => mockInsert(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        order: async () => ({ data: [], error: null }),
      }),
    }),
  }),
}));

import { issueGiftCardManually, listGiftCards } from "./actions";

describe("admin cartes-cadeaux actions", () => {
  beforeEach(() => {
    mockGetSessionUser.mockClear();
    mockInsert.mockClear();
  });

  it("rejects issuance for a non-admin session", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "u-1", email: "a@b.com", roles: ["client"] });

    await expect(
      issueGiftCardManually({
        type: "amount",
        amountCents: 9000,
        buyerName: "Geste commercial",
        buyerEmail: "client@example.com",
        deliveryMode: "email",
      }),
    ).rejects.toBeTruthy();

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("issues a gift card with created_by=manual for an admin session", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "admin-1", email: "admin@example.com", roles: ["admin"] });

    const result = await issueGiftCardManually({
      type: "amount",
      amountCents: 9000,
      buyerName: "Geste commercial",
      buyerEmail: "client@example.com",
      deliveryMode: "email",
    });

    expect(result.success).toBe(true);
    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-ABC234");
    expect(row).toMatchObject({ created_by: "manual", created_by_admin_id: "admin-1" });
  });

  it("lists gift cards for an admin session", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "admin-1", email: "admin@example.com", roles: ["admin"] });
    const result = await listGiftCards();
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run "src/app/(dashboard)/admin/cartes-cadeaux/actions.spec.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Read `src/app/(dashboard)/admin/consultantes/actions.ts` first to copy the exact `requireAdmin`/`redirect` pattern used elsewhere in this dashboard (it throws via `redirect`, which in the Next.js test environment surfaces as a thrown value — matches the `rejects.toBeTruthy()` expectation above), then:

```ts
"use server";

import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertGiftCardWithUniqueCode } from "@/lib/gift-cards/code";
import type { ActionResult } from "@/types/actions";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

export type GiftCardListItem = {
  id: string;
  code: string;
  type: "amount" | "service";
  status: string;
  balanceCents: number | null;
  buyerName: string;
  issuedAt: string;
  expiresAt: string;
};

export const listGiftCards = async (): Promise<ActionResult<GiftCardListItem[]>> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("gift_cards")
    .select(
      "id, code, type, status, initial_amount_cents, buyer_name, issued_at, expires_at, gift_card_redemptions(amount_cents)",
    )
    .order("issued_at", { ascending: false });

  if (error || !data) {
    return { success: false, error: "Impossible de charger les cartes cadeaux." };
  }

  const items: GiftCardListItem[] = data.map((row) => {
    const redemptions = (row.gift_card_redemptions as { amount_cents: number }[] | null) ?? [];
    const used = redemptions.reduce((sum, r) => sum + r.amount_cents, 0);
    return {
      id: row.id,
      code: row.code,
      type: row.type,
      status: row.status,
      balanceCents: row.type === "amount" ? row.initial_amount_cents - used : null,
      buyerName: row.buyer_name,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
    };
  });

  return { success: true, data: items };
};

export const issueGiftCardManually = async (input: {
  type: "amount" | "service";
  amountCents?: number;
  consultationTypeId?: string;
  buyerName: string;
  buyerEmail: string;
  beneficiaryName?: string;
  beneficiaryEmail?: string;
  personalMessage?: string;
  deliveryMode: "email" | "pdf";
}): Promise<ActionResult<{ giftCardId: string; code: string }>> => {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: consultant } = await supabase
    .from("consultants")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!consultant) {
    return { success: false, error: "Praticienne introuvable." };
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  const card = await insertGiftCardWithUniqueCode(supabase, (code) => ({
    code,
    type: input.type,
    initial_amount_cents: input.type === "amount" ? input.amountCents : null,
    consultation_type_id: input.type === "service" ? input.consultationTypeId : null,
    consultant_id: consultant.id,
    buyer_name: input.buyerName,
    buyer_email: input.buyerEmail,
    beneficiary_name: input.beneficiaryName ?? null,
    beneficiary_email: input.beneficiaryEmail ?? null,
    personal_message: input.personalMessage ?? null,
    delivery_mode: input.deliveryMode,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_by: "manual",
    created_by_admin_id: admin.id,
  }));

  return { success: true, data: { giftCardId: card.id, code: card.code } };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run "src/app/(dashboard)/admin/cartes-cadeaux/actions.spec.ts"`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the list + manual-issuance page (minimal functional UI, no dedicated test)**

```tsx
import { listGiftCards } from "./actions";

export default async function AdminGiftCardsPage() {
  const result = await listGiftCards();
  const cards = result.success ? result.data : [];

  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Cartes cadeaux</h1>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border-b p-2">Code</th>
            <th className="border-b p-2">Type</th>
            <th className="border-b p-2">Statut</th>
            <th className="border-b p-2">Solde</th>
            <th className="border-b p-2">Acheteur</th>
            <th className="border-b p-2">Expire le</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id}>
              <td className="border-b p-2 font-mono">{card.code}</td>
              <td className="border-b p-2">{card.type === "amount" ? "Montant" : "Prestation"}</td>
              <td className="border-b p-2">{card.status}</td>
              <td className="border-b p-2">
                {card.balanceCents != null ? `${(card.balanceCents / 100).toFixed(2)} €` : "—"}
              </td>
              <td className="border-b p-2">{card.buyerName}</td>
              <td className="border-b p-2">
                {new Date(card.expiresAt).toLocaleDateString("fr-FR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/cartes-cadeaux"
git commit -m "feat(cartes-cadeaux): back-office — liste et émission manuelle"
```

---

## Post-implementation

After all tasks pass review: run the full suite (`pnpm vitest run`) and `pnpm build` once more, then hand off to `superpowers:finishing-a-development-branch` for the final full-branch review (server actions/RLS/CREATE OR REPLACE FUNCTION checks per the global constraints above) before merge.

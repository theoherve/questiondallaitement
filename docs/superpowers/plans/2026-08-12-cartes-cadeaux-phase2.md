# Cartes cadeaux — Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the rappel-avant-expiration email (§7.5) and the post-expiration refund/replacement procedure (§7.6 Exception 2) for the gift-card module, on top of the Phase 1 schema (`supabase/migrations/00100_gift_cards.sql`, PR #93, merged).

**Architecture:** One additive migration (no new enum values on `gift_card_status` — closed cards reuse `cancelled`), a bespoke reminder job registered in the existing hourly cron (`src/app/api/cron/route.ts`), and two new admin server actions on `/admin/cartes-cadeaux` following the existing `correctInvoice`/`correct-button.tsx` dialog pattern. No new customer-facing screen, no Stripe call.

**Tech Stack:** Next.js App Router, Supabase (Postgres + service-role client), Resend (`sendTransactionalEmail`), Vitest.

Design doc: `docs/superpowers/specs/2026-08-12-cartes-cadeaux-phase2-design.md`.

## Global Constraints

- Délai de recours après expiration : **90 jours** après `expires_at`, enforcé côté serveur, pas seulement caché côté UI.
- Aucun frais de gestion sur le remboursement exceptionnel.
- Durée de la carte de remplacement : **9 mois** à compter de son émission.
- Contact dédié : `contact@questiondallaitement.fr` (déjà en place via `NEXT_PUBLIC_CONTACT_EMAIL`, `src/config/site.ts:20` — aucun changement de code requis pour ce point).
- Rappel avant expiration : un seul envoi, **30 jours** avant `expires_at`.
- Aucun nouvel écran client-facing pour déposer une demande — traitement manuel par Carole depuis `/admin/cartes-cadeaux`, après réception de la demande par email.
- Aucun appel Stripe pour le remboursement — virement manuel hors app.
- Aucune valeur de solde/validité/éligibilité n'est jamais transmise par le client à une action d'écriture — toujours recalculée côté serveur depuis `gift_cards`/`gift_card_redemptions` (cf mémoire `server-actions-parametre-autorisation-attaquable`).
- Exception 1 (rétractation légale 14 jours, §7.6) est **hors scope** de ce plan.

---

### Task 1: Migration — colonnes rappel + clôture

**Files:**
- Create: `supabase/migrations/00101_gift_cards_phase2.sql`

**Interfaces:**
- Produces: colonnes `gift_cards.reminder_sent_at`, `gift_cards.closed_reason` (enum `gift_card_closed_reason`: `refunded` | `replaced`), `gift_cards.closed_at`, `gift_cards.closed_note`, `gift_cards.replaces_gift_card_id` — consommées par les tasks 3, 5, 6, 7.

- [ ] **Step 1: Write the migration**

```sql
-- Cartes cadeaux phase 2 : rappel avant expiration + procedure de
-- remboursement/prolongation apres expiration (Sec 7.5-7.6). Voir
-- docs/superpowers/specs/2026-08-12-cartes-cadeaux-phase2-design.md.
--
-- Pas de nouvelle valeur sur gift_card_status : une carte close par cette
-- procedure passe a 'cancelled' (deja utilise pour une carte annulee), et
-- closed_reason distingue remboursee vs remplacee.

ALTER TABLE gift_cards ADD COLUMN reminder_sent_at TIMESTAMPTZ;

CREATE TYPE gift_card_closed_reason AS ENUM ('refunded', 'replaced');

ALTER TABLE gift_cards ADD COLUMN closed_reason gift_card_closed_reason;
ALTER TABLE gift_cards ADD COLUMN closed_at TIMESTAMPTZ;
ALTER TABLE gift_cards ADD COLUMN closed_note TEXT;
ALTER TABLE gift_cards ADD COLUMN replaces_gift_card_id UUID REFERENCES gift_cards(id);

CREATE INDEX idx_gift_cards_replaces ON gift_cards(replaces_gift_card_id);

-- closed_at et closed_note doivent aller de pair avec closed_reason : une
-- carte close sans date tracee, ou une date sans raison, serait une
-- incoherence silencieuse indistinguable d'un oubli applicatif.
ALTER TABLE gift_cards ADD CONSTRAINT gift_cards_closed_consistency_chk CHECK (
  (closed_reason IS NULL AND closed_at IS NULL)
  OR (closed_reason IS NOT NULL AND closed_at IS NOT NULL)
);
```

- [ ] **Step 2: Verify the migration applies**

Ce projet n'a pas Docker disponible en session pour un run local complet (cf. limite déjà connue sur `REVOKE EXECUTE` de `redeem_gift_card()`, Phase 1). Si Docker est disponible cette fois :

Run: `supabase db reset` (ou `supabase migration up` selon le setup local)
Expected: la migration s'applique sans erreur, `\d gift_cards` montre les 5 nouvelles colonnes.

Si Docker n'est pas disponible, passer directement à la review SQL (relire le fichier une deuxième fois : noms de colonnes cohérents avec le reste du plan, contrainte CHECK correcte) et noter le report dans le message de commit.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00101_gift_cards_phase2.sql
git commit -m "feat(cartes-cadeaux): migration phase 2 (rappel + cloture apres expiration)"
```

---

### Task 2: Email de rappel avant expiration

**Files:**
- Modify: `src/lib/gift-cards/emails.ts`
- Modify: `src/lib/gift-cards/emails.spec.ts`

**Interfaces:**
- Consumes: `sendTransactionalEmail` (`src/lib/resend/client.ts`, déjà importé dans ce fichier).
- Produces: `sendGiftCardExpiryReminderEmail(input: GiftCardExpiryReminderInput): Promise<void>` — consommé par Task 3.

- [ ] **Step 1: Write the failing test**

Ajouter en fin de `src/lib/gift-cards/emails.spec.ts` :

```ts
import { sendGiftCardExpiryReminderEmail } from "./emails";

describe("sendGiftCardExpiryReminderEmail", () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it("sends a single reminder email to the given recipient", async () => {
    await sendGiftCardExpiryReminderEmail({
      code: "CADEAU-ABC234",
      typeLabel: "Carte cadeau",
      amountLabel: "70,00 €",
      expiresAtLabel: "12 septembre 2026",
      recipientName: "Marie Dupont",
      recipientEmail: "marie@example.com",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "marie@example.com",
        subject: expect.stringContaining("expire"),
      }),
    );
  });

  it("includes the code and amount in the email body", async () => {
    await sendGiftCardExpiryReminderEmail({
      code: "CADEAU-ABC234",
      typeLabel: "Carte cadeau",
      amountLabel: "70,00 €",
      expiresAtLabel: "12 septembre 2026",
      recipientName: "Marie Dupont",
      recipientEmail: "marie@example.com",
    });

    const call = mockSend.mock.calls[0][0] as { html: string };
    expect(call.html).toContain("CADEAU-ABC234");
    expect(call.html).toContain("70,00 €");
    expect(call.html).toContain("12 septembre 2026");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/gift-cards/emails.spec.ts`
Expected: FAIL — `sendGiftCardExpiryReminderEmail` is not exported by `./emails`.

- [ ] **Step 3: Write minimal implementation**

Ajouter en fin de `src/lib/gift-cards/emails.ts` :

```ts
export type GiftCardExpiryReminderInput = {
  code: string;
  typeLabel: string;
  amountLabel: string | null;
  expiresAtLabel: string;
  recipientName: string;
  recipientEmail: string;
};

export const sendGiftCardExpiryReminderEmail = async (
  input: GiftCardExpiryReminderInput,
): Promise<void> => {
  const html = `
    <p>Bonjour ${input.recipientName},</p>
    <p>Votre carte cadeau <strong>${input.code}</strong> expire le ${input.expiresAtLabel}.</p>
    <p>${input.typeLabel}${input.amountLabel ? ` — ${input.amountLabel}` : ""}</p>
    <p>Pensez à l'utiliser avant cette date.</p>
  `;

  await sendTransactionalEmail({
    to: input.recipientEmail,
    subject: "Votre carte cadeau expire bientôt",
    html,
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/gift-cards/emails.spec.ts`
Expected: PASS (7 tests — 5 existants + 2 nouveaux)

- [ ] **Step 5: Commit**

```bash
git add src/lib/gift-cards/emails.ts src/lib/gift-cards/emails.spec.ts
git commit -m "feat(cartes-cadeaux): email de rappel avant expiration"
```

---

### Task 3: Job périodique — sélection et envoi des rappels

**Files:**
- Create: `src/lib/gift-cards/reminders.ts`
- Create: `src/lib/gift-cards/reminders.spec.ts`
- Modify: `src/app/api/cron/route.ts`

**Interfaces:**
- Consumes: `sendGiftCardExpiryReminderEmail` (Task 2), colonne `reminder_sent_at` (Task 1).
- Produces: `sendGiftCardExpiryReminders(): Promise<number>` — enregistrée dans le tableau `results[...]` de `route.ts`, même pattern que `runModuleReminders`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/gift-cards/reminders.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendReminder = vi.fn(async () => {});
vi.mock("./emails", () => ({
  sendGiftCardExpiryReminderEmail: (...args: unknown[]) => mockSendReminder(...args),
}));

let cards: Record<string, unknown>[] = [];
const updatedIds: string[] = [];

const buildChain = () => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    gte: () => chain,
    lte: () => Promise.resolve({ data: cards, error: null }),
    update: (patch: Record<string, unknown>) => ({
      eq: (_col: string, id: string) => {
        updatedIds.push(id);
        expect(patch.reminder_sent_at).toBeDefined();
        return Promise.resolve({ error: null });
      },
    }),
  };
  return chain;
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => buildChain() }),
}));

import { sendGiftCardExpiryReminders } from "./reminders";

const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

describe("sendGiftCardExpiryReminders", () => {
  beforeEach(() => {
    mockSendReminder.mockClear();
    updatedIds.length = 0;
    cards = [];
  });

  it("sends a reminder to the beneficiary when set, else the buyer", async () => {
    cards = [
      {
        id: "gc-1",
        code: "CADEAU-ABC234",
        type: "amount",
        initial_amount_cents: 9000,
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        beneficiary_name: "Marie Dupont",
        beneficiary_email: "marie@example.com",
        expires_at: inDays(20),
        gift_card_redemptions: [],
      },
    ];

    const sent = await sendGiftCardExpiryReminders();

    expect(sent).toBe(1);
    expect(mockSendReminder).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: "marie@example.com" }),
    );
    expect(updatedIds).toEqual(["gc-1"]);
  });

  it("falls back to the buyer when there is no beneficiary", async () => {
    cards = [
      {
        id: "gc-2",
        code: "CADEAU-XYZ789",
        type: "service",
        initial_amount_cents: null,
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        beneficiary_name: null,
        beneficiary_email: null,
        expires_at: inDays(20),
        gift_card_redemptions: [],
      },
    ];

    await sendGiftCardExpiryReminders();

    expect(mockSendReminder).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: "jean@example.com" }),
    );
  });

  it("skips a fully-redeemed amount card even if still marked active", async () => {
    cards = [
      {
        id: "gc-3",
        code: "CADEAU-USED00",
        type: "amount",
        initial_amount_cents: 9000,
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        beneficiary_name: null,
        beneficiary_email: null,
        expires_at: inDays(20),
        gift_card_redemptions: [{ amount_cents: 9000 }],
      },
    ];

    const sent = await sendGiftCardExpiryReminders();

    expect(sent).toBe(0);
    expect(mockSendReminder).not.toHaveBeenCalled();
    expect(updatedIds).toEqual([]);
  });

  it("does not mark reminder_sent_at when the email send fails", async () => {
    mockSendReminder.mockRejectedValueOnce(new Error("resend down"));
    cards = [
      {
        id: "gc-4",
        code: "CADEAU-FAIL00",
        type: "amount",
        initial_amount_cents: 9000,
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        beneficiary_name: null,
        beneficiary_email: null,
        expires_at: inDays(20),
        gift_card_redemptions: [],
      },
    ];
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const sent = await sendGiftCardExpiryReminders();

    expect(sent).toBe(0);
    expect(updatedIds).toEqual([]);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/gift-cards/reminders.spec.ts`
Expected: FAIL — module `./reminders` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/gift-cards/reminders.ts
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGiftCardExpiryReminderEmail } from "./emails";

const REMINDER_WINDOW_DAYS = 30;

/**
 * Rappelle une seule fois, a J-30, l'expiration d'une carte cadeau active et
 * a solde non nul. `reminder_sent_at` n'est pose qu'apres envoi reussi : un
 * echec Resend transitoire doit pouvoir retenter au prochain passage du
 * cron, pas etre marque "envoye" a tort.
 */
export const sendGiftCardExpiryReminders = async (): Promise<number> => {
  const supabase = createAdminClient();
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + REMINDER_WINDOW_DAYS);

  const { data: cards } = await supabase
    .from("gift_cards")
    .select(
      "id, code, type, initial_amount_cents, buyer_name, buyer_email, beneficiary_name, beneficiary_email, expires_at, gift_card_redemptions(amount_cents)",
    )
    .eq("status", "active")
    .is("reminder_sent_at", null)
    .gte("expires_at", now.toISOString())
    .lte("expires_at", windowEnd.toISOString());

  if (!cards || cards.length === 0) return 0;

  let sent = 0;

  for (const card of cards as Array<{
    id: string;
    code: string;
    type: "amount" | "service";
    initial_amount_cents: number | null;
    buyer_name: string;
    buyer_email: string;
    beneficiary_name: string | null;
    beneficiary_email: string | null;
    expires_at: string;
    gift_card_redemptions: { amount_cents: number }[] | null;
  }>) {
    const used = (card.gift_card_redemptions ?? []).reduce(
      (sum, r) => sum + r.amount_cents,
      0,
    );
    const balanceCents =
      card.type === "amount" ? (card.initial_amount_cents ?? 0) - used : null;

    if (card.type === "amount" && (balanceCents ?? 0) <= 0) continue;

    const recipientEmail = card.beneficiary_email ?? card.buyer_email;
    const recipientName = card.beneficiary_name ?? card.buyer_name;

    try {
      await sendGiftCardExpiryReminderEmail({
        code: card.code,
        typeLabel:
          card.type === "amount" ? "Carte cadeau" : "Carte cadeau — prestation offerte",
        amountLabel: balanceCents != null ? formatEuros(balanceCents) : null,
        expiresAtLabel: new Date(card.expires_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        recipientName,
        recipientEmail,
      });
    } catch (err) {
      console.error(`[sendGiftCardExpiryReminders] carte ${card.code}`, err);
      continue;
    }

    await supabase
      .from("gift_cards")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", card.id);
    sent++;
  }

  return sent;
};

const formatEuros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/gift-cards/reminders.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Register the job in the cron route**

Dans `src/app/api/cron/route.ts` :

```ts
import {
  runModuleReminders,
  runReviewRequests,
  runWeeklyDigest,
  runAdminDigest,
} from "@/lib/notifications/jobs";
import { sendGiftCardExpiryReminders } from "@/lib/gift-cards/reminders";
```

Puis dans le tableau des jobs périodiques :

```ts
  for (const [key, run, label] of [
    ["module_reminders_sent", runModuleReminders, "Relances d'accompagnement"],
    ["review_requests_sent", runReviewRequests, "Demandes d'avis"],
    ["weekly_digests_sent", runWeeklyDigest, "Resume hebdomadaire"],
    ["admin_digests_sent", runAdminDigest, "Recapitulatif administration"],
    [
      "gift_card_expiry_reminders_sent",
      sendGiftCardExpiryReminders,
      "Rappels d'expiration de cartes cadeaux",
    ],
  ] as const) {
```

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `pnpm vitest run`
Expected: PASS, no regression in `src/app/api/cron/route.spec.ts` (if it exists) or elsewhere.

- [ ] **Step 7: Commit**

```bash
git add src/lib/gift-cards/reminders.ts src/lib/gift-cards/reminders.spec.ts src/app/api/cron/route.ts
git commit -m "feat(cartes-cadeaux): job de rappel avant expiration (J-30)"
```

---

### Task 4: Exposer `closedReason` dans `listGiftCards`

**Files:**
- Modify: `src/app/(dashboard)/admin/cartes-cadeaux/actions.ts`
- Modify: `src/app/(dashboard)/admin/cartes-cadeaux/actions.spec.ts`

**Interfaces:**
- Produces: `GiftCardListItem.closedReason: "refunded" | "replaced" | null` — consommé par Task 7 (UI) pour cacher les boutons sur une carte déjà traitée.

- [ ] **Step 1: Write the failing test**

Ajouter dans `actions.spec.ts`, dans le test `"affiche une carte perimee comme expiree..."`, un cas dédié :

```ts
  it("expose closedReason pour une carte deja close par la procedure d'expiration", async () => {
    asAdmin();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    tables.gift_cards = [
      {
        id: "gc-closed",
        code: "CADEAU-CLOSE0",
        type: "amount",
        status: "cancelled",
        initial_amount_cents: 9000,
        buyer_name: "Jean",
        issued_at: past,
        expires_at: past,
        closed_reason: "refunded",
        gift_card_redemptions: [],
      },
    ];

    const result = await listGiftCards();

    expect(result.success).toBe(true);
    expect(result.data![0].closedReason).toBe("refunded");
  });

  it("closedReason vaut null pour une carte non close", async () => {
    asAdmin();
    tables.gift_cards = [
      {
        id: "gc-open",
        code: "CADEAU-OPEN00",
        type: "amount",
        status: "active",
        initial_amount_cents: 9000,
        buyer_name: "Jean",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        closed_reason: null,
        gift_card_redemptions: [],
      },
    ];

    const result = await listGiftCards();

    expect(result.data![0].closedReason).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/\(dashboard\)/admin/cartes-cadeaux/actions.spec.ts`
Expected: FAIL — `closedReason` is `undefined`, not `"refunded"` / `null`.

- [ ] **Step 3: Write minimal implementation**

Dans `actions.ts`, étendre le type et le select/mapping de `listGiftCards` :

```ts
export type GiftCardListItem = {
  id: string;
  code: string;
  type: "amount" | "service";
  status: "active" | "used" | "cancelled" | "expired";
  balanceCents: number | null;
  buyerName: string;
  issuedAt: string;
  expiresAt: string;
  closedReason: "refunded" | "replaced" | null;
  redemptions: GiftCardRedemptionItem[];
};
```

```ts
  const { data, error } = await supabase
    .from("gift_cards")
    .select(
      "id, code, type, status, initial_amount_cents, buyer_name, issued_at, expires_at, closed_reason, gift_card_redemptions(amount_cents, redeemed_at)",
    )
    .order("issued_at", { ascending: false });
```

```ts
    return {
      id: row.id,
      code: row.code,
      type: row.type,
      status:
        row.status === "active" && new Date(row.expires_at).getTime() < now
          ? "expired"
          : row.status,
      balanceCents: row.type === "amount" ? row.initial_amount_cents - used : null,
      buyerName: row.buyer_name,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      closedReason: row.closed_reason ?? null,
      redemptions: redemptions
        .map((r) => ({ amountCents: r.amount_cents, redeemedAt: r.redeemed_at }))
        .sort((a, b) => a.redeemedAt.localeCompare(b.redeemedAt)),
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/\(dashboard\)/admin/cartes-cadeaux/actions.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/cartes-cadeaux/actions.ts" "src/app/(dashboard)/admin/cartes-cadeaux/actions.spec.ts"
git commit -m "feat(cartes-cadeaux): expose closedReason dans listGiftCards"
```

---

### Task 5: Action back-office — remboursement exceptionnel

**Files:**
- Modify: `src/app/(dashboard)/admin/cartes-cadeaux/actions.ts`
- Modify: `src/app/(dashboard)/admin/cartes-cadeaux/actions.spec.ts`

**Interfaces:**
- Consumes: colonnes de Task 1, `requireAdmin()`, `createAdminClient()` (déjà dans ce fichier).
- Produces: `loadEligibleExpiredCard(supabase, giftCardId)` (helper privé, réutilisé par Task 6) et `refundExpiredGiftCard(input: { giftCardId: string; note: string }): Promise<ActionResult>`.

- [ ] **Step 1: Write the failing test**

Modifier l'import existant en haut de `actions.spec.ts` (bloc `issueGiftCardManually`, `listGiftCards`, `listConsultationTypesForGiftCards`) pour ajouter `refundExpiredGiftCard` :

```ts
import {
  issueGiftCardManually,
  listGiftCards,
  listConsultationTypesForGiftCards,
  refundExpiredGiftCard,
} from "./actions";
```

Puis ajouter :

```ts
describe("refundExpiredGiftCard", () => {
  const expiredCard = (overrides: Record<string, unknown> = {}) => ({
    id: "gc-expired",
    code: "CADEAU-EXPIR0",
    type: "amount",
    status: "active",
    initial_amount_cents: 9000,
    consultation_type_id: null,
    buyer_name: "Jean Martin",
    buyer_email: "jean@example.com",
    beneficiary_name: null,
    beneficiary_email: null,
    consultant_id: "consultant-1",
    closed_reason: null,
    expires_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    ...overrides,
  });

  it("refuse une carte qui n'est pas expiree", async () => {
    asAdmin();
    tables.gift_cards = [
      expiredCard({ expires_at: new Date(Date.now() + 86_400_000).toISOString() }),
    ];

    const result = await refundExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result).toEqual({ success: false, error: "Cette carte n'est pas expirée." });
  });

  it("refuse une carte dont la fenetre de 90 jours est depassee", async () => {
    asAdmin();
    tables.gift_cards = [
      expiredCard({
        expires_at: new Date(Date.now() - 91 * 86_400_000).toISOString(),
      }),
    ];

    const result = await refundExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("90 jours");
  });

  it("refuse une carte deja close", async () => {
    asAdmin();
    tables.gift_cards = [expiredCard({ closed_reason: "refunded" })];

    const result = await refundExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("déjà été traitée");
  });

  it("cloture la carte et trace la decision quand elle est eligible", async () => {
    asAdmin();
    tables.gift_cards = [expiredCard()];

    const result = await refundExpiredGiftCard({
      giftCardId: "gc-expired",
      note: "Virement effectué le 12/08, réf ABC123",
    });

    expect(result.success).toBe(true);
    expect(
      insertedRows.filter(
        (r) =>
          r.table === "audit_logs" &&
          (r.row as { action: string }).action === "gift_card_refunded_after_expiry",
      ),
    ).toHaveLength(1);
  });
});
```

Le mock `buildChain` actuel (`select/eq/order/maybeSingle/single/insert`) doit gérer un `.update(...).eq(...)` pour cette action — ajouter dans `buildChain` (`actions.spec.ts`) :

```ts
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => Promise.resolve({ data: rows(), error: null }),
    maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
    single: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
    insert: (row: unknown) => {
      insertedRows.push({ table, row });
      return Promise.resolve({ error: null });
    },
    update: (patch: Record<string, unknown>) => ({
      eq: () => {
        insertedRows.push({ table: `${table}:update`, row: patch });
        return Promise.resolve({ error: null });
      },
    }),
  };
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/\(dashboard\)/admin/cartes-cadeaux/actions.spec.ts`
Expected: FAIL — `refundExpiredGiftCard` is not exported by `./actions`.

- [ ] **Step 3: Write minimal implementation**

Ajouter dans `actions.ts` :

```ts
const REFUND_WINDOW_DAYS = 90;

type EligibleExpiredCard = {
  id: string;
  code: string;
  type: "amount" | "service";
  initial_amount_cents: number | null;
  consultation_type_id: string | null;
  buyer_name: string;
  buyer_email: string;
  beneficiary_name: string | null;
  beneficiary_email: string | null;
  consultant_id: string;
};

/**
 * Charge une carte et verifie son eligibilite a la procedure post-expiration
 * (§7.6 Exception 2). Le statut stocke reste 'active' pour une carte perimee
 * (voir `listGiftCards` : 'expired' est un statut d'affichage, jamais ecrit
 * en base) — l'expiration reelle se lit sur `expires_at`, jamais sur
 * `status`.
 */
const loadEligibleExpiredCard = async (
  supabase: ReturnType<typeof createAdminClient>,
  giftCardId: string,
): Promise<{ ok: true; giftCard: EligibleExpiredCard } | { ok: false; error: string }> => {
  const { data: card } = await supabase
    .from("gift_cards")
    .select(
      "id, code, type, status, expires_at, initial_amount_cents, consultation_type_id, buyer_name, buyer_email, beneficiary_name, beneficiary_email, consultant_id, closed_reason",
    )
    .eq("id", giftCardId)
    .maybeSingle();

  if (!card) return { ok: false, error: "Carte cadeau introuvable." };
  if (card.closed_reason) return { ok: false, error: "Cette carte a déjà été traitée." };
  if (card.status !== "active") {
    return { ok: false, error: "Cette carte n'est plus disponible pour cette procédure." };
  }
  if (new Date(card.expires_at) >= new Date()) {
    return { ok: false, error: "Cette carte n'est pas expirée." };
  }

  const windowEnd = new Date(card.expires_at);
  windowEnd.setDate(windowEnd.getDate() + REFUND_WINDOW_DAYS);
  if (windowEnd < new Date()) {
    return {
      ok: false,
      error: "Le délai de recours de 90 jours après expiration est dépassé.",
    };
  }

  return { ok: true, giftCard: card };
};

/**
 * Remboursement exceptionnel apres expiration (§7.6 Exception 2). Aucun
 * appel Stripe : Carole effectue le virement elle-meme avec l'IBAN/BIC recu
 * par email, hors app — la fenetre de remboursement Stripe/reseau carte est
 * souvent deja fermee a 12 mois + 90 jours. Cette action se contente de
 * tracer la decision.
 */
export const refundExpiredGiftCard = async (input: {
  giftCardId: string;
  note: string;
}): Promise<ActionResult> => {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const loaded = await loadEligibleExpiredCard(supabase, input.giftCardId);
  if (!loaded.ok) return { success: false, error: loaded.error };

  const closedAt = new Date().toISOString();
  const { error } = await supabase
    .from("gift_cards")
    .update({
      status: "cancelled",
      closed_reason: "refunded",
      closed_at: closedAt,
      closed_note: input.note,
    })
    .eq("id", loaded.giftCard.id);

  if (error) {
    console.error("[refundExpiredGiftCard]", error);
    return { success: false, error: "Le remboursement n'a pas pu être enregistré." };
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "gift_card_refunded_after_expiry",
    entity_type: "gift_card",
    entity_id: loaded.giftCard.id,
    metadata: { code: loaded.giftCard.code, note: input.note },
  });

  revalidatePath("/admin/cartes-cadeaux");
  return { success: true };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/\(dashboard\)/admin/cartes-cadeaux/actions.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/cartes-cadeaux/actions.ts" "src/app/(dashboard)/admin/cartes-cadeaux/actions.spec.ts"
git commit -m "feat(cartes-cadeaux): action de remboursement exceptionnel apres expiration"
```

---

### Task 6: Action back-office — prolongation (carte de remplacement)

**Files:**
- Modify: `src/app/(dashboard)/admin/cartes-cadeaux/actions.ts`
- Modify: `src/app/(dashboard)/admin/cartes-cadeaux/actions.spec.ts`

**Interfaces:**
- Consumes: `loadEligibleExpiredCard` (Task 5), `insertGiftCardWithUniqueCode` (`src/lib/gift-cards/code.ts`), `sendGiftCardPurchaseEmails` (`src/lib/gift-cards/emails.ts`), `resolveConsultantName`/`formatEuros` (déjà privés dans `actions.ts`).
- Produces: `replaceExpiredGiftCard(input: { giftCardId: string; note: string }): Promise<ActionResult<{ newGiftCardId: string; code: string }>>`.

- [ ] **Step 1: Write the failing test**

Modifier le même import (`./actions`) pour ajouter `replaceExpiredGiftCard` :

```ts
import {
  issueGiftCardManually,
  listGiftCards,
  listConsultationTypesForGiftCards,
  refundExpiredGiftCard,
  replaceExpiredGiftCard,
} from "./actions";
```

Puis ajouter :

```ts
describe("replaceExpiredGiftCard", () => {
  const expiredAmountCard = (overrides: Record<string, unknown> = {}) => ({
    id: "gc-expired",
    code: "CADEAU-EXPIR0",
    type: "amount",
    status: "active",
    initial_amount_cents: 9000,
    consultation_type_id: null,
    buyer_name: "Jean Martin",
    buyer_email: "jean@example.com",
    beneficiary_name: "Marie Dupont",
    beneficiary_email: "marie@example.com",
    consultant_id: "consultant-1",
    closed_reason: null,
    expires_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    ...overrides,
  });

  it("refuse le remplacement d'une carte non eligible", async () => {
    asAdmin();
    tables.gift_cards = [
      expiredAmountCard({ expires_at: new Date(Date.now() + 86_400_000).toISOString() }),
    ];

    const result = await replaceExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result.success).toBe(false);
  });

  it("refuse le remplacement d'une carte 'montant' entierement consommee", async () => {
    asAdmin();
    tables.gift_cards = [expiredAmountCard()];
    tables.gift_card_redemptions = [{ gift_card_id: "gc-expired", amount_cents: 9000 }];

    const result = await replaceExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("solde");
  });

  it("emet une nouvelle carte de 9 mois avec le solde restant, et cloture l'originale", async () => {
    asAdmin();
    tables.gift_cards = [expiredAmountCard()];
    tables.gift_card_redemptions = [{ gift_card_id: "gc-expired", amount_cents: 2000 }];

    const result = await replaceExpiredGiftCard({
      giftCardId: "gc-expired",
      note: "Demande recue le 12/08",
    });

    expect(result.success).toBe(true);
    expect(result.data?.code).toBe("CADEAU-ABC234"); // mockInsert renvoie toujours ce code

    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-ABC234");
    expect(row).toMatchObject({
      type: "amount",
      initial_amount_cents: 7000,
      consultant_id: "consultant-1",
      buyer_email: "jean@example.com",
      beneficiary_email: "marie@example.com",
      created_by: "manual",
      replaces_gift_card_id: "gc-expired",
    });

    const expiresAt = new Date(row.expires_at as string);
    const expectedMonth = (new Date().getMonth() + 9) % 12;
    expect(expiresAt.getMonth()).toBe(expectedMonth);

    expect(
      insertedRows.filter(
        (r) =>
          r.table === "audit_logs" &&
          (r.row as { action: string }).action === "gift_card_replaced_after_expiry",
      ),
    ).toHaveLength(1);
    expect(mockSendEmails).toHaveBeenCalledWith(
      expect.objectContaining({ beneficiaryEmail: "marie@example.com" }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/\(dashboard\)/admin/cartes-cadeaux/actions.spec.ts`
Expected: FAIL — `replaceExpiredGiftCard` is not exported by `./actions`.

- [ ] **Step 3: Write minimal implementation**

Ajouter dans `actions.ts` :

```ts
const REPLACEMENT_VALIDITY_MONTHS = 9;

/**
 * Prolongation (§7.6 Exception 2) : emet une carte de remplacement valable
 * 9 mois pour le solde restant de la carte expiree, puis cloture
 * l'originale. Pas de nouvelle facture — l'achat d'origine a deja ete
 * facture ; ce n'est pas un nouveau geste commercial mais la continuation
 * du meme.
 */
export const replaceExpiredGiftCard = async (input: {
  giftCardId: string;
  note: string;
}): Promise<ActionResult<{ newGiftCardId: string; code: string }>> => {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const loaded = await loadEligibleExpiredCard(supabase, input.giftCardId);
  if (!loaded.ok) return { success: false, error: loaded.error };
  const original = loaded.giftCard;

  let remainingAmountCents: number | null = null;
  if (original.type === "amount") {
    const { data: redemptions } = await supabase
      .from("gift_card_redemptions")
      .select("amount_cents")
      .eq("gift_card_id", original.id);
    const used = (redemptions ?? []).reduce(
      (sum: number, r: { amount_cents: number }) => sum + r.amount_cents,
      0,
    );
    remainingAmountCents = (original.initial_amount_cents ?? 0) - used;
    if (remainingAmountCents <= 0) {
      return { success: false, error: "Cette carte n'a plus de solde à reporter." };
    }
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + REPLACEMENT_VALIDITY_MONTHS);

  const replacement = await insertGiftCardWithUniqueCode(supabase, (code) => ({
    code,
    type: original.type,
    initial_amount_cents: remainingAmountCents,
    consultation_type_id: original.type === "service" ? original.consultation_type_id : null,
    consultant_id: original.consultant_id,
    buyer_name: original.buyer_name,
    buyer_email: original.buyer_email,
    beneficiary_name: original.beneficiary_name,
    beneficiary_email: original.beneficiary_email,
    personal_message: null,
    delivery_mode: "email",
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_by: "manual",
    created_by_admin_id: admin.id,
    replaces_gift_card_id: original.id,
  }));

  const { error: closeError } = await supabase
    .from("gift_cards")
    .update({
      status: "cancelled",
      closed_reason: "replaced",
      closed_at: issuedAt.toISOString(),
      closed_note: input.note,
    })
    .eq("id", original.id);

  if (closeError) {
    console.error("[replaceExpiredGiftCard] cloture carte d'origine", closeError);
    return {
      success: false,
      error:
        "La nouvelle carte a été créée, mais l'ancienne n'a pas pu être clôturée — contactez le support technique.",
    };
  }

  const consultantName = await resolveConsultantName(supabase, original.consultant_id);

  try {
    await sendGiftCardPurchaseEmails({
      code: replacement.code,
      typeLabel:
        original.type === "amount"
          ? "Carte cadeau de remplacement"
          : "Carte cadeau de remplacement — prestation offerte",
      amountLabel:
        original.type === "amount" && remainingAmountCents != null
          ? formatEuros(remainingAmountCents)
          : null,
      expiresAtLabel: expiresAt.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      buyerName: original.buyer_name,
      buyerEmail: original.buyer_email,
      beneficiaryName: original.beneficiary_name,
      beneficiaryEmail: original.beneficiary_email,
      personalMessage: null,
      deliveryMode: "email",
      consultantName,
    });
  } catch (err) {
    console.error("[replaceExpiredGiftCard] envoi email", err);
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "gift_card_replaced_after_expiry",
    entity_type: "gift_card",
    entity_id: original.id,
    metadata: {
      original_code: original.code,
      new_code: replacement.code,
      note: input.note,
    },
  });

  revalidatePath("/admin/cartes-cadeaux");
  return {
    success: true,
    data: { newGiftCardId: replacement.id, code: replacement.code },
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/\(dashboard\)/admin/cartes-cadeaux/actions.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `pnpm vitest run`
Expected: PASS across the repo.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/cartes-cadeaux/actions.ts" "src/app/(dashboard)/admin/cartes-cadeaux/actions.spec.ts"
git commit -m "feat(cartes-cadeaux): action de prolongation (carte de remplacement 9 mois)"
```

---

### Task 7: UI back-office — boutons Rembourser / Prolonger

**Files:**
- Create: `src/app/(dashboard)/admin/cartes-cadeaux/_components/refund-gift-card-button.tsx`
- Create: `src/app/(dashboard)/admin/cartes-cadeaux/_components/replace-gift-card-button.tsx`
- Modify: `src/app/(dashboard)/admin/cartes-cadeaux/page.tsx`

**Interfaces:**
- Consumes: `refundExpiredGiftCard`, `replaceExpiredGiftCard` (Task 5, 6), `GiftCardListItem.closedReason` (Task 4).

Pas de test automatisé pour ces deux boutons — le reste du back-office cartes cadeaux (`issue-gift-card-form.tsx`) et facturation (`correct-button.tsx`) n'a pas de test de composant non plus dans ce repo ; la couverture porte sur les server actions (Task 5, 6). Vérification manuelle prévue à l'étape 4.

- [ ] **Step 1: Write `refund-gift-card-button.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { refundExpiredGiftCard } from "../actions";

/**
 * Remboursement exceptionnel apres expiration (§7.6 Exception 2). Le
 * virement est effectue par Carole hors app avec l'IBAN/BIC recu par email
 * — ce dialogue ne fait que tracer la decision et cloturer la carte.
 */
export const RefundGiftCardButton = ({ giftCardId }: { giftCardId: string }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    if (!note.trim()) {
      setError("Indiquez une référence (facture, virement) pour tracer la décision.");
      return;
    }
    startTransition(async () => {
      const result = await refundExpiredGiftCard({ giftCardId, note: note.trim() });
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Rembourser
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remboursement exceptionnel</DialogTitle>
          <DialogDescription>
            Le virement se fait hors application, avec l&apos;IBAN/BIC reçu par
            email. Confirmer ici clôture la carte et trace la décision — aucun
            frais de gestion n&apos;est appliqué.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="refund-note">Référence / note</Label>
          <textarea
            id="refund-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border p-2"
            rows={3}
            placeholder="Ex. Virement effectué le 12/08, réf ABC123"
          />
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
            Confirmer le remboursement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Write `replace-gift-card-button.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { replaceExpiredGiftCard } from "../actions";

/**
 * Prolongation apres expiration (§7.6 Exception 2) : emet une carte de
 * remplacement valable 9 mois pour le solde restant, et cloture
 * l'originale.
 */
export const ReplaceGiftCardButton = ({ giftCardId }: { giftCardId: string }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    if (!note.trim()) {
      setError("Indiquez une référence pour tracer la décision.");
      return;
    }
    startTransition(async () => {
      const result = await replaceExpiredGiftCard({ giftCardId, note: note.trim() });
      if (result.success) {
        setNotice(`Nouvelle carte émise : ${result.data?.code}`);
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Prolonger
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Émettre une carte de remplacement</DialogTitle>
          <DialogDescription>
            Émet une nouvelle carte valable 9 mois pour le solde restant, aux
            mêmes destinataires, et clôture la carte expirée.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="replace-note">Référence / note</Label>
          <textarea
            id="replace-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border p-2"
            rows={3}
            placeholder="Ex. Demande reçue le 12/08 par email"
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-sm text-primary-green" role="status">
              {notice}
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
            Émettre la carte de remplacement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 3: Wire the buttons into `page.tsx`**

```tsx
import { listConsultationTypesForGiftCards, listGiftCards } from "./actions";
import { IssueGiftCardForm } from "./_components/issue-gift-card-form";
import { RefundGiftCardButton } from "./_components/refund-gift-card-button";
import { ReplaceGiftCardButton } from "./_components/replace-gift-card-button";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  used: "Utilisée",
  expired: "Expirée",
  cancelled: "Annulée",
};

const REFUND_WINDOW_DAYS = 90;

const formatEuros = (cents: number) => `${(cents / 100).toFixed(2)} €`;

/**
 * Une carte n'est proposable a la procedure post-expiration (§7.6 Exception 2)
 * que si elle est expiree, pas deja close, et dans la fenetre de 90 jours
 * apres `expiresAt`. Verification d'affichage seulement — l'enforcement reel
 * est cote serveur dans `refundExpiredGiftCard`/`replaceExpiredGiftCard`.
 */
const isEligibleForPostExpiryAction = (card: {
  status: string;
  closedReason: "refunded" | "replaced" | null;
  expiresAt: string;
}) => {
  if (card.status !== "expired" || card.closedReason) return false;
  const windowEnd = new Date(card.expiresAt);
  windowEnd.setDate(windowEnd.getDate() + REFUND_WINDOW_DAYS);
  return windowEnd >= new Date();
};
```

Ajouter une colonne "Actions" dans le `<thead>` :

```tsx
            <th className="border-b p-2">Utilisations</th>
            <th className="border-b p-2">Actions</th>
```

Et la cellule correspondante dans chaque `<tr>` :

```tsx
              <td className="border-b p-2">
                {isEligibleForPostExpiryAction(card) ? (
                  <div className="flex gap-1">
                    <RefundGiftCardButton giftCardId={card.id} />
                    <ReplaceGiftCardButton giftCardId={card.id} />
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
```

- [ ] **Step 4: Manual verification**

Run: `pnpm dev`, ouvrir `/admin/cartes-cadeaux` en tant qu'admin.
Expected:
- Une carte active non expirée : colonne Actions à `—`.
- Une carte manuellement mise à `expires_at` passé en base (via un client SQL, ou en attendant qu'une carte de test expire) : boutons "Rembourser" / "Prolonger" visibles.
- "Rembourser" sans note : erreur affichée, pas d'appel serveur.
- "Rembourser" avec note : la carte disparaît de la liste des cartes actionnables après `router.refresh()`, passe à statut "Annulée".
- "Prolonger" avec note : une nouvelle ligne apparaît dans le tableau avec un nouveau code, expirant dans 9 mois ; l'originale passe à "Annulée".

- [ ] **Step 5: Run the full test suite one last time**

Run: `pnpm vitest run`
Expected: PASS, aucune régression.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/cartes-cadeaux/_components/refund-gift-card-button.tsx" "src/app/(dashboard)/admin/cartes-cadeaux/_components/replace-gift-card-button.tsx" "src/app/(dashboard)/admin/cartes-cadeaux/page.tsx"
git commit -m "feat(cartes-cadeaux): boutons back-office remboursement/prolongation apres expiration"
```

---

## Hors scope (rappel)

- Exception 1 (rétractation légale 14 jours, §7.6) — à cadrer séparément.
- REVOKE EXECUTE sur `redeem_gift_card()` (Phase 1) — toujours pas vérifié en conditions réelles (Docker), sans lien avec ce plan mais à surveiller au premier déploiement.

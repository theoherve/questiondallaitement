import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ────────────────────────────────────────────

// Suivi des appels par table — réinitialisé via state dans chaque beforeEach
// pour éviter toute contamination entre suites (pas de .length = 0 oublié)
const state = {
  upsertCalls: [] as Array<{ table: string; data: unknown; opts?: unknown }>,
  insertCalls: [] as Array<{ table: string; data: unknown }>,
  updateCalls: [] as Array<{ table: string; data: unknown }>,
};

// Config par table : { single?, list? }
const db: Record<string, { single?: unknown; list?: unknown[] }> = {};

const createChain = (table: string) => {
  const config = db[table] ?? {};

  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    update: vi.fn((data: unknown) => {
      state.updateCalls.push({ table, data });
      return chain;
    }),
    upsert: vi.fn((data: unknown, opts?: unknown) => {
      state.upsertCalls.push({ table, data, opts });
      return Promise.resolve({ error: null });
    }),
    insert: vi.fn((data: unknown) => {
      state.insertCalls.push({ table, data });
      return Promise.resolve({ error: null });
    }),
    single: vi.fn().mockResolvedValue({ data: config.single ?? null, error: null }),
  };

  // Thenable pour les requêtes sans .single() (ex: .select().eq() await)
  (chain as { then?: (onFulfilled: (value: unknown) => unknown) => unknown }).then = (
    onFulfilled: (value: unknown) => unknown,
  ) => Promise.resolve({ data: config.list ?? [], error: null }).then(onFulfilled);

  return chain;
};

const mockFrom = vi.fn((table: string) => createChain(table));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// ─── Dépendances externes mockées ────────────────────────────

const mockCreateTransfer = vi.fn().mockResolvedValue({ id: "tr_test" });

vi.mock("@/lib/stripe/connect", () => ({
  createTransfer: (...args: unknown[]) => mockCreateTransfer(...args),
}));

vi.mock("@/lib/emails/send", () => ({
  sendFormationAccess: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmedToConsultant: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/automations/engine", () => ({
  runAutomations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

import {
  handleCheckoutCompleted,
  handleChargeRefunded,
  handleAccountUpdated,
  handleAccountDeauthorized,
} from "./webhooks";
import type Stripe from "stripe";

// ─── Fixtures ─────────────────────────────────────────────────

const CLIENT_ID = "client-uuid-001";
const CONSULTANT_ID = "consultant-uuid-002";
const FORMATION_ID = "formation-uuid-003";
const BOOKING_ID = "booking-uuid-004";
const PAYMENT_INTENT_ID = "pi_test_001";

const makeFormationSession = (): Stripe.Checkout.Session =>
  ({
    id: "cs_test_formation",
    amount_total: 5000,
    currency: "eur",
    payment_intent: PAYMENT_INTENT_ID,
    metadata: {
      type: "formation",
      reference_id: FORMATION_ID,
      client_id: CLIENT_ID,
      consultant_id: CONSULTANT_ID,
      platform_fee_cents: "500",
    },
  }) as unknown as Stripe.Checkout.Session;

const makeBookingSession = (): Stripe.Checkout.Session =>
  ({
    id: "cs_test_booking",
    amount_total: 7000,
    currency: "eur",
    payment_intent: PAYMENT_INTENT_ID,
    metadata: {
      type: "booking",
      reference_id: BOOKING_ID,
      client_id: CLIENT_ID,
      consultant_id: CONSULTANT_ID,
      consultation_type_id: "ct-uuid-001",
      duration_option_id: "do-uuid-001",
      starts_at: "2024-03-15T10:00:00.000Z",
      ends_at: "2024-03-15T11:00:00.000Z",
      location: "teleconsultation",
      reason: "Allaitement difficile",
      platform_fee_cents: "700",
    },
  }) as unknown as Stripe.Checkout.Session;

// ─── handleCheckoutCompleted — formation (14-05) ──────────────

describe("handleCheckoutCompleted — type formation (14-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.upsertCalls = [];
    state.insertCalls = [];
    state.updateCalls = [];

    // Pas de collaborateurs par défaut
    db["formation_collaborators"] = { list: [] };
    db["formation_enrollments"] = {};
    db["payments"] = {};
    db["audit_logs"] = {};
    db["profiles"] = { single: { email: "client@test.fr", first_name: "Marie" } };
    db["formations"] = { single: { title: "Formation allaitement" } };
  });

  it("crée un enrollment (upsert formation_enrollments)", async () => {
    await handleCheckoutCompleted(makeFormationSession());

    const enrollment = state.upsertCalls.find((c) => c.table === "formation_enrollments");
    expect(enrollment).toBeDefined();
    expect(enrollment!.data).toMatchObject({
      client_id: CLIENT_ID,
      formation_id: FORMATION_ID,
      stripe_payment_intent_id: PAYMENT_INTENT_ID,
    });
  });

  it("enregistre le paiement (upsert payments)", async () => {
    await handleCheckoutCompleted(makeFormationSession());

    const payment = state.upsertCalls.find((c) => c.table === "payments");
    expect(payment).toBeDefined();
    expect(payment!.data).toMatchObject({
      client_id: CLIENT_ID,
      consultant_id: CONSULTANT_ID,
      amount_cents: 5000,
      type: "formation",
      status: "succeeded",
    });
  });

  it("ne crée pas de transfer si aucun collaborateur", async () => {
    await handleCheckoutCompleted(makeFormationSession());
    expect(mockCreateTransfer).not.toHaveBeenCalled();
  });

  it("crée un transfer pour un collaborateur avec Stripe actif", async () => {
    db["formation_collaborators"] = {
      list: [
        {
          consultant_id: "collab-uuid-001",
          revenue_share: 30,
          consultants: {
            stripe_account_id: "acct_collab001",
            stripe_account_status: "active",
          },
        },
      ],
    };
    db["payments"] = {
      single: { amount_cents: 5000, platform_fee_cents: 500 },
    };

    await handleCheckoutCompleted(makeFormationSession());

    // Net = 5000 - 500 = 4500 ; 30% = 1350
    expect(mockCreateTransfer).toHaveBeenCalledWith(
      1350,
      "acct_collab001",
      expect.objectContaining({ formation_id: FORMATION_ID }),
    );
  });

  it("skip le transfer si le collaborateur n'a pas de Stripe actif", async () => {
    db["formation_collaborators"] = {
      list: [
        {
          consultant_id: "collab-uuid-002",
          revenue_share: 20,
          consultants: {
            stripe_account_id: null,
            stripe_account_status: null,
          },
        },
      ],
    };
    // Le payment doit exister pour que processCollaboratorSplits n'en sorte pas prématurément
    db["payments"] = {
      single: { amount_cents: 5000, platform_fee_cents: 500 },
    };

    await handleCheckoutCompleted(makeFormationSession());

    expect(mockCreateTransfer).not.toHaveBeenCalled();
    // Un audit "collaborator_transfer_skipped" doit être loggé
    const skippedLog = state.insertCalls.find(
      (c) =>
        c.table === "audit_logs" &&
        (c.data as { action: string }).action === "collaborator_transfer_skipped",
    );
    expect(skippedLog).toBeDefined();
  });
});

// ─── handleCheckoutCompleted — booking (14-05 & 14-06) ────────

describe("handleCheckoutCompleted — type booking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.upsertCalls = [];
    state.insertCalls = [];
    state.updateCalls = [];

    db["bookings"] = {};
    db["payments"] = {};
    db["audit_logs"] = {};
    db["consultation_types"] = { single: { title: "Consultation allaitement" } };
    db["profiles"] = { single: { email: "client@test.fr", first_name: "Marie" } };
  });

  it("insère le booking avec status confirmed", async () => {
    await handleCheckoutCompleted(makeBookingSession());

    const bookingInsert = state.insertCalls.find((c) => c.table === "bookings");
    expect(bookingInsert).toBeDefined();
    expect(bookingInsert!.data).toMatchObject({
      id: BOOKING_ID,
      client_id: CLIENT_ID,
      consultant_id: CONSULTANT_ID,
      status: "confirmed",
      payment_method: "online",
      location: "teleconsultation",
    });
  });

  it("enregistre le paiement (upsert payments)", async () => {
    await handleCheckoutCompleted(makeBookingSession());

    const payment = state.upsertCalls.find((c) => c.table === "payments");
    expect(payment).toBeDefined();
    expect(payment!.data).toMatchObject({
      amount_cents: 7000,
      type: "booking",
      status: "succeeded",
    });
  });
});

// ─── handleChargeRefunded (14-08 côté webhook) ────────────────

describe("handleChargeRefunded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.updateCalls = [];
    db["payments"] = {};
  });

  const makeCharge = (amount: number, refunded: number): Stripe.Charge =>
    ({
      payment_intent: PAYMENT_INTENT_ID,
      amount,
      amount_refunded: refunded,
    }) as unknown as Stripe.Charge;

  it("met le statut 'refunded' pour un remboursement total", async () => {
    await handleChargeRefunded(makeCharge(5000, 5000));

    const updateCall = state.updateCalls.find((c) => c.table === "payments");
    expect(updateCall).toBeDefined();
    expect(updateCall!.data).toMatchObject({ status: "refunded", refund_amount_cents: 5000 });
  });

  it("met le statut 'partially_refunded' pour un remboursement partiel", async () => {
    await handleChargeRefunded(makeCharge(5000, 2500));

    const updateCall = state.updateCalls.find((c) => c.table === "payments");
    expect(updateCall).toBeDefined();
    expect(updateCall!.data).toMatchObject({ status: "partially_refunded", refund_amount_cents: 2500 });
  });

  it("ne fait rien si payment_intent est absent", async () => {
    await handleChargeRefunded({ payment_intent: null, amount: 5000, amount_refunded: 5000 } as unknown as Stripe.Charge);
    expect(state.updateCalls).toHaveLength(0);
  });
});

// ─── handleAccountUpdated ─────────────────────────────────────

describe("handleAccountUpdated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.updateCalls = [];
    db["consultants"] = {};
  });

  const makeAccount = (chargesEnabled: boolean, detailsSubmitted: boolean): Stripe.Account =>
    ({
      metadata: { consultant_id: CONSULTANT_ID },
      charges_enabled: chargesEnabled,
      details_submitted: detailsSubmitted,
    }) as unknown as Stripe.Account;

  it("passe en 'active' si charges_enabled", async () => {
    await handleAccountUpdated(makeAccount(true, true));
    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({ stripe_account_status: "active" });
  });

  it("passe en 'pending_verification' si details_submitted mais pas charges_enabled", async () => {
    await handleAccountUpdated(makeAccount(false, true));
    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({ stripe_account_status: "pending_verification" });
  });

  it("passe en 'pending' si rien de soumis", async () => {
    await handleAccountUpdated(makeAccount(false, false));
    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({ stripe_account_status: "pending" });
  });

  it("ne fait rien si consultant_id manquant dans les métadonnées", async () => {
    await handleAccountUpdated({ metadata: {} } as unknown as Stripe.Account);
    expect(state.updateCalls).toHaveLength(0);
  });
});

// ─── handleAccountDeauthorized ────────────────────────────────

describe("handleAccountDeauthorized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.updateCalls = [];
    db["consultants"] = {};
  });

  it("désactive la consultante et efface le compte Stripe", async () => {
    await handleAccountDeauthorized({
      metadata: { consultant_id: CONSULTANT_ID },
    } as unknown as Stripe.Account);

    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({
      stripe_account_id: null,
      stripe_account_status: "deauthorized",
      is_active: false,
    });
  });
});

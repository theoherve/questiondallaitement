import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const updateCalls: Array<{ table: string; data: unknown }> = [];
const insertCalls: Array<{ table: string; data: unknown }> = [];

// Config par table
const db: Record<string, { single?: unknown }> = {};

const createChain = (table: string) => {
  const config = db[table] ?? {};
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn((data: unknown) => {
      updateCalls.push({ table, data });
      return chain;
    }),
    insert: vi.fn((data: unknown) => {
      insertCalls.push({ table, data });
      return Promise.resolve({ error: null });
    }),
    single: vi.fn().mockResolvedValue({ data: config.single ?? null, error: null }),
  };

  // Thenable (update().eq() awaited)
  (chain as { then?: (onFulfilled: (value: unknown) => unknown) => unknown }).then = (
    onFulfilled: (value: unknown) => unknown,
  ) => Promise.resolve({ data: null, error: null }).then(onFulfilled);

  return chain;
};

const mockFrom = vi.fn((table: string) => createChain(table));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: vi.fn(),
}));

const mockCreateRefund = vi.fn().mockResolvedValue({ id: "re_test" });

vi.mock("@/lib/stripe/connect", () => ({
  createRefund: (...args: unknown[]) => mockCreateRefund(...args),
}));

vi.mock("@/lib/emails/send", () => ({
  sendBookingCancelled: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { cancelBookingClient } from "./actions";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";

// ─── Fixtures ─────────────────────────────────────────────────

const USER_ID = "user-uuid-001";
const BOOKING_ID = "booking-uuid-001";
const PAYMENT_INTENT_ID = "pi_test_001";

// Temps de référence : 15 jan 2024 10:00
const NOW = new Date("2024-01-15T10:00:00.000Z");

const makeBooking = (startsAt: string, overrides: Partial<Record<string, unknown>> = {}) => ({
  id: BOOKING_ID,
  client_id: USER_ID,
  consultant_id: "consultant-uuid-001",
  starts_at: startsAt,
  status: "confirmed",
  payment_method: "online",
  zoom_meeting_id: null,
  payments: [
    {
      amount_cents: 5000,
      stripe_payment_intent_id: PAYMENT_INTENT_ID,
    },
  ],
  ...overrides,
});

// ─── 14-08 : Annulation avec règle des 48h ────────────────────

describe("14-08 : cancelBookingClient — règle de remboursement 48h", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCalls.length = 0;
    insertCalls.length = 0;

    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    vi.mocked(getSupabaseAndUser).mockResolvedValue({
      user: { id: USER_ID },
      supabase: {} as never,
    } as never);

    db["profiles"] = { single: { email: "marie@test.fr", first_name: "Marie" } };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rembourse intégralement si annulation >= 48h avant le RDV", async () => {
    // starts_at = 15 jan 2024 + 53h = 17 jan 2024 15:00
    db["bookings"] = { single: makeBooking("2024-01-17T15:00:00.000Z") };

    const result = await cancelBookingClient(BOOKING_ID, "Indisponibilité");

    expect(result.success).toBe(true);
    // Remboursement total : createRefund appelé sans montant partiel
    expect(mockCreateRefund).toHaveBeenCalledWith(PAYMENT_INTENT_ID);
    expect(mockCreateRefund).not.toHaveBeenCalledWith(PAYMENT_INTENT_ID, expect.any(Number));
  });

  it("applique une pénalité de 50% si annulation < 48h avant le RDV", async () => {
    // starts_at = 15 jan 2024 + 24h = 16 jan 2024 10:00
    db["bookings"] = { single: makeBooking("2024-01-16T10:00:00.000Z") };

    const result = await cancelBookingClient(BOOKING_ID, "Imprévu");

    expect(result.success).toBe(true);
    // Pénalité 50% : 5000 * 0.5 = 2500 de pénalité → 2500 remboursés
    expect(mockCreateRefund).toHaveBeenCalledWith(PAYMENT_INTENT_ID, 2500);
  });

  it("enregistre refund_amount_cents dans le booking (remboursement total)", async () => {
    db["bookings"] = { single: makeBooking("2024-01-17T15:00:00.000Z") };

    await cancelBookingClient(BOOKING_ID, "Annulation");

    const bookingUpdate = updateCalls.find((c) => c.table === "bookings");
    expect(bookingUpdate).toBeDefined();
    expect(bookingUpdate!.data).toMatchObject({
      status: "cancelled",
      refund_amount_cents: 5000,
    });
  });

  it("enregistre refund_amount_cents dans le booking (remboursement partiel)", async () => {
    db["bookings"] = { single: makeBooking("2024-01-16T10:00:00.000Z") };

    await cancelBookingClient(BOOKING_ID, "Annulation");

    const bookingUpdate = updateCalls.find((c) => c.table === "bookings");
    expect(bookingUpdate!.data).toMatchObject({
      status: "cancelled",
      refund_amount_cents: 2500,
    });
  });

  it("ne fait pas de remboursement Stripe pour un paiement on_site", async () => {
    db["bookings"] = {
      single: makeBooking("2024-01-16T10:00:00.000Z", {
        payment_method: "on_site",
        payments: [], // pas de paiement Stripe
      }),
    };

    const result = await cancelBookingClient(BOOKING_ID, "Annulation sur place");

    expect(result.success).toBe(true);
    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  it("log l'audit avec les bonnes métadonnées (cancelled_by: client)", async () => {
    db["bookings"] = { single: makeBooking("2024-01-17T15:00:00.000Z") };

    await cancelBookingClient(BOOKING_ID, "Test audit");

    const auditInsert = insertCalls.find((c) => c.table === "audit_logs");
    expect(auditInsert).toBeDefined();
    expect(auditInsert!.data).toMatchObject({
      action: "booking_cancelled",
      entity_type: "booking",
      entity_id: BOOKING_ID,
      metadata: expect.objectContaining({ cancelled_by: "client", reason: "Test audit" }),
    });
  });

  it("retourne une erreur si la réservation n'existe pas", async () => {
    db["bookings"] = { single: null };

    const result = await cancelBookingClient("booking-inexistant", "Test");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Réservation introuvable");
  });

  it("retourne une erreur si la réservation est déjà annulée", async () => {
    db["bookings"] = {
      single: makeBooking("2024-01-17T15:00:00.000Z", { status: "cancelled" }),
    };

    const result = await cancelBookingClient(BOOKING_ID, "Double annulation");

    expect(result.success).toBe(false);
    expect(result.error).toContain("annulée");
  });

  it("retourne une erreur si la réservation est complétée", async () => {
    db["bookings"] = {
      single: makeBooking("2024-01-10T10:00:00.000Z", { status: "completed" }),
    };

    const result = await cancelBookingClient(BOOKING_ID, "Après coup");

    expect(result.success).toBe(false);
  });
});

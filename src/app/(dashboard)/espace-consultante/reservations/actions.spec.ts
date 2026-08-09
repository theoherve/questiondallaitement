import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const updateCalls: Array<{ table: string; data: unknown }> = [];
const insertCalls: Array<{ table: string; data: unknown }> = [];

/** Ligne renvoyee par table, ou null. */
const db: Record<string, Record<string, unknown> | null> = {};

/** Erreur simulee sur l'insert d'une table (ex. 23505 sur payments). */
const insertErrors: Record<string, { code?: string } | null> = {};

/**
 * Chain Supabase qui honore reellement les `.eq()`.
 *
 * Un mock qui renvoie la ligne quels que soient les filtres ne peut pas
 * distinguer « charge la reservation » de « charge la reservation **de cette
 * consultante** » — c'est-a-dire exactement la difference que ces tests
 * doivent mordre. Ici, un filtre qui ne colle pas fait repondre `null`, comme
 * PostgREST.
 */
const createChain = (table: string) => {
  const row = db[table] ?? null;
  const filters: Array<[string, unknown]> = [];

  const matches = (): boolean =>
    row !== null &&
    filters.every(([column, value]) => {
      // Les colonnes absentes de la fixture ne sont pas contraintes.
      if (!(column in row)) return true;
      return row[column] === value;
    });

  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    is: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return chain;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return chain;
    }),
    update: vi.fn((data: unknown) => {
      updateCalls.push({ table, data });
      return chain;
    }),
    insert: vi.fn((data: unknown) => {
      insertCalls.push({ table, data });
      // Insert-returning : `.insert(...).select(...).single()` rend la ligne
      // inseree, avec un id, comme PostgREST. Une erreur simulee (ex. 23505)
      // court-circuite la donnee.
      const err = insertErrors[table] ?? null;
      const inserted = { id: `${table}-inserted-id`, ...(data as object) };
      const result = { data: err ? null : inserted, error: err };
      const insertChain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve(result)),
        maybeSingle: vi.fn(() => Promise.resolve(result)),
      };
      (insertChain as { then?: (o: (v: unknown) => unknown) => unknown }).then = (
        onFulfilled: (value: unknown) => unknown,
      ) => Promise.resolve({ data: null, error: err }).then(onFulfilled);
      return insertChain;
    }),
    single: vi.fn(() =>
      Promise.resolve({ data: matches() ? row : null, error: null }),
    ),
    maybeSingle: vi.fn(() =>
      Promise.resolve({ data: matches() ? row : null, error: null }),
    ),
  };

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
  sendBookingCancelledToConsultant: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/automations/engine", () => ({
  runAutomations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications", () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  getRoleRecipients: vi.fn().mockResolvedValue([{ userId: "admin-1" }]),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockEmitInvoice = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/invoicing/emit", () => ({
  emitInvoiceForPayment: (...args: unknown[]) => mockEmitInvoice(...args),
}));

const mockConsultantCanSell = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/invoicing/consultant-billing", () => ({
  consultantCanSell: (...args: unknown[]) => mockConsultantCanSell(...args),
}));

vi.mock("@/lib/booking/pricing", () => ({
  computeBookingPrice: vi.fn().mockReturnValue({
    basePriceCents: 9000,
    isWeekendOrHoliday: false,
    surchargeCents: 0,
    totalCents: 9000,
  }),
}));

import { cancelBooking, markBookingPaid } from "./actions";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";

// ─── Fixtures ─────────────────────────────────────────────────

const CONSULTANT_ID = "consultant-uuid-001";
const AUTRE_CONSULTANTE = "consultant-uuid-999";
const BOOKING_ID = "booking-uuid-001";
const PAYMENT_INTENT_ID = "pi_test_001";

/** 15 jan 2024 10:00 */
const NOW = new Date("2024-01-15T10:00:00.000Z");

const makeBooking = (
  startsAt: string,
  overrides: Record<string, unknown> = {},
) => ({
  id: BOOKING_ID,
  client_id: "client-uuid-001",
  consultant_id: CONSULTANT_ID,
  starts_at: startsAt,
  status: "confirmed",
  payment_method: "online",
  zoom_meeting_id: null,
  payments: [
    { amount_cents: 5000, stripe_payment_intent_id: PAYMENT_INTENT_ID },
  ],
  ...overrides,
});

describe("cancelBooking (espace consultante)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    updateCalls.length = 0;
    insertCalls.length = 0;
    for (const key of Object.keys(db)) delete db[key];

    vi.mocked(getSupabaseAndUser).mockResolvedValue({
      supabase: { from: mockFrom },
      user: { id: CONSULTANT_ID, email: "c@test.fr", roles: ["consultant"] },
    } as unknown as Awaited<ReturnType<typeof getSupabaseAndUser>>);
  });

  afterEach(() => vi.useRealTimers());

  it("refuse d'annuler la reservation d'une autre consultante", async () => {
    // `getSupabaseAndUser` ne verifie que l'authentification et rend un client
    // admin qui contourne les RLS : c'est a l'action de restreindre. Sans ce
    // filtre, n'importe quel compte connecte pouvait annuler la reservation
    // d'autrui par son ID — et declencher un vrai remboursement Stripe.
    db.bookings = makeBooking("2024-01-20T10:00:00.000Z", {
      consultant_id: AUTRE_CONSULTANTE,
    });

    const result = await cancelBooking(BOOKING_ID, "Test", "consultant");

    expect(result.success).toBe(false);
    expect(mockCreateRefund).not.toHaveBeenCalled();
    expect(updateCalls.filter((c) => c.table === "bookings")).toHaveLength(0);
  });

  it("annule bien sa propre reservation", async () => {
    db.bookings = makeBooking("2024-01-20T10:00:00.000Z");

    const result = await cancelBooking(BOOKING_ID, "Empechement", "consultant");

    expect(result.success).toBe(true);
    const update = updateCalls.find((c) => c.table === "bookings");
    expect(update!.data).toMatchObject({ status: "cancelled" });
  });

  it("rembourse la totalite au-dela du seuil d'annulation", async () => {
    // 5 jours avant : au-dela des 48 h, la cliente ne doit rien perdre.
    db.bookings = makeBooking("2024-01-20T10:00:00.000Z");

    await cancelBooking(BOOKING_ID, "Empechement", "consultant");

    // Sans second argument, createRefund rembourse l'integralite.
    expect(mockCreateRefund).toHaveBeenCalledWith(PAYMENT_INTENT_ID);
    const update = updateCalls.find((c) => c.table === "bookings");
    expect(update!.data).toMatchObject({ refund_amount_cents: 5000 });
  });

  it("applique la penalite en deca du seuil", async () => {
    // 5 heures avant : penalite de 50 %, donc 2500 sur 5000 rembourses.
    db.bookings = makeBooking("2024-01-15T15:00:00.000Z");

    await cancelBooking(BOOKING_ID, "Empechement", "consultant");

    expect(mockCreateRefund).toHaveBeenCalledWith(PAYMENT_INTENT_ID, 2500);
    const update = updateCalls.find((c) => c.table === "bookings");
    expect(update!.data).toMatchObject({ refund_amount_cents: 2500 });
  });

  it("ne rembourse rien pour un paiement sur place", async () => {
    db.bookings = makeBooking("2024-01-20T10:00:00.000Z", {
      payment_method: "on_site",
      payments: [],
    });

    await cancelBooking(BOOKING_ID, "Empechement", "consultant");

    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  it("refuse une reservation deja annulee", async () => {
    // Sans ce garde-fou, deux clics remboursent deux fois.
    db.bookings = makeBooking("2024-01-20T10:00:00.000Z", {
      status: "cancelled",
    });

    const result = await cancelBooking(BOOKING_ID, "Rebelote", "consultant");

    expect(result.success).toBe(false);
    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  it("refuse une consultation deja honoree", async () => {
    // La prestation a eu lieu : la rembourser n'a pas de sens, et l'action
    // cliente refuse deja ce cas. Les deux chemins doivent s'accorder.
    db.bookings = makeBooking("2024-01-10T10:00:00.000Z", {
      status: "completed",
    });

    const result = await cancelBooking(BOOKING_ID, "Erreur", "consultant");

    expect(result.success).toBe(false);
    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  it("refuse une cliente absente", async () => {
    db.bookings = makeBooking("2024-01-10T10:00:00.000Z", {
      status: "no_show",
    });

    const result = await cancelBooking(BOOKING_ID, "Erreur", "consultant");

    expect(result.success).toBe(false);
    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  it("notifie la cliente et la consultante de l'annulation", async () => {
    db.bookings = makeBooking("2024-01-20T10:00:00.000Z");
    const { notify } = await import("@/lib/notifications");

    await cancelBooking(BOOKING_ID, "Empechement", "consultant");

    const toClient = vi
      .mocked(notify)
      .mock.calls.find((c) => c[0] === "booking_cancelled");
    expect(toClient![1]).toEqual([
      expect.objectContaining({ userId: "client-uuid-001" }),
    ]);
    expect(toClient![3]).toMatchObject({ dedupeId: BOOKING_ID });

    const toConsultant = vi
      .mocked(notify)
      .mock.calls.find((c) => c[0] === "consultant_booking_cancelled");
    expect(toConsultant![1]).toEqual([
      expect.objectContaining({ userId: CONSULTANT_ID }),
    ]);
    expect(toConsultant![2]).toMatchObject({ reason: "Empechement" });
  });

  it("previent le backoffice du remboursement", async () => {
    db.bookings = makeBooking("2024-01-20T10:00:00.000Z");
    const { notify } = await import("@/lib/notifications");

    await cancelBooking(BOOKING_ID, "Empechement", "consultant");

    const toAdmin = vi
      .mocked(notify)
      .mock.calls.find((c) => c[0] === "admin_refund");
    expect(toAdmin![2]).toMatchObject({ amount: expect.stringContaining("50") });
  });

  it("ne previent pas le backoffice sans remboursement", async () => {
    db.bookings = makeBooking("2024-01-20T10:00:00.000Z", {
      payment_method: "on_site",
      payments: [],
    });
    const { notify } = await import("@/lib/notifications");

    await cancelBooking(BOOKING_ID, "Empechement", "consultant");

    expect(
      vi.mocked(notify).mock.calls.find((c) => c[0] === "admin_refund")
    ).toBeUndefined();
  });

  it("trace l'annulation dans les journaux d'audit", async () => {
    db.bookings = makeBooking("2024-01-20T10:00:00.000Z");

    await cancelBooking(BOOKING_ID, "Empechement", "consultant");

    const audit = insertCalls.find((c) => c.table === "audit_logs");
    expect(audit).toBeDefined();
    expect(audit!.data).toMatchObject({
      user_id: CONSULTANT_ID,
      action: "booking_cancelled",
      entity_id: BOOKING_ID,
    });
  });
});

// ─── markBookingPaid : encaissement sur place ─────────────────

const makeOnSiteBooking = (overrides: Record<string, unknown> = {}) => ({
  id: BOOKING_ID,
  client_id: "client-uuid-001",
  consultant_id: CONSULTANT_ID,
  duration_option_id: "do-uuid-001",
  location: "teleconsultation",
  starts_at: "2024-01-20T10:00:00.000Z",
  payment_method: "on_site",
  status: "confirmed",
  ...overrides,
});

describe("markBookingPaid (encaissement sur place)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCalls.length = 0;
    insertCalls.length = 0;
    for (const key of Object.keys(db)) delete db[key];
    for (const key of Object.keys(insertErrors)) delete insertErrors[key];

    mockEmitInvoice.mockResolvedValue(undefined);
    mockConsultantCanSell.mockResolvedValue(true);

    // Option de duree pour le recalcul du prix ; aucun paiement existant.
    db.consultation_type_durations = {
      id: "do-uuid-001",
      duration_minutes: 60,
      price_cents: 9000,
      weekend_price_cents: null,
    };

    vi.mocked(getSupabaseAndUser).mockResolvedValue({
      supabase: { from: mockFrom },
      user: { id: CONSULTANT_ID, email: "c@test.fr", roles: ["consultant"] },
    } as unknown as Awaited<ReturnType<typeof getSupabaseAndUser>>);
  });

  it("enregistre le paiement recalcule et emet la facture", async () => {
    db.bookings = makeOnSiteBooking();

    const result = await markBookingPaid(BOOKING_ID);

    expect(result.success).toBe(true);
    const payment = insertCalls.find((c) => c.table === "payments");
    expect(payment!.data).toMatchObject({
      amount_cents: 9000,
      // Aucune commission plateforme sur un encaissement sur place.
      platform_fee_cents: 0,
      status: "succeeded",
      stripe_payment_intent_id: null,
      type: "booking",
      reference_id: BOOKING_ID,
    });
    expect(mockEmitInvoice).toHaveBeenCalledWith(
      expect.anything(),
      "payments-inserted-id",
    );
    const audit = insertCalls.find((c) => c.table === "audit_logs");
    expect(audit!.data).toMatchObject({ action: "booking_marked_paid" });
  });

  it("refuse une reservation reglee en ligne", async () => {
    db.bookings = makeOnSiteBooking({ payment_method: "online" });

    const result = await markBookingPaid(BOOKING_ID);

    expect(result.success).toBe(false);
    expect(insertCalls.find((c) => c.table === "payments")).toBeUndefined();
    expect(mockEmitInvoice).not.toHaveBeenCalled();
  });

  it("refuse la reservation d'une autre consultante", async () => {
    db.bookings = makeOnSiteBooking({ consultant_id: AUTRE_CONSULTANTE });

    const result = await markBookingPaid(BOOKING_ID);

    expect(result.success).toBe(false);
    expect(insertCalls.find((c) => c.table === "payments")).toBeUndefined();
  });

  it("refuse une reservation annulee ou une cliente absente", async () => {
    db.bookings = makeOnSiteBooking({ status: "cancelled" });

    const result = await markBookingPaid(BOOKING_ID);

    expect(result.success).toBe(false);
    expect(insertCalls.find((c) => c.table === "payments")).toBeUndefined();
  });

  it("refuse d'encaisser sans profil de facturation complet", async () => {
    // Encaisser sans pouvoir facturer laisserait une vente sans facture : le
    // trou meme que cette action est censee eviter.
    db.bookings = makeOnSiteBooking();
    mockConsultantCanSell.mockResolvedValue(false);

    const result = await markBookingPaid(BOOKING_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain("facturation");
    expect(insertCalls.find((c) => c.table === "payments")).toBeUndefined();
    expect(mockEmitInvoice).not.toHaveBeenCalled();
  });

  it("rattrape un double encaissement (contrainte d'unicite)", async () => {
    db.bookings = makeOnSiteBooking();
    insertErrors.payments = { code: "23505" };

    const result = await markBookingPaid(BOOKING_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain("déjà encaissée");
    expect(mockEmitInvoice).not.toHaveBeenCalled();
  });
});

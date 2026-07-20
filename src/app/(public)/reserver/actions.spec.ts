import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ────────────────────────────────────────────

// Suivi des appels par table
const insertCalls: Array<{ table: string; data: unknown }> = [];
const upsertCalls: Array<{ table: string; data: unknown }> = [];

// Appels mockImplementationOnce pour simuler les séquences de from()
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

// ─── Dépendances externes mockées ────────────────────────────

const mockCreateCheckoutSession = vi.fn();

vi.mock("@/lib/stripe/connect", () => ({
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
}));

const mockSendGuestAccountEmail = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/emails/send", () => ({
  sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
  sendGuestAccountEmail: (...args: unknown[]) => mockSendGuestAccountEmail(...args),
  sendNewBookingNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/booking/pricing", () => ({
  computeBookingPrice: vi.fn().mockReturnValue({
    basePriceCents: 5000,
    isWeekendOrHoliday: false,
    surchargeCents: 0,
    totalCents: 5000,
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createBooking } from "./actions";
import type { BookingFormData } from "./actions";

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Crée un chain Supabase chaînable et thenable.
 * - singleData       : retourné par .single()
 * - listData         : retourné quand la query est await-ée sans .single()
 * - insertSingleData : retourné par .insert().select().single()
 * - tableName        : injecté par mockFrom pour tracer correctement les appels
 */
const createChain = (opts: {
  singleData?: unknown;
  listData?: unknown[];
  insertSingleData?: unknown;
  insertError?: { message: string } | null;
} = {}, tableName = "__unknown__") => {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    upsert: vi.fn((data: unknown) => {
      upsertCalls.push({ table: tableName, data });
      return Promise.resolve({ error: null });
    }),
    insert: vi.fn((data: unknown) => {
      insertCalls.push({ table: tableName, data });
      // Retourne le même chain pour permettre .select().single()
      return chain;
    }),
    single: vi.fn().mockImplementation(() => {
      // Si des données d'insert existent, c'est probablement un insert().select().single()
      return Promise.resolve({
        data: opts.insertSingleData ?? opts.singleData ?? null,
        error: opts.insertError ?? null,
      });
    }),
  };

  // Thenable pour les queries sans .single()
  (chain as { then?: (onFulfilled: (value: unknown) => unknown) => unknown }).then = (
    onFulfilled: (value: unknown) => unknown,
  ) => Promise.resolve({ data: opts.listData ?? [], error: null }).then(onFulfilled);

  return chain;
};

const makeBookingForm = (
  overrides: Partial<BookingFormData> = {},
): BookingFormData => ({
  consultation_type_id: "ct-uuid-001",
  consultant_id: "consultant-uuid-001",
  duration_option_id: "do-uuid-001",
  location: "teleconsultation",
  starts_at: "2024-06-10T09:00:00.000Z",
  contact: {
    first_name: "Marie",
    last_name: "Dupont",
    phone: "0612345678",
    email: "marie@test.fr",
    reason: "Difficultés d'allaitement",
  },
  payment_method: "online",
  ...overrides,
});

const DURATION_OPTION = {
  id: "do-uuid-001",
  consultation_type_id: "ct-uuid-001",
  duration_minutes: 60,
  price_cents: 5000,
  weekend_price_cents: null,
};

const CONSULTATION_TYPE = {
  id: "ct-uuid-001",
  currency: "eur",
  title: "Consultation allaitement",
  buffer_minutes: 15,
};

const CONSULTANT = {
  stripe_account_id: "acct_test_001",
  commission_rate: 10,
  profiles: {
    first_name: "Sophie",
    last_name: "Martin",
    email: "sophie@test.fr",
  },
};

// ─── 14-06 : Flow réservation en ligne ────────────────────────

describe("14-06 : createBooking — paiement en ligne", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    insertCalls.length = 0;
    upsertCalls.length = 0;

    // Séquence d'appels from() pour le flow online (teleconsultation) avec profil existant :
    // 1. consultation_type_durations → duration option
    // 2. consultation_types → type
    // NB : getSurcharge retourne 0 immédiatement pour teleconsultation (pas de requête DB)
    // 3. profiles → profil existant
    // 4. profiles.update → mise à jour
    // 5. consultants → consultant
    mockFrom
      .mockImplementationOnce((t: string) => createChain({ singleData: DURATION_OPTION }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTATION_TYPE }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: { id: "client-uuid-existing" } }, t))
      .mockImplementationOnce((t: string) => createChain({}, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTANT }, t));

    mockCreateCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/session_test" });
  });

  it("retourne success:true avec redirect_url vers Stripe", async () => {
    const result = await createBooking(makeBookingForm());

    expect(result.success).toBe(true);
    expect(result.data?.redirect_url).toBe("https://checkout.stripe.com/session_test");
  });

  it("passe les métadonnées correctes à Stripe (type, client_id, consultant_id, location)", async () => {
    await createBooking(makeBookingForm());

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          type: "booking",
          client_id: "client-uuid-existing",
          consultant_id: "consultant-uuid-001",
          location: "teleconsultation",
        }),
      }),
    );
  });

  it("retourne une erreur si la consultante n'a pas de Stripe account", async () => {
    // Remplace le mock consultant par un sans stripe_account_id (teleconsultation — pas de surcharge DB)
    mockFrom
      .mockReset()
      .mockImplementationOnce((t: string) => createChain({ singleData: DURATION_OPTION }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTATION_TYPE }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: { id: "client-uuid-existing" } }, t))
      .mockImplementationOnce((t: string) => createChain({}, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: { ...CONSULTANT, stripe_account_id: null } }, t));

    const result = await createBooking(makeBookingForm());

    expect(result.success).toBe(false);
    expect(result.error).toContain("Stripe");
  });

  it("retourne une erreur si paiement on_site + teleconsultation", async () => {
    // Teleconsultation → pas de requête surcharge
    mockFrom
      .mockReset()
      .mockImplementationOnce((t: string) => createChain({ singleData: DURATION_OPTION }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTATION_TYPE }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: { id: "client-uuid-existing" } }, t))
      .mockImplementationOnce((t: string) => createChain({}, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTANT }, t));

    const result = await createBooking(
      makeBookingForm({ payment_method: "on_site", location: "teleconsultation" }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("téléconsultation");
  });

  it("retourne une erreur si les données de contact sont invalides", async () => {
    const result = await createBooking(
      makeBookingForm({ contact: { first_name: "", last_name: "", phone: "", email: "not-an-email", reason: "" } }),
    );

    expect(result.success).toBe(false);
  });
});

// ─── 14-07 : Flow guest (compte créé automatiquement) ─────────

describe("14-07 : createBooking — flow guest (sans compte)", () => {
  const NEW_PROFILE_ID = "client-uuid-new";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    insertCalls.length = 0;
    upsertCalls.length = 0;

    // Séquence pour guest (teleconsultation — pas de requête surcharge) :
    // 1. consultation_type_durations
    // 2. consultation_types
    // 3. profiles.select → null (pas de compte existant)
    // 4. profiles.insert().select().single() → nouveau profil
    // 5. consultants
    mockFrom
      .mockImplementationOnce((t: string) => createChain({ singleData: DURATION_OPTION }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTATION_TYPE }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: null }, t))
      .mockImplementationOnce((t: string) =>
        createChain({ singleData: null, insertSingleData: { id: NEW_PROFILE_ID } }, t),
      )
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTANT }, t));

    mockCreateCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/guest_session" });
  });

  it("crée un nouveau profil avec le rôle client", async () => {
    await createBooking(makeBookingForm());

    const profileInsert = insertCalls.find((c) => c.table === "profiles");
    expect(profileInsert).toBeDefined();
    expect(profileInsert!.data).toMatchObject({
      email: "marie@test.fr",
      roles: ["client"],
    });
  });

  it("retourne success:true et redirect_url pour le guest", async () => {
    const result = await createBooking(makeBookingForm());

    expect(result.success).toBe(true);
    expect(result.data?.redirect_url).toContain("checkout.stripe.com");
  });

  it("utilise le nouveau client_id dans les métadonnées Stripe", async () => {
    await createBooking(makeBookingForm());

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ client_id: NEW_PROFILE_ID }),
      }),
    );
  });
});

// ─── 14-09 : Booking on_site ──────────────────────────────────

describe("14-09 : createBooking — paiement sur place (on_site)", () => {
  const BOOKING_ID = "booking-uuid-on-site";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    insertCalls.length = 0;

    // Séquence pour on_site + domicile (getSurcharge interroge la DB) :
    // 1. consultation_type_durations
    // 2. consultation_types
    // 3. consultant_locations → surcharge (null = 0€)
    // 4. profiles → profil existant
    // 5. profiles.update
    // 6. consultants
    // 7. bookings.insert().select().single() → booking créé
    mockFrom
      .mockImplementationOnce((t: string) => createChain({ singleData: DURATION_OPTION }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTATION_TYPE }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: null }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: { id: "client-uuid-001" } }, t))
      .mockImplementationOnce((t: string) => createChain({}, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTANT }, t))
      .mockImplementationOnce((t: string) => createChain({ insertSingleData: { id: BOOKING_ID } }, t));
  });

  it("crée le booking directement en DB avec status pending", async () => {
    const result = await createBooking(makeBookingForm({ payment_method: "on_site", location: "domicile" }));

    expect(result.success).toBe(true);
    expect(result.data?.booking_id).toBe(BOOKING_ID);
  });

  it("ne crée pas de session Stripe pour on_site", async () => {
    await createBooking(makeBookingForm({ payment_method: "on_site", location: "domicile" }));
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("retourne le booking_id sans redirect_url", async () => {
    const result = await createBooking(makeBookingForm({ payment_method: "on_site", location: "domicile" }));

    expect(result.data?.booking_id).toBeTruthy();
    expect(result.data?.redirect_url).toBeUndefined();
  });
});

// ─── 3-3 : lien de creation de compte pour une invitee ────────

describe("3-3 : createBooking on_site — lien de creation de compte", () => {
  const NEW_PROFILE_ID = "client-uuid-guest-on-site";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    insertCalls.length = 0;

    // Sequence on_site + domicile, cliente inconnue :
    // 1. consultation_type_durations
    // 2. consultation_types
    // 3. consultant_locations → surcharge
    // 4. profiles.select → null (aucun compte)
    // 5. profiles.insert().select().single() → nouveau profil
    // 6. consultants
    // 7. bookings.insert().select().single()
    // 8. profiles.update → pose du token de creation de mot de passe
    mockFrom
      .mockImplementationOnce((t: string) => createChain({ singleData: DURATION_OPTION }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTATION_TYPE }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: null }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: null }, t))
      .mockImplementationOnce((t: string) =>
        createChain({ singleData: null, insertSingleData: { id: NEW_PROFILE_ID } }, t),
      )
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTANT }, t))
      .mockImplementationOnce((t: string) => createChain({ insertSingleData: { id: "booking-1" } }, t))
      .mockImplementation((t: string) => createChain({}, t));
  });

  it("envoie un lien porteur d'un token, pas de l'adresse email", async () => {
    // Le lien pointait sur /reset-password?email=... ; la page ne lit que
    // `token` et affichait « Lien invalide » a toutes les invitees. L'email
    // partait, le compte existait, et il etait impossible d'y acceder.
    await createBooking(
      makeBookingForm({ payment_method: "on_site", location: "domicile" }),
    );

    expect(mockSendGuestAccountEmail).toHaveBeenCalledTimes(1);
    const [to, variables] = mockSendGuestAccountEmail.mock.calls[0];
    expect(to).toBe("marie@test.fr");
    expect(variables.setup_url).toMatch(/\/reset-password\?token=[0-9a-f]{64}$/);
  });
});

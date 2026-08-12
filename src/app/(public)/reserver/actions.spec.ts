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

const mockResolvePromo = vi.fn();
const mockAttachSession = vi.fn();

vi.mock("@/lib/promo/reserve", () => ({
  resolvePromoForPurchase: (...args: unknown[]) => mockResolvePromo(...args),
  attachSessionToRedemption: (...args: unknown[]) => mockAttachSession(...args),
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

const mockLookupGiftCard = vi.fn();

vi.mock("@/lib/gift-cards/balance", () => ({
  lookupGiftCard: (...args: unknown[]) => mockLookupGiftCard(...args),
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
    maybeSingle: vi.fn().mockImplementation(() =>
      Promise.resolve({
        data: opts.singleData ?? null,
        error: opts.insertError ?? null,
      }),
    ),
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
  // La date fixe des fixtures est dans le passe, donc toujours dans le delai
  // de retractation : sans cet accord, chaque scenario serait refuse.
  withdrawal_waiver_accepted: true,
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

// Requetes lues a part sur `consultants` (drapeau proprietaire, puis profil de
// facturation) : un meme objet satisfait les deux. Le profil est complet, sans
// quoi le gate de facturation refuserait la vente en ligne.
const CONSULTANT_EXTRA = {
  is_platform_owner: false,
  billing_legal_name: "Sophie Martin",
  billing_address: "1 rue des Lilas, 44000 Nantes",
  billing_siren: "540075819",
  billing_vat_number: "FR94540075819",
  billing_legal_form: "Entreprise individuelle",
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
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTANT }, t))
      // Lecture de `is_platform_owner`, faite a part pour ne pas dependre de
      // l'ordre entre migration et deploiement.
      .mockImplementation((t: string) => createChain({ singleData: CONSULTANT_EXTRA }, t));

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
      .mockImplementationOnce((t: string) => createChain({ singleData: { ...CONSULTANT, stripe_account_id: null } }, t))
      // Consultante tierce : le drapeau proprietaire est faux, donc l'absence
      // de compte connecte reste bloquante.
      .mockImplementation((t: string) => createChain({ singleData: CONSULTANT_EXTRA }, t));

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
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTANT }, t))
      .mockImplementation((t: string) => createChain({ singleData: CONSULTANT_EXTRA }, t));

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
      .mockImplementationOnce((t: string) => createChain({ insertSingleData: { id: BOOKING_ID } }, t))
      // Ecriture de la renonciation au droit de retractation.
      .mockImplementation((t: string) => createChain({}, t));
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

// ─── Renonciation au droit de retractation ───────────────────

describe("createBooking — droit de retractation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    insertCalls.length = 0;

    mockFrom
      .mockImplementationOnce((t: string) => createChain({ singleData: DURATION_OPTION }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTATION_TYPE }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: { id: "client-uuid-existing" } }, t))
      .mockImplementationOnce((t: string) => createChain({}, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTANT }, t))
      .mockImplementation((t: string) => createChain({ singleData: CONSULTANT_EXTRA }, t));

    mockCreateCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
  });

  it("refuse une consultation proche sans renonciation", async () => {
    // Une server action est un endpoint POST : la case du formulaire ne
    // protege rien, seule cette verification compte.
    const result = await createBooking(
      makeBookingForm({ withdrawal_waiver_accepted: false }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/rétractation/i);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("refuse aussi quand le champ est absent", async () => {
    // Un appelant qui ignore ce champ ne doit pas passer par defaut.
    const form = makeBookingForm();
    delete (form as { withdrawal_waiver_accepted?: boolean })
      .withdrawal_waiver_accepted;

    const result = await createBooking(form);

    expect(result.success).toBe(false);
  });

  it("consigne la renonciation avant de creer la session de paiement", async () => {
    // En cas de litige, c'est a la plateforme de prouver que l'accord a ete
    // recueilli — et il doit l'etre avant l'encaissement, pas apres.
    await createBooking(makeBookingForm());

    const waiver = insertCalls.find((c) => c.table === "withdrawal_waivers");
    expect(waiver).toBeDefined();
    expect(waiver!.data).toMatchObject({
      context: "booking",
      client_id: "client-uuid-existing",
    });
  });

  it("n'exige rien pour une consultation au-dela du delai", async () => {
    const farAway = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString();

    const result = await createBooking(
      makeBookingForm({
        starts_at: farAway,
        withdrawal_waiver_accepted: false,
      }),
    );

    expect(result.success).toBe(true);
    expect(insertCalls.find((c) => c.table === "withdrawal_waivers")).toBeUndefined();
  });
});

// ─── Consultante proprietaire de la plateforme ────────────────

describe("createBooking — consultante proprietaire de la plateforme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    insertCalls.length = 0;

    mockFrom
      .mockImplementationOnce((t: string) => createChain({ singleData: DURATION_OPTION }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: CONSULTATION_TYPE }, t))
      .mockImplementationOnce((t: string) => createChain({ singleData: { id: "client-uuid-existing" } }, t))
      .mockImplementationOnce((t: string) => createChain({}, t))
      .mockImplementationOnce((t: string) =>
        createChain(
          {
            singleData: {
              ...CONSULTANT,
              // Carole est la plateforme : pas de compte connecte, et le taux
              // de sa fiche ne doit pas s'appliquer.
              stripe_account_id: null,
              is_platform_owner: true,
            },
          },
          t,
        ),
      )
      .mockImplementation((t: string) =>
        createChain(
          { singleData: { ...CONSULTANT_EXTRA, is_platform_owner: true } },
          t,
        ),
      );

    mockCreateCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/owner" });
  });

  it("encaisse sur la plateforme sans compte connecte", async () => {
    // Avant, l'absence de `stripe_account_id` faisait echouer la reservation
    // avec « La consultante n'a pas configure son compte Stripe ».
    const result = await createBooking(makeBookingForm());

    expect(result.success).toBe(true);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        holdOnPlatform: true,
        consultantStripeAccountId: undefined,
      }),
    );
  });

  it("ne preleve aucune commission", async () => {
    // Une commission qu'elle se verse a elle-meme n'a pas de sens, et elle
    // apparaitrait dans les reversements Stripe comme un flux reel.
    await createBooking(makeBookingForm());

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        commissionRate: 0,
        metadata: expect.objectContaining({ platform_fee_cents: "0" }),
      }),
    );
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

// ─── Codes promo ──────────────────────────────────────────────

describe("createBooking — code promo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    insertCalls.length = 0;
    upsertCalls.length = 0;

    mockFrom
      .mockImplementationOnce((t: string) =>
        createChain({ singleData: DURATION_OPTION }, t),
      )
      .mockImplementationOnce((t: string) =>
        createChain({ singleData: CONSULTATION_TYPE }, t),
      )
      .mockImplementationOnce((t: string) =>
        createChain({ singleData: { id: "client-uuid-existing" } }, t),
      )
      .mockImplementationOnce((t: string) => createChain({}, t))
      .mockImplementationOnce((t: string) =>
        createChain({ singleData: CONSULTANT }, t),
      )
      .mockImplementation((t: string) =>
        createChain({ singleData: CONSULTANT_EXTRA }, t),
      );

    mockCreateCheckoutSession.mockResolvedValue({
      id: "cs_test_booking",
      url: "https://checkout.stripe.com/session_test",
    });
  });

  it("remise le montant envoye a Stripe et recalcule la commission", async () => {
    mockResolvePromo.mockResolvedValue({
      ok: true,
      promoCodeId: "code-1",
      code: "VILLAGE",
      discountCents: 1000,
      finalCents: 4000,
      redemptionId: "redemption-4",
    });

    await createBooking(makeBookingForm({ promo_code: "village" }));

    const args = mockCreateCheckoutSession.mock.calls[0][0];
    expect(args.priceInCents).toBe(4000);
    // 10 % de 4000, et non de 5000 : la consultante supporte la remise.
    expect(args.metadata.platform_fee_cents).toBe("400");
    expect(args.metadata.promo_redemption_id).toBe("redemption-4");
    expect(args.metadata.original_price_cents).toBe("5000");
    expect(mockAttachSession).toHaveBeenCalledWith(
      "redemption-4",
      "cs_test_booking",
    );
  });

  it("calcule platform_fee_cents sur le montant apres remise carte cadeau, pas avant", async () => {
    mockResolvePromo.mockResolvedValue(null);
    mockLookupGiftCard.mockResolvedValueOnce({
      ok: true,
      giftCardId: "gc-1",
      type: "amount",
      balanceCents: 2000,
      consultationTypeId: null,
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    await createBooking(makeBookingForm({ giftCardCode: "CADEAU-ABC234" }));

    const args = mockCreateCheckoutSession.mock.calls[0][0];
    // Prix 5000, carte cadeau -2000 => 3000 charges. Commission 10 % de 3000 = 300,
    // et non de 5000 (ce qui donnerait 500) : la carte cadeau doit reduire l'assiette
    // de la commission comme le fait deja le montant reellement envoye a Stripe.
    expect(args.priceInCents).toBe(3000);
    expect(args.metadata.platform_fee_cents).toBe("300");
    expect(args.metadata.gift_card_discount_cents).toBe("2000");
  });

  it("refuse la reservation quand le code est invalide", async () => {
    mockResolvePromo.mockResolvedValue({
      ok: false,
      error: "Ce code n'est pas valable pour cet achat.",
    });

    const result = await createBooking(
      makeBookingForm({ promo_code: "INCONNU" }),
    );

    expect(result).toEqual({
      success: false,
      error: "Ce code n'est pas valable pour cet achat.",
    });
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("ignore le code sur un paiement sur place", async () => {
    await createBooking(
      makeBookingForm({
        payment_method: "on_site",
        location: "domicile",
        promo_code: "VILLAGE",
      }),
    );

    expect(mockResolvePromo).not.toHaveBeenCalled();
  });
});

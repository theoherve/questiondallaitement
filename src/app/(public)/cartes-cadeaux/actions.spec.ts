import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ────────────────────────────────────────────
//
// Chaque test contrôle la séquence des appels from() via mockImplementationOnce,
// pour distinguer les requêtes sur `consultants` (lecture principale), sur le
// drapeau `is_platform_owner` (routage) et sur le profil de facturation
// (consultantCanSell) — même si elles ciblent toutes la table `consultants`.

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const createChain = (singleData: unknown) => {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: singleData, error: null }),
    single: vi.fn().mockResolvedValue({ data: singleData, error: null }),
    update: vi.fn().mockReturnThis(),
  };
  return chain;
};

/** Profil invitee introuvable (`.single()` sur `profiles`), suivi de sa création (`insert().select().single()`). */
const createGuestProfileLookupChain = () => {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return chain;
};

const createGuestProfileInsertChain = (id: string) => {
  const chain: Record<string, unknown> = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id }, error: null }),
  };
  return chain;
};

const mockCreateCheckoutSession = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (...args: unknown[]) => ({
    id: "cs_test_1",
    url: "https://checkout.stripe.com/cs_test_1",
  }),
);
vi.mock("@/lib/stripe/connect", () => ({
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
}));

import { purchaseGiftCard } from "./actions";

const CONSULTANT = {
  id: "consultant-1",
  stripe_account_id: "acct_1",
  commission_rate: 15,
};

const CONSULTANT_BILLING_COMPLETE = {
  billing_legal_name: "Sophie Martin",
  billing_address: "1 rue des Lilas, 44000 Nantes",
  billing_siren: "540075819",
  billing_vat_number: "FR94540075819",
  billing_legal_form: "Entreprise individuelle",
};

/**
 * Séquence par défaut pour un achat de type "amount" (pas de requête
 * consultation_types) : 1. consultants (lecture principale), 2. is_platform_owner,
 * 3. profil de facturation, 4. recherche du profil invitée (introuvable),
 * 5. création du profil invitée.
 */
const mockDefaultSequence = (guestProfileId = "guest-profile-1") => {
  mockFrom
    .mockImplementationOnce(() => createChain(CONSULTANT))
    .mockImplementationOnce(() => createChain({ is_platform_owner: false }))
    .mockImplementationOnce(() => createChain(CONSULTANT_BILLING_COMPLETE))
    .mockImplementationOnce(() => createGuestProfileLookupChain())
    .mockImplementationOnce(() => createGuestProfileInsertChain(guestProfileId));
};

describe("purchaseGiftCard", () => {
  beforeEach(() => {
    mockCreateCheckoutSession.mockClear();
    mockFrom.mockReset();
  });

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
    mockDefaultSequence();

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
        holdOnPlatform: false,
        consultantStripeAccountId: "acct_1",
        commissionRate: 15,
        metadata: expect.objectContaining({
          type: "gift_card",
          client_id: "guest-profile-1",
          reference_id: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
          ),
          gift_card_type: "amount",
          gift_card_amount_cents: "9000",
          buyer_email: "jean@example.com",
          delivery_mode: "email",
        }),
      }),
    );
  });

  it("holds funds on the platform without commission when the consultant is the platform owner", async () => {
    // Carole est la plateforme : router vers un compte connecte qui lui
    // appartient serait un aller-retour inutile (cf. 00051), et une commission
    // qu'elle se verserait a elle-meme n'a pas de sens.
    mockFrom
      .mockImplementationOnce(() =>
        createChain({ ...CONSULTANT, stripe_account_id: null }),
      )
      .mockImplementationOnce(() => createChain({ is_platform_owner: true }))
      .mockImplementationOnce(() => createChain(CONSULTANT_BILLING_COMPLETE))
      .mockImplementationOnce(() => createGuestProfileLookupChain())
      .mockImplementationOnce(() => createGuestProfileInsertChain("guest-profile-2"));

    const result = await purchaseGiftCard({
      type: "amount",
      amountCents: 9000,
      buyerName: "Jean Martin",
      buyerEmail: "jean@example.com",
      deliveryMode: "email",
    });

    expect(result.success).toBe(true);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        holdOnPlatform: true,
        consultantStripeAccountId: undefined,
        commissionRate: 0,
      }),
    );
  });

  it("returns a clean error instead of throwing when the consultant has no Stripe account", async () => {
    // Consultante tierce sans compte connecte : avant le fix, holdOnPlatform
    // n'etait jamais positionne et l'appel Stripe partait avec
    // transfer_data.destination undefined, provoquant une exception non geree.
    mockFrom
      .mockImplementationOnce(() =>
        createChain({ ...CONSULTANT, stripe_account_id: null }),
      )
      .mockImplementationOnce(() => createChain({ is_platform_owner: false }))
      .mockImplementation(() => createChain(CONSULTANT_BILLING_COMPLETE));

    const result = await purchaseGiftCard({
      type: "amount",
      amountCents: 9000,
      buyerName: "Jean Martin",
      buyerEmail: "jean@example.com",
      deliveryMode: "email",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Stripe");
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("returns a clean error when the consultant's billing profile is incomplete", async () => {
    mockFrom
      .mockImplementationOnce(() => createChain(CONSULTANT))
      .mockImplementationOnce(() => createChain({ is_platform_owner: false }))
      .mockImplementation(() =>
        createChain({ ...CONSULTANT_BILLING_COMPLETE, billing_legal_name: null }),
      );

    const result = await purchaseGiftCard({
      type: "amount",
      amountCents: 9000,
      buyerName: "Jean Martin",
      buyerEmail: "jean@example.com",
      deliveryMode: "email",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("facturation");
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });
});

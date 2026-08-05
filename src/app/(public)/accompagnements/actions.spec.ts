import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: async () => ({ id: "client-1", email: "cliente@test.fr" }),
}));

const mockCreateCheckoutSession = vi.fn();
vi.mock("@/lib/stripe/connect", () => ({
  createCheckoutSession: (...args: unknown[]) =>
    mockCreateCheckoutSession(...args),
}));

const mockResolvePromo = vi.fn();
const mockAttachSession = vi.fn();
vi.mock("@/lib/promo/reserve", () => ({
  resolvePromoForPurchase: (...args: unknown[]) => mockResolvePromo(...args),
  attachSessionToRedemption: (...args: unknown[]) => mockAttachSession(...args),
}));

vi.mock("@/lib/invoicing/consultant-billing", () => ({
  consultantCanSell: async () => true,
}));

vi.mock("@/lib/stripe/sale-routing", () => ({
  routeSale: () => ({
    holdOnPlatform: false,
    destinationAccountId: "acct_1",
    commissionRate: 20,
  }),
  isPlatformOwnerConsultant: async () => false,
}));

import { purchaseFormation } from "./actions";

const createChain = (result: { data?: unknown; count?: number }) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "in"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const formationRow = {
  id: "formation-1",
  title: "Pack",
  short_description: "desc",
  price_cents: 10_000,
  currency: "eur",
  consultant_id: "consultant-1",
  status: "published",
};

beforeEach(() => {
  mockFrom.mockReset();
  mockResolvePromo.mockReset();
  mockAttachSession.mockReset();
  mockCreateCheckoutSession.mockReset();
  mockCreateCheckoutSession.mockResolvedValue({
    id: "cs_test_1",
    url: "https://stripe.test/session",
  });

  mockFrom
    .mockReturnValueOnce(createChain({ data: null })) // inscription existante
    .mockReturnValueOnce(createChain({ data: formationRow })) // formation
    .mockReturnValueOnce(
      createChain({ data: { stripe_account_id: "acct_1", commission_rate: 20 } }),
    ) // consultante
    .mockReturnValueOnce(createChain({ count: 0 })); // collaboratrices
});

describe("purchaseFormation avec code promo", () => {
  it("envoie a Stripe le montant remise et la commission recalculee", async () => {
    mockResolvePromo.mockResolvedValue({
      ok: true,
      promoCodeId: "code-1",
      code: "SUPERMAMAN",
      discountCents: 1500,
      finalCents: 8500,
      redemptionId: "redemption-1",
    });

    const result = await purchaseFormation("formation-1", "supermaman");

    expect(result.success).toBe(true);
    const args = mockCreateCheckoutSession.mock.calls[0][0];
    expect(args.priceInCents).toBe(8500);
    // 20 % de 8500, et non de 10000 : la consultante supporte la remise.
    expect(args.metadata.platform_fee_cents).toBe("1700");
    expect(args.metadata.promo_code).toBe("SUPERMAMAN");
    expect(args.metadata.promo_redemption_id).toBe("redemption-1");
    expect(args.metadata.discount_cents).toBe("1500");
    expect(args.metadata.original_price_cents).toBe("10000");
    expect(mockAttachSession).toHaveBeenCalledWith("redemption-1", "cs_test_1");
  });

  it("refuse l'achat si le code est invalide", async () => {
    mockResolvePromo.mockResolvedValue({
      ok: false,
      error: "Ce code n'est pas valable pour cet achat.",
    });

    const result = await purchaseFormation("formation-1", "INCONNU");

    expect(result).toEqual({
      success: false,
      error: "Ce code n'est pas valable pour cet achat.",
    });
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("garde le prix plein sans code", async () => {
    const result = await purchaseFormation("formation-1");

    expect(result.success).toBe(true);
    const args = mockCreateCheckoutSession.mock.calls[0][0];
    expect(args.priceInCents).toBe(10_000);
    expect(args.metadata.promo_code).toBeUndefined();
    expect(mockResolvePromo).not.toHaveBeenCalled();
  });
});

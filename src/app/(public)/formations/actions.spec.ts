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
const mockConfirmRedemption = vi.fn();
vi.mock("@/lib/promo/reserve", () => ({
  resolvePromoForPurchase: (...args: unknown[]) => mockResolvePromo(...args),
  attachSessionToRedemption: (...args: unknown[]) => mockAttachSession(...args),
  confirmRedemption: (...args: unknown[]) => mockConfirmRedemption(...args),
}));

vi.mock("@/lib/invoicing/consultant-billing", () => ({
  consultantCanSell: async () => true,
}));

import { registerForFormation } from "./actions";

const createChain = (result: {
  data?: unknown;
  count?: number;
  error?: unknown;
}) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "in", "upsert"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const formationRow = {
  id: "formation-1",
  title: "Webinaire",
  description: "desc",
  price_cents: 5000,
  currency: "eur",
  consultant_id: "consultant-1",
  is_published: true,
  max_participants: null,
  slug: "webinaire",
};

beforeEach(() => {
  mockFrom.mockReset();
  mockResolvePromo.mockReset();
  mockAttachSession.mockReset();
  mockConfirmRedemption.mockReset();
  mockCreateCheckoutSession.mockReset();
  mockCreateCheckoutSession.mockResolvedValue({
    id: "cs_test_2",
    url: "https://stripe.test/session",
  });
});

describe("registerForFormation avec code promo", () => {
  it("applique la remise et recalcule la commission", async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: null })) // inscription existante
      .mockReturnValueOnce(createChain({ data: formationRow })) // formation
      .mockReturnValueOnce(
        createChain({
          data: { stripe_account_id: "acct_1", commission_rate: 20 },
        }),
      );

    mockResolvePromo.mockResolvedValue({
      ok: true,
      promoCodeId: "code-1",
      code: "ALLAITEMENT15",
      discountCents: 750,
      finalCents: 4250,
      redemptionId: "redemption-2",
    });

    const result = await registerForFormation("formation-1", "allaitement15");

    expect(result.success).toBe(true);
    const args = mockCreateCheckoutSession.mock.calls[0][0];
    expect(args.priceInCents).toBe(4250);
    expect(args.metadata.platform_fee_cents).toBe("850");
    expect(args.metadata.promo_redemption_id).toBe("redemption-2");
    expect(mockAttachSession).toHaveBeenCalledWith("redemption-2", "cs_test_2");
  });

  it("inscrit directement et confirme la reservation quand la remise ramene a zero", async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: null }))
      .mockReturnValueOnce(createChain({ data: formationRow }))
      .mockReturnValueOnce(
        createChain({
          data: { stripe_account_id: "acct_1", commission_rate: 20 },
        }),
      )
      .mockReturnValueOnce(createChain({ error: null })); // upsert inscription

    mockResolvePromo.mockResolvedValue({
      ok: true,
      promoCodeId: "code-1",
      code: "MILKPOWER",
      discountCents: 5000,
      finalCents: 0,
      redemptionId: "redemption-3",
    });

    const result = await registerForFormation("formation-1", "milkpower");

    expect(result.success).toBe(true);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
    expect(mockConfirmRedemption).toHaveBeenCalledWith("redemption-3", null);
  });
});

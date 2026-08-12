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

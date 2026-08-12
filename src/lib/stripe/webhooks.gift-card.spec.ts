import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedeem = vi.fn(async (..._args: unknown[]) => ({
  ok: true,
  redemptionId: "red-1",
  amountCents: 4000,
}));
vi.mock("@/lib/gift-cards/redeem", () => ({
  redeemGiftCard: (...args: unknown[]) => mockRedeem(...args),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ insert: () => ({ error: null }) }),
  }),
}));

import { finalizeBookingGiftCardRedemption } from "./webhooks";

describe("finalizeBookingGiftCardRedemption", () => {
  beforeEach(() => mockRedeem.mockClear());

  it("does nothing when no gift card code is present", async () => {
    await finalizeBookingGiftCardRedemption(
      { booking_id: "b-1", consultant_id: "c-1" },
      "b-1",
    );
    expect(mockRedeem).not.toHaveBeenCalled();
  });

  it("redeems the discounted amount against the booking when a code is present", async () => {
    await finalizeBookingGiftCardRedemption(
      {
        gift_card_code: "CADEAU-ABC234",
        gift_card_discount_cents: "4000",
        consultant_id: "c-1",
      },
      "b-1",
    );

    expect(mockRedeem).toHaveBeenCalledWith(
      expect.anything(),
      {
        code: "CADEAU-ABC234",
        amountCents: 4000,
        bookingId: "b-1",
        recordedBy: "c-1",
      },
    );
  });
});

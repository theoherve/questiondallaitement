import { describe, it, expect, vi } from "vitest";

const mockLookup = vi.fn();
vi.mock("@/lib/gift-cards/balance", () => ({
  lookupGiftCard: (...args: unknown[]) => mockLookup(...args),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { checkGiftCardForBooking } from "./actions";

describe("checkGiftCardForBooking", () => {
  it("caps the discount to the remaining balance for an amount card", async () => {
    mockLookup.mockResolvedValueOnce({
      ok: true,
      giftCardId: "gc-1",
      type: "amount",
      balanceCents: 4000,
      consultationTypeId: null,
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    const result = await checkGiftCardForBooking("CADEAU-ABC234", 9000);
    expect(result).toEqual({ ok: true, discountCents: 4000 });
  });

  it("applies the full price for a service card", async () => {
    mockLookup.mockResolvedValueOnce({
      ok: true,
      giftCardId: "gc-2",
      type: "service",
      balanceCents: null,
      consultationTypeId: "ct-1",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    const result = await checkGiftCardForBooking("CADEAU-XYZ987", 9000);
    expect(result).toEqual({ ok: true, discountCents: 9000 });
  });

  it("surfaces a not-found error", async () => {
    mockLookup.mockResolvedValueOnce({ ok: false, error: "not_found" });
    const result = await checkGiftCardForBooking("CADEAU-NOPE00", 9000);
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

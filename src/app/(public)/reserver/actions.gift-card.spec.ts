import { describe, it, expect, vi } from "vitest";

const mockLookup = vi.fn();
vi.mock("@/lib/gift-cards/balance", () => ({
  lookupGiftCard: (...args: unknown[]) => mockLookup(...args),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { checkGiftCardForBooking } from "./actions";

const BOOKED_TYPE_ID = "ct-1";

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

    const result = await checkGiftCardForBooking("CADEAU-ABC234", 9000, BOOKED_TYPE_ID);
    expect(result).toEqual({ ok: true, discountCents: 4000 });
  });

  it("applies the full price for a service card tied to the booked consultation type", async () => {
    mockLookup.mockResolvedValueOnce({
      ok: true,
      giftCardId: "gc-2",
      type: "service",
      balanceCents: null,
      consultationTypeId: BOOKED_TYPE_ID,
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    const result = await checkGiftCardForBooking("CADEAU-XYZ987", 9000, BOOKED_TYPE_ID);
    expect(result).toEqual({ ok: true, discountCents: 9000 });
  });

  it("refuses a service card sold for another consultation type", async () => {
    // Le cas qui rendait une carte « prestation » exploitable au-dela de sa
    // valeur : vendue pour une consultation courte, elle couvrait integralement
    // n'importe quelle prestation, y compris la plus chere.
    mockLookup.mockResolvedValueOnce({
      ok: true,
      giftCardId: "gc-3",
      type: "service",
      balanceCents: null,
      consultationTypeId: "ct-courte",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    const result = await checkGiftCardForBooking("CADEAU-XYZ987", 17000, "ct-longue");
    expect(result).toEqual({ ok: false, error: "consultation_type_mismatch" });
  });

  it("surfaces a not-found error", async () => {
    mockLookup.mockResolvedValueOnce({ ok: false, error: "not_found" });
    const result = await checkGiftCardForBooking("CADEAU-NOPE00", 9000, BOOKED_TYPE_ID);
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

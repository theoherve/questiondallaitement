import { describe, it, expect, vi } from "vitest";
import { redeemGiftCard } from "./redeem";

const buildSupabase = (rpcImpl: () => Promise<{ data: unknown; error: unknown }>) =>
  ({ rpc: vi.fn(() => rpcImpl()) }) as never;

describe("redeemGiftCard", () => {
  it("returns ok with the redemption id on success", async () => {
    const supabase = buildSupabase(async () => ({
      data: { id: "red-1", amount_cents: 5000 },
      error: null,
    }));

    const result = await redeemGiftCard(supabase, {
      code: "CADEAU-ABC234",
      amountCents: 5000,
      bookingId: "booking-1",
      recordedBy: "consultant-1",
    });

    expect(result).toEqual({ ok: true, redemptionId: "red-1", amountCents: 5000 });
  });

  it("maps gift_card_not_found to a typed error", async () => {
    const supabase = buildSupabase(async () => ({
      data: null,
      error: { message: "gift_card_not_found" },
    }));

    const result = await redeemGiftCard(supabase, {
      code: "CADEAU-NOPE00",
      amountCents: 1000,
      recordedBy: "consultant-1",
    });

    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it.each([
    ["gift_card_not_active", "not_active"],
    ["gift_card_expired", "expired"],
    ["gift_card_already_used", "already_used"],
    ["gift_card_insufficient_balance", "insufficient_balance"],
    ["invoice_consultant_mismatch", "invoice_mismatch"],
    ["something_else", "unknown"],
  ])("maps RPC error %s to %s", async (rpcMessage, expected) => {
    const supabase = buildSupabase(async () => ({
      data: null,
      error: { message: rpcMessage },
    }));

    const result = await redeemGiftCard(supabase, {
      code: "CADEAU-ABC234",
      amountCents: 1000,
      recordedBy: "consultant-1",
    });

    expect(result).toEqual({ ok: false, error: expected });
  });

  it("passes bookingId/invoiceId/recordedBy through to the RPC call", async () => {
    const rpc = vi.fn(async () => ({ data: { id: "red-2", amount_cents: 100 }, error: null }));
    const supabase = { rpc } as never;

    await redeemGiftCard(supabase, {
      code: "CADEAU-ABC234",
      amountCents: 100,
      invoiceId: "invoice-1",
      recordedBy: "consultant-1",
    });

    expect(rpc).toHaveBeenCalledWith("redeem_gift_card", {
      p_code: "CADEAU-ABC234",
      p_amount_cents: 100,
      p_booking_id: null,
      p_invoice_id: "invoice-1",
      p_recorded_by: "consultant-1",
    });
  });
});

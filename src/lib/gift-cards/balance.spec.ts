import { describe, it, expect, vi } from "vitest";
import { lookupGiftCard } from "./balance";

const buildSupabase = (giftCard: unknown, redemptions: unknown[]) => {
  const from = vi.fn((table: string) => {
    if (table === "gift_cards") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: giftCard, error: null }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: async () => ({ data: redemptions, error: null }),
      }),
    };
  });
  return { from } as never;
};

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();

describe("lookupGiftCard", () => {
  it("returns not_found when no row matches", async () => {
    const result = await lookupGiftCard(buildSupabase(null, []), "CADEAU-NOPE00");
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("returns expired when past expires_at", async () => {
    const supabase = buildSupabase(
      { id: "gc-1", type: "amount", status: "active", expires_at: PAST, initial_amount_cents: 9000, consultation_type_id: null },
      [],
    );
    const result = await lookupGiftCard(supabase, "CADEAU-ABC234");
    expect(result).toEqual({ ok: false, error: "expired" });
  });

  it("returns not_active when status is cancelled", async () => {
    const supabase = buildSupabase(
      { id: "gc-1", type: "amount", status: "cancelled", expires_at: FUTURE, initial_amount_cents: 9000, consultation_type_id: null },
      [],
    );
    const result = await lookupGiftCard(supabase, "CADEAU-ABC234");
    expect(result).toEqual({ ok: false, error: "not_active" });
  });

  it("returns the remaining balance for an amount card with partial usage", async () => {
    const supabase = buildSupabase(
      { id: "gc-1", type: "amount", status: "active", expires_at: FUTURE, initial_amount_cents: 9000, consultation_type_id: null },
      [{ amount_cents: 3000 }],
    );
    const result = await lookupGiftCard(supabase, "CADEAU-ABC234");
    expect(result).toEqual({
      ok: true,
      giftCardId: "gc-1",
      type: "amount",
      balanceCents: 6000,
      consultationTypeId: null,
      expiresAt: FUTURE,
    });
  });

  it("returns already_used for a service card already redeemed", async () => {
    const supabase = buildSupabase(
      { id: "gc-1", type: "service", status: "active", expires_at: FUTURE, initial_amount_cents: null, consultation_type_id: "ct-1" },
      [{ amount_cents: 1 }],
    );
    const result = await lookupGiftCard(supabase, "CADEAU-ABC234");
    expect(result).toEqual({ ok: false, error: "already_used" });
  });

  it("returns null balanceCents for an unused service card", async () => {
    const supabase = buildSupabase(
      { id: "gc-1", type: "service", status: "active", expires_at: FUTURE, initial_amount_cents: null, consultation_type_id: "ct-1" },
      [],
    );
    const result = await lookupGiftCard(supabase, "CADEAU-ABC234");
    expect(result).toEqual({
      ok: true,
      giftCardId: "gc-1",
      type: "service",
      balanceCents: null,
      consultationTypeId: "ct-1",
      expiresAt: FUTURE,
    });
  });
});

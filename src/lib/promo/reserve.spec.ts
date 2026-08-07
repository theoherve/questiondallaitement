import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { resolvePromoForPurchase } from "./reserve";

/** Chain Supabase minimal, chainable et thenable. */
const createChain = (result: {
  data?: unknown;
  count?: number;
  error?: unknown;
}) => {
  const chain: Record<string, unknown> = {};
  const passthrough = [
    "select",
    "eq",
    "ilike",
    "in",
    "gte",
    "or",
    "insert",
    "update",
  ];
  for (const method of passthrough) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => result);
  chain.single = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const activeCode = {
  id: "code-1",
  code: "SUPERMAMAN",
  label: null,
  discount_type: "percent",
  discount_value: 15,
  scope_all: true,
  valid_from: null,
  valid_until: null,
  max_redemptions: null,
  max_per_user: 1,
  min_order_cents: 0,
  trigger_delay_hours: null,
  is_active: true,
  created_by: null,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
  promo_code_targets: [],
  promo_code_triggers: [],
};

beforeEach(() => {
  mockFrom.mockReset();
});

describe("resolvePromoForPurchase", () => {
  it("renvoie la remise et cree la reservation", async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: activeCode })) // promo_codes
      .mockReturnValueOnce(createChain({ count: 0 })) // compteur global
      .mockReturnValueOnce(createChain({ count: 0 })) // compteur cliente
      .mockReturnValueOnce(createChain({ data: { id: "redemption-1" } })); // insert

    const result = await resolvePromoForPurchase({
      code: "supermaman",
      serviceKind: "accompagnement",
      itemId: "formation-1",
      amountCents: 10_000,
      profileId: "profile-1",
      reserve: true,
      orderKind: "accompagnement",
      referenceId: "formation-1",
    });

    expect(result).toEqual({
      ok: true,
      promoCodeId: "code-1",
      code: "SUPERMAMAN",
      discountCents: 1500,
      finalCents: 8500,
      redemptionId: "redemption-1",
    });
  });

  it("ne cree pas de reservation en mode apercu", async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: activeCode }))
      .mockReturnValueOnce(createChain({ count: 0 }))
      .mockReturnValueOnce(createChain({ count: 0 }));

    const result = await resolvePromoForPurchase({
      code: "SUPERMAMAN",
      serviceKind: "accompagnement",
      itemId: "formation-1",
      amountCents: 10_000,
      profileId: "profile-1",
      reserve: false,
    });

    expect(result).toMatchObject({ ok: true, redemptionId: null });
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  it("refuse un code inconnu avec le message generique", async () => {
    mockFrom.mockReturnValueOnce(createChain({ data: null }));

    const result = await resolvePromoForPurchase({
      code: "INCONNU",
      serviceKind: "accompagnement",
      itemId: "formation-1",
      amountCents: 10_000,
      profileId: "profile-1",
      reserve: false,
    });

    expect(result).toEqual({
      ok: false,
      error: "Ce code n'est pas valable pour cet achat.",
    });
  });

  it("refuse quand la cliente a deja utilise le code", async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: activeCode }))
      .mockReturnValueOnce(createChain({ count: 1 }))
      .mockReturnValueOnce(createChain({ count: 1 }));

    const result = await resolvePromoForPurchase({
      code: "SUPERMAMAN",
      serviceKind: "accompagnement",
      itemId: "formation-1",
      amountCents: 10_000,
      profileId: "profile-1",
      reserve: false,
    });

    expect(result).toEqual({
      ok: false,
      error: "Vous avez déjà utilisé ce code.",
    });
  });
});

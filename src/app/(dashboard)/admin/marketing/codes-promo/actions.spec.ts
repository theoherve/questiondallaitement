import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const insertCalls: { table: string; data: unknown }[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: async () => ({ id: "admin-1", roles: ["admin"] }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createPromoCode } from "./actions";

const createChain = (
  table: string,
  result: { data?: unknown; error?: unknown },
) => {
  const chain: Record<string, unknown> = {};
  chain.insert = vi.fn((data: unknown) => {
    insertCalls.push({ table, data });
    return chain;
  });
  for (const method of ["select", "eq", "update", "delete", "order"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const baseInput = {
  code: "SERENITE",
  discount_type: "percent" as const,
  discount_value: 15,
  scope_all: false,
  targets: [
    {
      target_type: "formation" as const,
      target_id: "11111111-1111-4111-8111-111111111111",
    },
  ],
  triggers: [],
  max_per_user: 1,
  min_order_cents: 0,
  is_active: true,
};

beforeEach(() => {
  mockFrom.mockReset();
  insertCalls.length = 0;
});

describe("createPromoCode", () => {
  it("cree le code et ses cibles", async () => {
    mockFrom
      .mockReturnValueOnce(
        createChain("promo_codes", { data: { id: "code-1" } }),
      )
      .mockReturnValueOnce(createChain("promo_code_targets", { error: null }));

    const result = await createPromoCode(baseInput);

    expect(result).toEqual({ success: true, data: { id: "code-1" } });
    expect(insertCalls[1]).toEqual({
      table: "promo_code_targets",
      data: [
        {
          promo_code_id: "code-1",
          target_type: "formation",
          target_id: "11111111-1111-4111-8111-111111111111",
        },
      ],
    });
  });

  it("normalise le code en majuscules", async () => {
    mockFrom.mockReturnValue(
      createChain("promo_codes", { data: { id: "code-1" } }),
    );

    await createPromoCode({ ...baseInput, scope_all: true, targets: [] });

    expect(insertCalls[0].data).toMatchObject({ code: "SERENITE" });
  });

  it("refuse une remise en pourcentage superieure a cent", async () => {
    const result = await createPromoCode({ ...baseInput, discount_value: 150 });

    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("refuse un ciblage vide sans scope_all", async () => {
    const result = await createPromoCode({ ...baseInput, targets: [] });

    expect(result.success).toBe(false);
  });

  it("signale un code deja existant", async () => {
    mockFrom.mockReturnValueOnce(
      createChain("promo_codes", { data: null, error: { code: "23505" } }),
    );

    const result = await createPromoCode({
      ...baseInput,
      scope_all: true,
      targets: [],
    });

    expect(result).toEqual({ success: false, error: "Ce code existe déjà." });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockInsert = vi.fn(async () => ({
  id: "gc-1",
  code: "CADEAU-ABC234",
  expires_at: "2027-08-12T00:00:00.000Z",
}));
vi.mock("@/lib/gift-cards/code", () => ({
  insertGiftCardWithUniqueCode: (...args: unknown[]) => mockInsert(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        order: async () => ({ data: [], error: null }),
      }),
    }),
  }),
}));

import { issueGiftCardManually, listGiftCards } from "./actions";

describe("admin cartes-cadeaux actions", () => {
  beforeEach(() => {
    mockGetSessionUser.mockClear();
    mockInsert.mockClear();
  });

  it("rejects issuance for a non-admin session", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "u-1", email: "a@b.com", roles: ["client"] });

    await expect(
      issueGiftCardManually({
        type: "amount",
        amountCents: 9000,
        buyerName: "Geste commercial",
        buyerEmail: "client@example.com",
        deliveryMode: "email",
      }),
    ).rejects.toBeTruthy();

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("issues a gift card with created_by=manual for an admin session", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "admin-1", email: "admin@example.com", roles: ["admin"] });

    const result = await issueGiftCardManually({
      type: "amount",
      amountCents: 9000,
      buyerName: "Geste commercial",
      buyerEmail: "client@example.com",
      deliveryMode: "email",
    });

    expect(result.success).toBe(true);
    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-ABC234");
    expect(row).toMatchObject({ created_by: "manual", created_by_admin_id: "admin-1" });
  });

  it("lists gift cards for an admin session", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "admin-1", email: "admin@example.com", roles: ["admin"] });
    const result = await listGiftCards();
    expect(result.success).toBe(true);
  });
});

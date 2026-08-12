import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSessionUser, selectMock, eqMock, orderMock, maybeSingleMock, fromMock } = vi.hoisted(() => {
  const maybeSingleMock = vi.fn();
  const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const orderMock = vi.fn();
  const selectMock = vi.fn(() => ({ eq: eqMock, order: orderMock }));
  return {
    mockGetSessionUser: vi.fn(),
    selectMock,
    eqMock,
    orderMock,
    maybeSingleMock,
    fromMock: vi.fn(() => ({ select: selectMock })),
  };
});

vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

const mockInsert = vi.fn(async () => ({
  id: "gc-1",
  code: "CADEAU-ABC234",
  expires_at: "2027-08-12T00:00:00.000Z",
}));
vi.mock("@/lib/gift-cards/code", () => ({
  insertGiftCardWithUniqueCode: (...args: unknown[]) => mockInsert(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import { issueGiftCardManually, listGiftCards } from "./actions";

describe("admin cartes-cadeaux actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderMock.mockResolvedValue({ data: [], error: null });
    maybeSingleMock.mockResolvedValue({ data: { id: "consultant-1" } });
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
    ).rejects.toThrow("NEXT_REDIRECT");

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
    expect(row).toMatchObject({
      created_by: "manual",
      created_by_admin_id: "admin-1",
      consultant_id: "consultant-1",
    });
  });

  it("returns a clean error when no active consultant is found", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "admin-1", email: "admin@example.com", roles: ["admin"] });
    maybeSingleMock.mockResolvedValueOnce({ data: null });

    const result = await issueGiftCardManually({
      type: "amount",
      amountCents: 9000,
      buyerName: "Geste commercial",
      buyerEmail: "client@example.com",
      deliveryMode: "email",
    });

    expect(result).toEqual({ success: false, error: "Praticienne introuvable." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("lists gift cards for an admin session", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "admin-1", email: "admin@example.com", roles: ["admin"] });
    const result = await listGiftCards();
    expect(result.success).toBe(true);
  });
});

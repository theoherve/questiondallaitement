import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomGiftCardCode, insertGiftCardWithUniqueCode } from "./code";

describe("randomGiftCardCode", () => {
  it("returns a CADEAU- prefixed code with 6 unambiguous characters", () => {
    const code = randomGiftCardCode();
    expect(code).toMatch(/^CADEAU-[A-HJ-NP-Z2-9]{6}$/);
  });

  it("returns different codes across calls", () => {
    const codes = new Set(Array.from({ length: 50 }, () => randomGiftCardCode()));
    expect(codes.size).toBeGreaterThan(45);
  });
});

describe("insertGiftCardWithUniqueCode", () => {
  let singleImpl: () => Promise<{ data: unknown; error: unknown }>;
  const mockSingle = vi.fn(() => singleImpl());
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const supabase = { from: vi.fn(() => ({ insert: mockInsert })) } as never;

  beforeEach(() => {
    mockInsert.mockClear();
    mockSelect.mockClear();
    mockSingle.mockClear();
  });

  it("returns the row on first successful insert", async () => {
    singleImpl = async () => ({ data: { id: "gc-1", code: "CADEAU-ABC234" }, error: null });

    const row = await insertGiftCardWithUniqueCode(supabase, (code) => ({
      code,
      buyer_email: "a@b.com",
    }));

    expect(row.id).toBe("gc-1");
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("retries on unique violation (23505) then succeeds", async () => {
    let call = 0;
    singleImpl = async () => {
      call += 1;
      if (call === 1) return { data: null, error: { code: "23505" } };
      return { data: { id: "gc-2", code: "CADEAU-XYZ987" }, error: null };
    };

    const row = await insertGiftCardWithUniqueCode(supabase, (code) => ({ code }));

    expect(row.id).toBe("gc-2");
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("throws after maxAttempts consecutive collisions", async () => {
    singleImpl = async () => ({ data: null, error: { code: "23505" } });

    await expect(
      insertGiftCardWithUniqueCode(supabase, (code) => ({ code }), 3),
    ).rejects.toThrow("gift_card_code_generation_failed");
    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  it("rethrows immediately on a non-collision error", async () => {
    singleImpl = async () => ({ data: null, error: { code: "42501" } });

    await expect(
      insertGiftCardWithUniqueCode(supabase, (code) => ({ code })),
    ).rejects.toBeTruthy();
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});

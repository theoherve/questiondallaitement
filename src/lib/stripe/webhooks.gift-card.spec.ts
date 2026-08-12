import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn(async () => ({
  id: "gc-1",
  code: "CADEAU-ABC234",
  expires_at: "2027-08-12T00:00:00.000Z",
}));
vi.mock("@/lib/gift-cards/code", () => ({
  insertGiftCardWithUniqueCode: (...args: unknown[]) => mockInsert(...args),
}));

const mockSendEmails = vi.fn(async () => {});
vi.mock("@/lib/gift-cards/emails", () => ({
  sendGiftCardPurchaseEmails: (...args: unknown[]) => mockSendEmails(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
  }),
}));

import { handleGiftCardPurchase } from "./webhooks";

describe("handleGiftCardPurchase", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockSendEmails.mockClear();
  });

  it("creates an amount gift card with a 12-month expiry and sends emails", async () => {
    await handleGiftCardPurchase(
      {
        gift_card_type: "amount",
        gift_card_amount_cents: "9000",
        consultant_id: "consultant-1",
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        delivery_mode: "email",
      },
      "pi_123",
    );

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-ABC234");
    expect(row).toMatchObject({
      type: "amount",
      initial_amount_cents: 9000,
      consultant_id: "consultant-1",
      buyer_name: "Jean Martin",
      buyer_email: "jean@example.com",
      delivery_mode: "email",
      created_by: "purchase",
    });
    expect(mockSendEmails).toHaveBeenCalledTimes(1);
  });

  it("creates a service gift card with the consultation_type_id", async () => {
    await handleGiftCardPurchase(
      {
        gift_card_type: "service",
        consultation_type_id: "ct-1",
        consultant_id: "consultant-1",
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        delivery_mode: "pdf",
      },
      "pi_123",
    );

    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-XYZ987");
    expect(row).toMatchObject({
      type: "service",
      consultation_type_id: "ct-1",
      initial_amount_cents: null,
    });
  });
});

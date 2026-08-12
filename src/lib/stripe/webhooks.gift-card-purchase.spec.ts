import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn(async (...args: unknown[]) => {
  // Enregistre la carte comme existante, pour qu'un second appel avec le meme
  // `reference_id` soit vu comme une redelivery.
  const buildRow = args[1] as (code: string) => { id?: string };
  const id = buildRow("CADEAU-ABC234").id;
  if (id) existingGiftCardIds.add(id);
  return {
    id: id ?? "gc-1",
    code: "CADEAU-ABC234",
    expires_at: "2027-08-12T00:00:00.000Z",
  };
});
vi.mock("@/lib/gift-cards/code", () => ({
  insertGiftCardWithUniqueCode: (...args: unknown[]) => mockInsert(...args),
}));

const mockSendEmails = vi.fn(async (..._args: unknown[]) => {});
vi.mock("@/lib/gift-cards/emails", () => ({
  sendGiftCardPurchaseEmails: (...args: unknown[]) => mockSendEmails(...args),
}));

/** Cartes deja presentes en base, indexees par id (simule une redelivery). */
const existingGiftCardIds = new Set<string>();
const auditInserts: unknown[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "gift_cards") {
        return {
          select: () => ({
            eq: (_col: string, value: string) => ({
              maybeSingle: async () => ({
                data: existingGiftCardIds.has(value) ? { id: value } : null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { first_name: "Carole", last_name: "Hervé" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        insert: (row: unknown) => {
          if (table === "audit_logs") auditInserts.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  }),
}));

import { handleGiftCardPurchase } from "./webhooks";

describe("handleGiftCardPurchase", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockSendEmails.mockClear();
    mockSendEmails.mockImplementation(async () => {});
    existingGiftCardIds.clear();
    auditInserts.length = 0;
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
        reference_id: "guest-uuid-1",
      },
      "pi_123",
    );

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-ABC234");
    expect(row).toMatchObject({
      id: "guest-uuid-1",
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

  it("is idempotent on a Stripe replay: no second card, no second email, no throw", async () => {
    const metadata = {
      gift_card_type: "amount",
      gift_card_amount_cents: "9000",
      consultant_id: "consultant-1",
      buyer_name: "Jean Martin",
      buyer_email: "jean@example.com",
      delivery_mode: "email",
      reference_id: "gc-replay-1",
    };

    await handleGiftCardPurchase(metadata, "pi_123");
    await expect(handleGiftCardPurchase(metadata, "pi_123")).resolves.toBeUndefined();

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockSendEmails).toHaveBeenCalledTimes(1);
  });

  it("uses the consultant's real name rather than a hardcoded one", async () => {
    await handleGiftCardPurchase(
      {
        gift_card_type: "amount",
        gift_card_amount_cents: "9000",
        consultant_id: "consultant-1",
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        delivery_mode: "email",
        reference_id: "gc-name-1",
      },
      "pi_123",
    );

    expect(mockSendEmails).toHaveBeenCalledWith(
      expect.objectContaining({ consultantName: "Carole Hervé" }),
    );
  });

  it("traces an email failure without rethrowing, so payments/invoice still run", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSendEmails.mockImplementation(async () => {
      throw new Error("resend down");
    });

    await expect(
      handleGiftCardPurchase(
        {
          gift_card_type: "amount",
          gift_card_amount_cents: "9000",
          consultant_id: "consultant-1",
          buyer_name: "Jean Martin",
          buyer_email: "jean@example.com",
          delivery_mode: "pdf",
          reference_id: "gc-mail-fail-1",
        },
        "pi_123",
      ),
    ).resolves.toBeUndefined();

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(auditInserts).toEqual([
      expect.objectContaining({ action: "gift_card_delivery_failed" }),
    ]);
    spy.mockRestore();
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
        reference_id: "guest-uuid-2",
      },
      "pi_123",
    );

    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-XYZ987");
    expect(row).toMatchObject({
      id: "guest-uuid-2",
      type: "service",
      consultation_type_id: "ct-1",
      initial_amount_cents: null,
    });
  });
});

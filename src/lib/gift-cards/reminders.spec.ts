import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendReminder = vi.fn(async (..._args: unknown[]) => {});
vi.mock("./emails", () => ({
  sendGiftCardExpiryReminderEmail: (...args: unknown[]) => mockSendReminder(...args),
}));

let cards: Record<string, unknown>[] = [];
const updatedIds: string[] = [];
/** IDs pour lesquels le test simule un echec de `.update(...).eq("id", id)`. */
const forcedUpdateFailureIds = new Set<string>();

const buildChain = () => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    gte: () => chain,
    lte: () => Promise.resolve({ data: cards, error: null }),
    update: (patch: Record<string, unknown>) => ({
      eq: (_col: string, id: string) => {
        expect(patch.reminder_sent_at).toBeDefined();
        if (forcedUpdateFailureIds.has(id)) {
          return Promise.resolve({ error: { message: "connection reset" } });
        }
        updatedIds.push(id);
        return Promise.resolve({ error: null });
      },
    }),
  };
  return chain;
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => buildChain() }),
}));

import { sendGiftCardExpiryReminders } from "./reminders";

const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

describe("sendGiftCardExpiryReminders", () => {
  beforeEach(() => {
    mockSendReminder.mockClear();
    updatedIds.length = 0;
    forcedUpdateFailureIds.clear();
    cards = [];
  });

  it("sends a reminder to the beneficiary when set, else the buyer", async () => {
    cards = [
      {
        id: "gc-1",
        code: "CADEAU-ABC234",
        type: "amount",
        initial_amount_cents: 9000,
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        beneficiary_name: "Marie Dupont",
        beneficiary_email: "marie@example.com",
        expires_at: inDays(20),
        gift_card_redemptions: [],
      },
    ];

    const sent = await sendGiftCardExpiryReminders();

    expect(sent).toBe(1);
    expect(mockSendReminder).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: "marie@example.com" }),
    );
    expect(updatedIds).toEqual(["gc-1"]);
  });

  it("falls back to the buyer when there is no beneficiary", async () => {
    cards = [
      {
        id: "gc-2",
        code: "CADEAU-XYZ789",
        type: "service",
        initial_amount_cents: null,
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        beneficiary_name: null,
        beneficiary_email: null,
        expires_at: inDays(20),
        gift_card_redemptions: [],
      },
    ];

    await sendGiftCardExpiryReminders();

    expect(mockSendReminder).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: "jean@example.com" }),
    );
  });

  it("skips a fully-redeemed amount card even if still marked active", async () => {
    cards = [
      {
        id: "gc-3",
        code: "CADEAU-USED00",
        type: "amount",
        initial_amount_cents: 9000,
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        beneficiary_name: null,
        beneficiary_email: null,
        expires_at: inDays(20),
        gift_card_redemptions: [{ amount_cents: 9000 }],
      },
    ];

    const sent = await sendGiftCardExpiryReminders();

    expect(sent).toBe(0);
    expect(mockSendReminder).not.toHaveBeenCalled();
    expect(updatedIds).toEqual([]);
  });

  it("does not mark reminder_sent_at when the email send fails", async () => {
    mockSendReminder.mockRejectedValueOnce(new Error("resend down"));
    cards = [
      {
        id: "gc-4",
        code: "CADEAU-FAIL00",
        type: "amount",
        initial_amount_cents: 9000,
        buyer_name: "Jean Martin",
        buyer_email: "jean@example.com",
        beneficiary_name: null,
        beneficiary_email: null,
        expires_at: inDays(20),
        gift_card_redemptions: [],
      },
    ];
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const sent = await sendGiftCardExpiryReminders();

    expect(sent).toBe(0);
    expect(updatedIds).toEqual([]);
    spy.mockRestore();
  });

  it(
    "n'incremente pas sent pour une carte dont le marquage reminder_sent_at " +
      "echoue, traite les autres cartes, puis leve une erreur en fin de boucle",
    async () => {
      cards = [
        {
          id: "gc-ok-1",
          code: "CADEAU-OK0001",
          type: "amount",
          initial_amount_cents: 9000,
          buyer_name: "Jean Martin",
          buyer_email: "jean@example.com",
          beneficiary_name: null,
          beneficiary_email: null,
          expires_at: inDays(20),
          gift_card_redemptions: [],
        },
        {
          id: "gc-update-fail",
          code: "CADEAU-FAILUP",
          type: "amount",
          initial_amount_cents: 9000,
          buyer_name: "Marie Curie",
          buyer_email: "marie.curie@example.com",
          beneficiary_name: null,
          beneficiary_email: null,
          expires_at: inDays(21),
          gift_card_redemptions: [],
        },
        {
          id: "gc-ok-2",
          code: "CADEAU-OK0002",
          type: "amount",
          initial_amount_cents: 9000,
          buyer_name: "Ada Lovelace",
          buyer_email: "ada@example.com",
          beneficiary_name: null,
          beneficiary_email: null,
          expires_at: inDays(22),
          gift_card_redemptions: [],
        },
      ];
      forcedUpdateFailureIds.add("gc-update-fail");
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(sendGiftCardExpiryReminders()).rejects.toThrow(
        /reminder_sent_at.*CADEAU-FAILUP/,
      );

      // Les deux autres cartes ont ete traitees (email envoye + marquage
      // reussi) malgre l'echec de la troisieme : le throw n'interrompt pas la
      // boucle, il ne fait que remonter l'echec une fois toutes les cartes
      // traitees.
      expect(mockSendReminder).toHaveBeenCalledTimes(3);
      expect(updatedIds).toEqual(["gc-ok-1", "gc-ok-2"]);

      spy.mockRestore();
    },
  );
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createManualInvoice, recordSettlement, exportInvoicesCsv } from "./actions";

const mockGetSupabaseAndUser = vi.fn();
vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: () => mockGetSupabaseAndUser(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/invoicing/send-invoice-email", () => ({
  sendInvoiceEmail: vi.fn().mockResolvedValue(undefined),
}));
const mockRedeem = vi.fn(async (..._args: unknown[]) => ({
  ok: true,
  redemptionId: "red-1",
  amountCents: 5000,
}));
vi.mock("@/lib/gift-cards/redeem", () => ({
  redeemGiftCard: (...args: unknown[]) => mockRedeem(...args),
}));
type GiftCardLookupResult =
  | {
      ok: true;
      giftCardId: string;
      type: "amount" | "service";
      balanceCents: number | null;
      consultationTypeId: string | null;
      expiresAt: string;
    }
  | { ok: false; error: "not_found" | "not_active" | "expired" | "already_used" };

const mockLookupGiftCard = vi.fn(
  async (..._args: unknown[]): Promise<GiftCardLookupResult> => ({
    ok: true,
    giftCardId: "gc-1",
    type: "amount",
    balanceCents: 5000,
    consultationTypeId: null,
    expiresAt: "2099-01-01T00:00:00.000Z",
  }),
);
vi.mock("@/lib/gift-cards/balance", () => ({
  lookupGiftCard: (...args: unknown[]) => mockLookupGiftCard(...args),
}));

const CONSULTANT_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_CLIENT_ID = "33333333-3333-3333-3333-333333333333";

const buildSupabase = (tables: Record<string, unknown[]>) => {
  const from = (name: string) => {
    const rows = tables[name] ?? [];
    const query = {
      select: () => query,
      eq: () => query,
      not: () => query,
      in: () => query,
      limit: () => Promise.resolve({ data: rows }),
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null }),
      single: () => Promise.resolve({ data: rows[0] ?? null }),
      update: () => query,
    };
    return query;
  };
  return {
    from,
    rpc: vi.fn().mockResolvedValue({
      data: {
        id: "invoice-1",
        number: "2026-08-0001",
        client_email: "marie@example.com",
        client_name: "Marie Dupont",
      },
      error: null,
    }),
  };
};

describe("createManualInvoice", () => {
  beforeEach(() => {
    mockGetSupabaseAndUser.mockReset();
    mockRedeem.mockClear();
    mockLookupGiftCard.mockClear();
    mockLookupGiftCard.mockImplementation(async () => ({
      ok: true,
      giftCardId: "gc-1",
      type: "amount" as const,
      balanceCents: 5000,
      consultationTypeId: null,
      expiresAt: "2099-01-01T00:00:00.000Z",
    }));
  });

  const buildFullSupabase = () =>
    buildSupabase({
      bookings: [{ id: "b1" }],
      accompagnements: [],
      profiles: [
        { first_name: "Marie", last_name: "Dupont", email: "marie@example.com" },
      ],
      consultants: [
        {
          billing_legal_name: "Marie Dupont",
          billing_address: "1 rue de la Paix",
          billing_siren: "123456789",
          billing_vat_number: null,
          billing_legal_form: "EI",
          billing_iban: "FR7630001007941234567890185",
          billing_bic: "BDFEFRPP",
        },
      ],
    });

  it("redeems the gift card against the invoice when giftCardCode is provided", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildFullSupabase(),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: CLIENT_ID,
      description: "Consultation",
      ttcCents: 5000,
      giftCardCode: "CADEAU-ABC234",
    });

    expect(result.success).toBe(true);
    expect(mockRedeem).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        code: "CADEAU-ABC234",
        amountCents: 5000,
        invoiceId: expect.any(String),
      }),
    );
  });

  it("still returns the created invoice when giftCardCode is omitted", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildFullSupabase(),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: CLIENT_ID,
      description: "Consultation",
      ttcCents: 5000,
    });

    expect(result.success).toBe(true);
    expect(mockRedeem).not.toHaveBeenCalled();
    expect(mockLookupGiftCard).not.toHaveBeenCalled();
  });

  it("cappe le montant redime au solde de la carte quand il est inferieur au total facture", async () => {
    mockLookupGiftCard.mockImplementation(async () => ({
      ok: true,
      giftCardId: "gc-1",
      type: "amount" as const,
      balanceCents: 3000,
      consultationTypeId: null,
      expiresAt: "2099-01-01T00:00:00.000Z",
    }));
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildFullSupabase(),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: CLIENT_ID,
      description: "Consultation",
      ttcCents: 9000,
      giftCardCode: "CADEAU-ABC234",
    });

    expect(result.success).toBe(true);
    expect(mockRedeem).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        code: "CADEAU-ABC234",
        amountCents: 3000,
        invoiceId: expect.any(String),
      }),
    );
  });

  it("redime le total facture quand le solde de la carte le couvre entierement", async () => {
    mockLookupGiftCard.mockImplementation(async () => ({
      ok: true,
      giftCardId: "gc-1",
      type: "amount" as const,
      balanceCents: 12000,
      consultationTypeId: null,
      expiresAt: "2099-01-01T00:00:00.000Z",
    }));
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildFullSupabase(),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: CLIENT_ID,
      description: "Consultation",
      ttcCents: 9000,
      giftCardCode: "CADEAU-ABC234",
    });

    expect(result.success).toBe(true);
    expect(mockRedeem).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        code: "CADEAU-ABC234",
        amountCents: 9000,
        invoiceId: expect.any(String),
      }),
    );
  });

  it("n'appelle pas redeemGiftCard quand la carte n'est pas trouvable", async () => {
    mockLookupGiftCard.mockImplementation(async () => ({
      ok: false,
      error: "not_found" as const,
    }));
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildFullSupabase(),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: CLIENT_ID,
      description: "Consultation",
      ttcCents: 5000,
      giftCardCode: "INCONNUE",
    });

    expect(result.success).toBe(true);
    expect(mockRedeem).not.toHaveBeenCalled();
  });

  it("refuse un client sans relation avec la consultante", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildSupabase({ bookings: [], accompagnements: [] }),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: OTHER_CLIENT_ID,
      description: "Pack de consultations",
      ttcCents: 24000,
    });

    expect(result.success).toBe(false);
  });

  it("emet la facture pour un client ayant une relation existante", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildSupabase({
        bookings: [{ id: "b1" }],
        accompagnements: [],
        profiles: [
          { first_name: "Marie", last_name: "Dupont", email: "marie@example.com" },
        ],
        consultants: [
          {
            billing_legal_name: "Marie Dupont",
            billing_address: "1 rue de la Paix",
            billing_siren: "123456789",
            billing_vat_number: null,
            billing_legal_form: "EI",
            billing_iban: "FR7630001007941234567890185",
            billing_bic: "BDFEFRPP",
          },
        ],
      }),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: CLIENT_ID,
      description: "Pack de consultations",
      ttcCents: 24000,
    });

    expect(result.success).toBe(true);
  });

  it("refuse une designation vide avant tout appel base", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: buildSupabase({ bookings: [{ id: "b1" }], accompagnements: [] }),
      user: { id: CONSULTANT_ID },
    });

    const result = await createManualInvoice({
      clientId: CLIENT_ID,
      description: "   ",
      ttcCents: 24000,
    });

    expect(result.success).toBe(false);
  });
});

describe("recordSettlement", () => {
  beforeEach(() => {
    mockGetSupabaseAndUser.mockReset();
  });

  it("refuse une facture d'un autre consultant", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: {
        from: (name: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
            }),
          }),
        }),
      },
      user: { id: CONSULTANT_ID },
    });

    const result = await recordSettlement({
      invoiceId: "invoice-1",
      method: "transfer",
      amountCents: 5000,
      paidAt: "2026-08-05T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("refuse un montant superieur au solde restant", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: {
        from: (name: string) => {
          if (name === "invoices") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: { id: "invoice-1", amount_ttc_cents: 10000 },
                      }),
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ amount_cents: 8000 }] }),
            }),
          };
        },
      },
      user: { id: CONSULTANT_ID },
    });

    const result = await recordSettlement({
      invoiceId: "invoice-1",
      method: "transfer",
      amountCents: 5000,
      paidAt: "2026-08-05T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("enregistre un reglement dans la limite du solde", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: {
        from: (name: string) => {
          if (name === "invoices") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: { id: "invoice-1", amount_ttc_cents: 10000 },
                      }),
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ amount_cents: 3000 }] }),
            }),
            insert,
          };
        },
      },
      user: { id: CONSULTANT_ID },
    });

    const result = await recordSettlement({
      invoiceId: "invoice-1",
      method: "transfer",
      amountCents: 5000,
      paidAt: "2026-08-05T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_id: "invoice-1", amount_cents: 5000 }),
    );
  });
});

describe("exportInvoicesCsv", () => {
  beforeEach(() => {
    mockGetSupabaseAndUser.mockReset();
  });

  it("ne renvoie que les factures de la consultante appelante, filtrees", async () => {
    const eq = vi.fn().mockReturnThis();
    const gte = vi.fn().mockReturnThis();
    const lte = vi.fn().mockReturnThis();
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "invoice-1",
          number: "2026-08-0001",
          issued_at: "2026-08-01T00:00:00.000Z",
          document_type: "invoice",
          status: "issued",
          payment_status: "paid",
          client_name: "Marie Dupont",
          amount_ht_cents: 10000,
          amount_vat_cents: 2000,
          amount_ttc_cents: 12000,
          currency: "eur",
        },
      ],
    });
    const select = vi.fn().mockReturnValue({ eq, gte, lte, order });

    mockGetSupabaseAndUser.mockResolvedValue({
      supabase: {
        from: (name: string) => {
          if (name === "invoice_settlements") {
            return { select: () => ({ in: () => Promise.resolve({ data: [] }) }) };
          }
          return { select };
        },
      },
      user: { id: CONSULTANT_ID },
    });

    const result = await exportInvoicesCsv({});

    expect(result.success).toBe(true);
    expect(result.data).toContain("2026-08-0001");
    expect(eq).toHaveBeenCalledWith("consultant_id", CONSULTANT_ID);
  });
});

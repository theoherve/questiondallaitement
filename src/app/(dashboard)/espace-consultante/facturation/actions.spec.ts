import { describe, it, expect, vi, beforeEach } from "vitest";
import { createManualInvoice, recordSettlement } from "./actions";

const mockGetSupabaseAndUser = vi.fn();
vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: () => mockGetSupabaseAndUser(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/invoicing/send-invoice-email", () => ({
  sendInvoiceEmail: vi.fn().mockResolvedValue(undefined),
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

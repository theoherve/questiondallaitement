import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSupabaseAndUser, insertCalls } = vi.hoisted(() => ({
  mockGetSupabaseAndUser: vi.fn(),
  insertCalls: [] as { table: string; data: unknown }[],
}));

vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: mockGetSupabaseAndUser,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: (data: unknown) => {
        insertCalls.push({ table, data });
        return {
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "child-1" }, error: null }),
          }),
        };
      },
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  }),
}));

import { createChild } from "./actions";

describe("createChild", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
  });

  it("refuse la création si le client n'a pas de consentement RGPD", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1", gdpr_consent_at: null },
      supabase: {},
    });

    const result = await createChild({
      first_name: "Léa",
      birth_date: "2025-01-10",
      sex: "female",
      is_premature: false,
    });

    expect(result.success).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });

  it("crée l'enfant rattaché au client quand le consentement existe", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1", gdpr_consent_at: "2025-01-01T00:00:00.000Z" },
      supabase: {},
    });

    const result = await createChild({
      first_name: "Léa",
      birth_date: "2025-01-10",
      sex: "female",
      is_premature: false,
    });

    expect(result.success).toBe(true);
    expect(insertCalls.at(-1)).toMatchObject({
      table: "children",
      data: { client_id: "client-1", first_name: "Léa" },
    });
  });

  it("rejette une entrée invalide avant tout accès base", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1", gdpr_consent_at: "2025-01-01T00:00:00.000Z" },
      supabase: {},
    });

    const result = await createChild({
      first_name: "",
      birth_date: "2025-01-10",
      sex: "female",
      is_premature: false,
    });

    expect(result.success).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });
});

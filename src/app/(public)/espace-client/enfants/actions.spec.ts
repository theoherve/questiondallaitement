import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSupabaseAndUser, insertCalls, deleteCalls, responses } =
  vi.hoisted(() => ({
    mockGetSupabaseAndUser: vi.fn(),
    insertCalls: [] as { table: string; data: unknown }[],
    deleteCalls: [] as { table: string }[],
    responses: {
      profileSingle: {
        data: { gdpr_consent_at: "2025-01-01T00:00:00.000Z" },
        error: null,
      } as { data: { gdpr_consent_at: string | null } | null; error: unknown },
      childrenInsertSingle: {
        data: { id: "child-1" },
        error: null,
      } as { data: { id: string } | null; error: unknown },
      childrenDeleteSelect: {
        data: [{ id: "child-1" }],
        error: null,
      } as { data: { id: string }[] | null; error: unknown },
      weightMeasurementSingle: {
        data: null,
        error: null,
      } as {
        data: {
          id: string;
          child_id: string;
          recorded_by: string;
          created_at: string;
        } | null;
        error: unknown;
      },
      weightDelete: { error: null } as { error: unknown },
    },
  }));

vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: mockGetSupabaseAndUser,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(responses.profileSingle),
            }),
          }),
        };
      }
      if (table === "children") {
        return {
          insert: (data: unknown) => {
            insertCalls.push({ table, data });
            return {
              select: () => ({
                single: () => Promise.resolve(responses.childrenInsertSingle),
              }),
            };
          },
          delete: () => {
            deleteCalls.push({ table });
            return {
              eq: () => ({
                eq: () => ({
                  select: () => Promise.resolve(responses.childrenDeleteSelect),
                }),
              }),
            };
          },
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "weight_measurements") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(responses.weightMeasurementSingle),
            }),
          }),
          delete: () => {
            deleteCalls.push({ table });
            return {
              eq: () => Promise.resolve(responses.weightDelete),
            };
          },
        };
      }
      throw new Error(`Unhandled table in mock: ${table}`);
    },
  }),
}));

import { createChild, deleteChild, deleteWeightMeasurement } from "./actions";

describe("createChild", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    deleteCalls.length = 0;
    responses.profileSingle = {
      data: { gdpr_consent_at: "2025-01-01T00:00:00.000Z" },
      error: null,
    };
    responses.childrenInsertSingle = { data: { id: "child-1" }, error: null };
  });

  it("refuse la création si le client n'a pas de consentement RGPD", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });
    responses.profileSingle = { data: { gdpr_consent_at: null }, error: null };

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
      user: { id: "client-1" },
      supabase: {},
    });
    responses.profileSingle = {
      data: { gdpr_consent_at: "2025-01-01T00:00:00.000Z" },
      error: null,
    };

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
      user: { id: "client-1" },
      supabase: {},
    });
    responses.profileSingle = {
      data: { gdpr_consent_at: "2025-01-01T00:00:00.000Z" },
      error: null,
    };

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

describe("deleteChild", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    deleteCalls.length = 0;
    responses.childrenDeleteSelect = { data: [{ id: "child-1" }], error: null };
  });

  it("supprime un enfant qui appartient au client", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });
    responses.childrenDeleteSelect = { data: [{ id: "child-1" }], error: null };

    const result = await deleteChild("child-1");

    expect(result.success).toBe(true);
    expect(deleteCalls).toHaveLength(1);
  });

  it("renvoie une erreur (pas un faux succès) si l'enfant n'appartient pas au client", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });
    // .eq("client_id", user.id) ne matche aucune ligne : aucune ligne supprimée
    responses.childrenDeleteSelect = { data: [], error: null };

    const result = await deleteChild("someone-elses-child");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Enfant introuvable");
  });
});

describe("deleteWeightMeasurement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    deleteCalls.length = 0;
    responses.weightMeasurementSingle = { data: null, error: null };
    responses.weightDelete = { error: null };
  });

  it("supprime une pesée dans la fenêtre de 24h", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });
    responses.weightMeasurementSingle = {
      data: {
        id: "m1",
        child_id: "child-1",
        recorded_by: "client-1",
        created_at: new Date().toISOString(),
      },
      error: null,
    };

    const result = await deleteWeightMeasurement("m1");

    expect(result.success).toBe(true);
    expect(deleteCalls).toHaveLength(1);
  });

  it("rejette si la pesée n'a pas été enregistrée par l'appelant", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });
    responses.weightMeasurementSingle = {
      data: {
        id: "m1",
        child_id: "child-1",
        recorded_by: "other-user",
        created_at: new Date().toISOString(),
      },
      error: null,
    };

    const result = await deleteWeightMeasurement("m1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Pesée introuvable");
    expect(deleteCalls).toHaveLength(0);
  });

  it("rejette une suppression au-delà de la fenêtre de 24h", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    responses.weightMeasurementSingle = {
      data: {
        id: "m1",
        child_id: "child-1",
        recorded_by: "client-1",
        created_at: twoDaysAgo,
      },
      error: null,
    };

    const result = await deleteWeightMeasurement("m1");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/24h/);
    expect(deleteCalls).toHaveLength(0);
  });
});

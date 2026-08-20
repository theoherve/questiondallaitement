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
      childOwnershipSingle: {
        data: {
          id: "child-1",
          client_id: "client-1",
          birth_date: "2025-01-10",
          sex: "female",
          is_premature: false,
          gestational_age_weeks: null,
          birth_weight_grams: 3200,
          first_name: "Léa",
        },
        error: null,
      } as {
        data: {
          id: string;
          client_id?: string;
          birth_date: string;
          sex?: string;
          is_premature?: boolean;
          gestational_age_weeks?: number | null;
          birth_weight_grams?: number | null;
          first_name?: string;
        } | null;
        error: unknown;
      },
      weightInsertSingle: {
        data: { id: "measure-1" },
        error: null,
      } as { data: { id: string } | null; error: unknown },
    },
  }));

vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: mockGetSupabaseAndUser,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/growth-charts/weight-alerts-notify", () => ({
  notifyWeightAlerts: vi.fn().mockResolvedValue([]),
}));
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
              // Chaîne de vérification de propriété :
              // .eq("id", …).eq("client_id", …).single()
              eq: () => ({
                single: () => Promise.resolve(responses.childOwnershipSingle),
              }),
            }),
          }),
        };
      }
      if (table === "weight_measurements") {
        return {
          insert: (data: unknown) => {
            insertCalls.push({ table, data });
            return {
              select: () => ({
                single: () => Promise.resolve(responses.weightInsertSingle),
              }),
            };
          },
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

import {
  createChild,
  deleteChild,
  addWeightMeasurement,
  deleteWeightMeasurement,
} from "./actions";

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

describe("addWeightMeasurement", () => {
  const validInput = {
    child_id: "550e8400-e29b-41d4-a716-446655440000",
    weight_grams: 4200,
    measured_at: "2025-02-01",
    source: "home",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    deleteCalls.length = 0;
    responses.childOwnershipSingle = {
      data: {
        id: "child-1",
        client_id: "client-1",
        birth_date: "2025-01-10",
        sex: "female",
        is_premature: false,
        gestational_age_weeks: null,
        birth_weight_grams: 3200,
        first_name: "Léa",
      },
      error: null,
    };
    responses.weightInsertSingle = { data: { id: "measure-1" }, error: null };
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });
  });

  it("enregistre la pesée à domicile de l'enfant du client", async () => {
    const result = await addWeightMeasurement(validInput);

    expect(result.success).toBe(true);
    expect(insertCalls.at(-1)).toMatchObject({
      table: "weight_measurements",
      data: { source: "home", recorded_by: "client-1" },
    });
  });

  it("appelle notifyWeightAlerts avec l'enfant complet et l'historique de pesées après insertion", async () => {
    const { notifyWeightAlerts } = await import(
      "@/lib/growth-charts/weight-alerts-notify"
    );

    await addWeightMeasurement(validInput);

    expect(notifyWeightAlerts).toHaveBeenCalled();
    const [childArg] = vi.mocked(notifyWeightAlerts).mock.calls[0];
    expect(childArg).toMatchObject({ id: "child-1" });
  });

  it("refuse une pesée antérieure à la date de naissance de l'enfant", async () => {
    responses.childOwnershipSingle = {
      data: { id: "child-1", birth_date: "2025-03-01" },
      error: null,
    };

    const result = await addWeightMeasurement(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/naissance/);
    expect(insertCalls).toHaveLength(0);
  });

  it("refuse une pesée datée dans le futur", async () => {
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const result = await addWeightMeasurement({
      ...validInput,
      measured_at: inTwoDays,
    });

    expect(result.success).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });
});

describe("deleteWeightMeasurement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    deleteCalls.length = 0;
    responses.weightMeasurementSingle = { data: null, error: null };
    responses.weightDelete = { error: null };
    responses.childOwnershipSingle = {
      data: { id: "child-1", birth_date: "2025-01-10" },
      error: null,
    };
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

  it("rejette si la pesée a été enregistrée par la consultante", async () => {
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
    expect(result.error).toBe(
      "Cette pesée a été saisie par votre consultante, vous ne pouvez pas la supprimer.",
    );
    expect(deleteCalls).toHaveLength(0);
  });

  it("répond « introuvable » pour une pesée qui existe mais appartient à une autre famille", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });
    responses.weightMeasurementSingle = {
      data: {
        id: "m1",
        child_id: "child-other",
        recorded_by: "other-consultant",
        created_at: new Date().toISOString(),
      },
      error: null,
    };
    // L'enfant n'appartient pas à cet utilisateur : la vérification de
    // propriété ne remonte rien.
    responses.childOwnershipSingle = { data: null, error: null };

    const result = await deleteWeightMeasurement("m1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Pesée introuvable");
    expect(deleteCalls).toHaveLength(0);
  });

  it("rejette une pesée réellement introuvable", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: {},
    });
    responses.weightMeasurementSingle = { data: null, error: null };

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

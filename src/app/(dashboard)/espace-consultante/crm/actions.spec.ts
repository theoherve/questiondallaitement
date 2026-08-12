import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSessionUser, insertCalls } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  insertCalls: [] as { table: string; data: unknown }[],
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

const {
  mockBookingsData,
  mockAccompagnementsData,
  mockEnrollmentsData,
  mockChildrenData,
  mockChildSingleData,
  mockMeasurementSingleData,
  mockMeasurementsData,
  mockDeleteResult,
  deleteCalls,
  bookingsNotCalls,
} = vi.hoisted(() => ({
  mockBookingsData: { data: [] as unknown[] },
  mockAccompagnementsData: { data: [] as { id: string }[] },
  mockEnrollmentsData: { data: [] as unknown[] },
  mockChildrenData: { data: [] as unknown[] },
  mockChildSingleData: {
    data: null as { id: string; client_id: string; birth_date?: string } | null,
  },
  mockMeasurementSingleData: {
    data: null as
      | { id: string; child_id: string; created_at?: string }
      | null,
  },
  mockMeasurementsData: { data: [] as unknown[] },
  mockDeleteResult: { error: null as unknown },
  deleteCalls: [] as { table: string }[],
  bookingsNotCalls: [] as { column: string; operator: string; value: unknown }[],
}));

/** Objet à la fois attendable (await) et chaînable, comme un query builder. */
const thenableWith = <T>(value: T, extra: Record<string, unknown>) => ({
  ...extra,
  then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                not: (column: string, operator: string, value: unknown) => {
                  bookingsNotCalls.push({ column, operator, value });
                  return { limit: () => Promise.resolve(mockBookingsData) };
                },
              }),
            }),
          }),
        };
      }
      if (table === "accompagnements") {
        return {
          select: () => ({
            eq: () => Promise.resolve(mockAccompagnementsData),
          }),
        };
      }
      if (table === "accompagnement_enrollments") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => Promise.resolve(mockEnrollmentsData),
              }),
            }),
          }),
        };
      }
      if (table === "children") {
        return {
          select: () => ({
            eq: () =>
              thenableWith(mockChildrenData, {
                order: () => Promise.resolve(mockChildrenData),
                single: () => Promise.resolve(mockChildSingleData),
              }),
          }),
          delete: () => {
            deleteCalls.push({ table });
            return { eq: () => Promise.resolve(mockDeleteResult) };
          },
        };
      }
      if (table === "weight_measurements") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(mockMeasurementSingleData),
            }),
            in: () => ({
              order: () => Promise.resolve(mockMeasurementsData),
            }),
          }),
          insert: (data: unknown) => {
            insertCalls.push({ table, data });
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: "measurement-1" },
                    error: null,
                  }),
              }),
            };
          },
          delete: () => {
            deleteCalls.push({ table });
            return { eq: () => Promise.resolve(mockDeleteResult) };
          },
        };
      }
      return {
        insert: (data: unknown) => {
          insertCalls.push({ table, data });
          return {
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: "tag-1" }, error: null }),
            }),
          };
        },
      };
    },
  }),
}));

import {
  createTag,
  getChildrenForContact,
  getWeightMeasurementsForContact,
  addWeightMeasurementAsConsultant,
  deleteChildAsConsultant,
  deleteWeightMeasurementAsConsultant,
} from "./actions";

/** Remet à zéro l'ensemble des réponses simulées entre deux tests. */
const resetMocks = () => {
  vi.clearAllMocks();
  insertCalls.length = 0;
  deleteCalls.length = 0;
  bookingsNotCalls.length = 0;
  mockBookingsData.data = [];
  mockAccompagnementsData.data = [];
  mockEnrollmentsData.data = [];
  mockChildrenData.data = [];
  mockChildSingleData.data = null;
  mockMeasurementSingleData.data = null;
  mockMeasurementsData.data = [];
  mockDeleteResult.error = null;
};

const asConsultant = () =>
  mockGetSessionUser.mockResolvedValue({
    id: "consultant-1",
    email: "c@b.fr",
    roles: ["consultant"],
  });

describe("createTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
  });

  it("rattache par défaut le libellé à la consultante", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "consultant-1",
      email: "c@b.fr",
      roles: ["consultant"],
    });

    const result = await createTag({ name: "Suivi renforcé" });

    expect(result.success).toBe(true);
    expect(insertCalls.at(-1)).toMatchObject({
      table: "crm_tags",
      data: { name: "Suivi renforcé", consultant_id: "consultant-1" },
    });
  });

  it("crée un libellé global sans consultante rattachée", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "admin-1",
      email: "a@b.fr",
      roles: ["admin"],
    });

    const result = await createTag(
      { name: "Vient d'Instagram", color: "#2F5D50" },
      "global"
    );

    expect(result.success).toBe(true);
    expect(insertCalls.at(-1)).toMatchObject({
      table: "crm_tags",
      data: { name: "Vient d'Instagram", consultant_id: null },
    });
  });

  it("refuse un libellé global à une consultante non administratrice", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "consultant-1",
      email: "c@b.fr",
      roles: ["consultant"],
    });

    const result = await createTag({ name: "Test" }, "global");

    expect(result.success).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });
});

describe("getChildrenForContact", () => {
  beforeEach(resetMocks);

  it("retourne un tableau vide si le consultant n'a aucune relation avec ce client", async () => {
    asConsultant();

    const result = await getChildrenForContact("client-1");

    expect(result).toEqual([]);
  });

  it("retourne les enfants du client quand une relation de rendez-vous existe", async () => {
    asConsultant();
    mockBookingsData.data = [{ id: "booking-1" }];
    mockChildrenData.data = [{ id: "child-1", first_name: "Léa" }];

    const result = await getChildrenForContact("client-1");

    expect(result).toEqual([{ id: "child-1", first_name: "Léa" }]);
  });

  it("accepte aussi une relation via une inscription à un accompagnement", async () => {
    asConsultant();
    mockBookingsData.data = [];
    mockAccompagnementsData.data = [{ id: "accompagnement-1" }];
    mockEnrollmentsData.data = [{ client_id: "client-1" }];
    mockChildrenData.data = [{ id: "child-1", first_name: "Léa" }];

    const result = await getChildrenForContact("client-1");

    expect(result).toEqual([{ id: "child-1", first_name: "Léa" }]);
  });
});

describe("getWeightMeasurementsForContact", () => {
  beforeEach(resetMocks);

  it("ne renvoie rien sans relation avec le client", async () => {
    asConsultant();
    mockChildrenData.data = [{ id: "child-1" }];
    mockMeasurementsData.data = [{ id: "m1", child_id: "child-1" }];

    const result = await getWeightMeasurementsForContact("client-1");

    expect(result).toEqual({});
  });

  it("regroupe les pesées par enfant quand la relation existe", async () => {
    asConsultant();
    mockBookingsData.data = [{ id: "booking-1" }];
    mockChildrenData.data = [{ id: "child-1" }, { id: "child-2" }];
    mockMeasurementsData.data = [
      { id: "m1", child_id: "child-1" },
      { id: "m2", child_id: "child-1" },
    ];

    const result = await getWeightMeasurementsForContact("client-1");

    expect(result).toEqual({
      "child-1": [
        { id: "m1", child_id: "child-1" },
        { id: "m2", child_id: "child-1" },
      ],
      "child-2": [],
    });
  });
});

describe("addWeightMeasurementAsConsultant", () => {
  const validInput = {
    child_id: "123e4567-e89b-12d3-a456-426614174000",
    weight_grams: 3500,
    measured_at: "2026-08-01",
    source: "home",
  };

  beforeEach(() => {
    resetMocks();
    asConsultant();
  });

  it("refuse si l'enfant n'existe pas", async () => {
    mockChildSingleData.data = null;

    const result = await addWeightMeasurementAsConsultant(validInput);

    expect(result).toEqual({ success: false, error: "Enfant introuvable" });
    expect(insertCalls).toHaveLength(0);
  });

  it("refuse si aucune relation n'existe avec le client de l'enfant", async () => {
    mockChildSingleData.data = {
      id: validInput.child_id,
      client_id: "client-9",
      birth_date: "2025-01-01",
    };
    mockBookingsData.data = [];

    const result = await addWeightMeasurementAsConsultant(validInput);

    expect(result).toEqual({
      success: false,
      error: "Aucune relation avec ce client",
    });
    expect(insertCalls).toHaveLength(0);
  });

  it("demande à Supabase d'exclure les rendez-vous annulés", async () => {
    mockChildSingleData.data = {
      id: validInput.child_id,
      client_id: "client-9",
      birth_date: "2025-01-01",
    };
    mockBookingsData.data = [];
    mockAccompagnementsData.data = [];

    await addWeightMeasurementAsConsultant(validInput);

    expect(bookingsNotCalls).toContainEqual({
      column: "status",
      operator: "eq",
      value: "cancelled",
    });
  });

  it("refuse une pesée antérieure à la date de naissance", async () => {
    mockChildSingleData.data = {
      id: validInput.child_id,
      client_id: "client-9",
      birth_date: "2026-08-05",
    };
    mockBookingsData.data = [{ id: "booking-1" }];

    const result = await addWeightMeasurementAsConsultant(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/naissance/);
    expect(insertCalls).toHaveLength(0);
  });

  it("ajoute la pesée avec la source, le recorded_by et le consultant_id corrects", async () => {
    mockChildSingleData.data = {
      id: validInput.child_id,
      client_id: "client-9",
      birth_date: "2025-01-01",
    };
    mockBookingsData.data = [{ id: "booking-1" }];

    const result = await addWeightMeasurementAsConsultant(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeTruthy();
    }
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      table: "weight_measurements",
      data: {
        child_id: validInput.child_id,
        source: "consultation",
        recorded_by: "consultant-1",
        consultant_id: "consultant-1",
      },
    });
  });
});

describe("deleteChildAsConsultant", () => {
  beforeEach(() => {
    resetMocks();
    asConsultant();
  });

  it("refuse si l'enfant n'existe pas", async () => {
    mockChildSingleData.data = null;

    const result = await deleteChildAsConsultant("child-1");

    expect(result).toEqual({ success: false, error: "Enfant introuvable" });
    expect(deleteCalls).toHaveLength(0);
  });

  it("refuse si aucune relation n'existe avec le client de l'enfant", async () => {
    mockChildSingleData.data = { id: "child-1", client_id: "client-9" };
    mockBookingsData.data = [];

    const result = await deleteChildAsConsultant("child-1");

    expect(result).toEqual({
      success: false,
      error: "Aucune relation avec ce client",
    });
    expect(deleteCalls).toHaveLength(0);
  });

  it("supprime l'enfant quand la relation existe", async () => {
    mockChildSingleData.data = { id: "child-1", client_id: "client-9" };
    mockBookingsData.data = [{ id: "booking-1" }];

    const result = await deleteChildAsConsultant("child-1");

    expect(result.success).toBe(true);
    expect(deleteCalls).toEqual([{ table: "children" }]);
  });
});

describe("deleteWeightMeasurementAsConsultant", () => {
  beforeEach(() => {
    resetMocks();
    asConsultant();
  });

  it("refuse si la pesée n'existe pas", async () => {
    mockMeasurementSingleData.data = null;

    const result = await deleteWeightMeasurementAsConsultant("m1");

    expect(result).toEqual({ success: false, error: "Pesée introuvable" });
    expect(deleteCalls).toHaveLength(0);
  });

  it("refuse si aucune relation n'existe avec le client de l'enfant", async () => {
    mockMeasurementSingleData.data = { id: "m1", child_id: "child-1" };
    mockChildSingleData.data = { id: "child-1", client_id: "client-9" };
    mockBookingsData.data = [];

    const result = await deleteWeightMeasurementAsConsultant("m1");

    expect(result).toEqual({
      success: false,
      error: "Aucune relation avec ce client",
    });
    expect(deleteCalls).toHaveLength(0);
  });

  it("supprime la pesée quand la relation existe, sans fenêtre de 24h", async () => {
    mockMeasurementSingleData.data = { id: "m1", child_id: "child-1" };
    mockChildSingleData.data = { id: "child-1", client_id: "client-9" };
    mockBookingsData.data = [{ id: "booking-1" }];

    const result = await deleteWeightMeasurementAsConsultant("m1");

    expect(result.success).toBe(true);
    expect(deleteCalls).toEqual([{ table: "weight_measurements" }]);
  });
});

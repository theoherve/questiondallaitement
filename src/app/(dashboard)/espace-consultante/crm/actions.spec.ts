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

const { mockBookingsData, mockChildrenData, mockChildSingleData } =
  vi.hoisted(() => ({
    mockBookingsData: { data: [] as unknown[] },
    mockChildrenData: { data: [] as unknown[] },
    mockChildSingleData: {
      data: null as { id: string; client_id: string } | null,
    },
  }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => Promise.resolve(mockBookingsData),
              }),
            }),
          }),
        };
      }
      if (table === "children") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(mockChildrenData),
              single: () => Promise.resolve(mockChildSingleData),
            }),
          }),
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
  addWeightMeasurementAsConsultant,
} from "./actions";

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookingsData.data = [];
    mockChildrenData.data = [];
  });

  it("retourne un tableau vide si le consultant n'a aucun rendez-vous avec ce client", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "consultant-1",
      email: "c@b.fr",
      roles: ["consultant"],
    });
    mockBookingsData.data = [];

    const result = await getChildrenForContact("client-1");

    expect(result).toEqual([]);
  });

  it("retourne les enfants du client quand une relation de rendez-vous existe", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "consultant-1",
      email: "c@b.fr",
      roles: ["consultant"],
    });
    mockBookingsData.data = [{ id: "booking-1" }];
    mockChildrenData.data = [{ id: "child-1", first_name: "Léa" }];

    const result = await getChildrenForContact("client-1");

    expect(result).toEqual([{ id: "child-1", first_name: "Léa" }]);
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
    vi.clearAllMocks();
    insertCalls.length = 0;
    mockBookingsData.data = [];
    mockChildrenData.data = [];
    mockChildSingleData.data = null;
    mockGetSessionUser.mockResolvedValue({
      id: "consultant-1",
      email: "c@b.fr",
      roles: ["consultant"],
    });
  });

  it("refuse si l'enfant n'existe pas", async () => {
    mockChildSingleData.data = null;

    const result = await addWeightMeasurementAsConsultant(validInput);

    expect(result).toEqual({ success: false, error: "Enfant introuvable" });
    expect(insertCalls).toHaveLength(0);
  });

  it("refuse si aucune relation de rendez-vous n'existe avec le client de l'enfant", async () => {
    mockChildSingleData.data = {
      id: validInput.child_id,
      client_id: "client-9",
    };
    mockBookingsData.data = [];

    const result = await addWeightMeasurementAsConsultant(validInput);

    expect(result).toEqual({
      success: false,
      error: "Aucune relation avec ce client",
    });
    expect(insertCalls).toHaveLength(0);
  });

  it("ajoute la pesée avec la source, le recorded_by et le consultant_id corrects", async () => {
    mockChildSingleData.data = {
      id: validInput.child_id,
      client_id: "client-9",
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

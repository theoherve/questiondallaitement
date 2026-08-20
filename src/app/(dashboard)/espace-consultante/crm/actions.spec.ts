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
vi.mock("@/lib/growth-charts/weight-alerts-notify", () => ({
  notifyWeightAlerts: vi.fn().mockResolvedValue([]),
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
  mockBookingSingleData,
  mockConsultationNoteSingleData,
  mockConsultationNotesListData,
  upsertCalls,
  updateCalls,
  mockChildOwnershipSingleData,
  childrenEqCalls,
  consultationNotesEqCalls,
  mockNoteOwnershipSingleData,
  mockNoteHistoryListData,
  noteOwnershipEqCalls,
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
  mockBookingSingleData: {
    data: null as { id: string; client_id: string; consultant_id: string } | null,
  },
  mockConsultationNoteSingleData: {
    data: null as Record<string, unknown> | null,
  },
  mockConsultationNotesListData: { data: [] as unknown[] },
  upsertCalls: [] as { table: string; data: unknown; onConflict?: string }[],
  updateCalls: [] as { table: string; data: unknown }[],
  // Résultat du second `.eq()` (ownership de l'enfant) dans upsertConsultationNote.
  mockChildOwnershipSingleData: { data: null as { id: string } | null },
  childrenEqCalls: [] as { column: string; value: unknown }[],
  consultationNotesEqCalls: [] as { column: string; value: unknown }[],
  // getNoteHistory : résultat du .single() de vérification de propriété de la note.
  mockNoteOwnershipSingleData: { data: null as { id: string } | null },
  mockNoteHistoryListData: { data: [] as unknown[] },
  noteOwnershipEqCalls: [] as { column: string; value: unknown }[],
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
            eq: () =>
              thenableWith(mockBookingsData, {
                eq: () => ({
                  not: (column: string, operator: string, value: unknown) => {
                    bookingsNotCalls.push({ column, operator, value });
                    return { limit: () => Promise.resolve(mockBookingsData) };
                  },
                }),
                single: () => Promise.resolve(mockBookingSingleData),
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
            eq: (column: string, value: unknown) => {
              childrenEqCalls.push({ column, value });
              return thenableWith(mockChildrenData, {
                order: () => Promise.resolve(mockChildrenData),
                single: () => Promise.resolve(mockChildSingleData),
                eq: (column2: string, value2: unknown) => {
                  childrenEqCalls.push({ column: column2, value: value2 });
                  return {
                    single: () => Promise.resolve(mockChildOwnershipSingleData),
                  };
                },
              });
            },
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
      if (table === "consultation_notes") {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => {
              consultationNotesEqCalls.push({ column, value });
              return thenableWith(mockConsultationNotesListData, {
                single: () => Promise.resolve(mockConsultationNoteSingleData),
                order: () => Promise.resolve(mockConsultationNotesListData),
              });
            },
          }),
          upsert: (data: unknown, options?: { onConflict?: string }) => {
            upsertCalls.push({ table, data, onConflict: options?.onConflict });
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "note-1" }, error: null }),
              }),
            };
          },
          update: (data: unknown) => {
            updateCalls.push({ table, data });
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === "crm_notes") {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => {
              noteOwnershipEqCalls.push({ column, value });
              return {
                eq: (column2: string, value2: unknown) => {
                  noteOwnershipEqCalls.push({ column: column2, value: value2 });
                  return {
                    single: () => Promise.resolve(mockNoteOwnershipSingleData),
                  };
                },
              };
            },
          }),
          insert: (data: unknown) => {
            insertCalls.push({ table, data });
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "note-1" }, error: null }),
              }),
            };
          },
          update: (data: unknown) => {
            updateCalls.push({ table, data });
            return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
          },
        };
      }
      if (table === "crm_notes_history") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(mockNoteHistoryListData),
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
  getFamilyDossierForContact,
  addWeightMeasurementAsConsultant,
  deleteChildAsConsultant,
  deleteWeightMeasurementAsConsultant,
  getConsultationNoteForBooking,
  upsertConsultationNote,
  publishConsultationNote,
  unpublishConsultationNote,
  getConsultationNotesForFamilyDossier,
  getNoteHistory,
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
  mockBookingSingleData.data = null;
  mockConsultationNoteSingleData.data = null;
  mockConsultationNotesListData.data = [];
  upsertCalls.length = 0;
  updateCalls.length = 0;
  mockChildOwnershipSingleData.data = null;
  childrenEqCalls.length = 0;
  consultationNotesEqCalls.length = 0;
  mockNoteOwnershipSingleData.data = null;
  mockNoteHistoryListData.data = [];
  noteOwnershipEqCalls.length = 0;
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

describe("getFamilyDossierForContact", () => {
  beforeEach(resetMocks);

  it("ne renvoie rien si le consultant n'a aucune relation avec ce client", async () => {
    asConsultant();
    mockChildrenData.data = [{ id: "child-1", first_name: "Léa" }];
    mockMeasurementsData.data = [{ id: "m1", child_id: "child-1" }];

    const result = await getFamilyDossierForContact("client-1");

    expect(result).toEqual({ children: [], measurementsByChild: {} });
  });

  it("retourne le dossier du client quand une relation de rendez-vous existe", async () => {
    asConsultant();
    mockBookingsData.data = [{ id: "booking-1" }];
    mockChildrenData.data = [{ id: "child-1", first_name: "Léa" }];

    const result = await getFamilyDossierForContact("client-1");

    expect(result.children).toEqual([{ id: "child-1", first_name: "Léa" }]);
  });

  it("accepte aussi une relation via une inscription à un accompagnement", async () => {
    asConsultant();
    mockBookingsData.data = [];
    mockAccompagnementsData.data = [{ id: "accompagnement-1" }];
    mockEnrollmentsData.data = [{ client_id: "client-1" }];
    mockChildrenData.data = [{ id: "child-1", first_name: "Léa" }];

    const result = await getFamilyDossierForContact("client-1");

    expect(result.children).toEqual([{ id: "child-1", first_name: "Léa" }]);
  });

  it("regroupe les pesées par enfant quand la relation existe", async () => {
    asConsultant();
    mockBookingsData.data = [{ id: "booking-1" }];
    mockChildrenData.data = [{ id: "child-1" }, { id: "child-2" }];
    mockMeasurementsData.data = [
      { id: "m1", child_id: "child-1" },
      { id: "m2", child_id: "child-1" },
    ];

    const result = await getFamilyDossierForContact("client-1");

    expect(result.measurementsByChild).toEqual({
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

  it("appelle notifyWeightAlerts avec l'enfant complet et l'historique de pesées après insertion", async () => {
    const { notifyWeightAlerts } = await import(
      "@/lib/growth-charts/weight-alerts-notify"
    );
    mockChildSingleData.data = {
      id: validInput.child_id,
      client_id: "client-9",
      birth_date: "2025-01-01",
    };
    mockBookingsData.data = [{ id: "booking-1" }];

    await addWeightMeasurementAsConsultant(validInput);

    expect(notifyWeightAlerts).toHaveBeenCalled();
    const [childArg] = vi.mocked(notifyWeightAlerts).mock.calls[0];
    expect(childArg).toMatchObject({ id: validInput.child_id });
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

  it("supprime la pesée quand la relation existe, même si elle a plusieurs jours (pas de fenêtre 24h côté consultante)", async () => {
    const fiveDaysAgo = new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000,
    ).toISOString();
    mockMeasurementSingleData.data = {
      id: "m1",
      child_id: "child-1",
      created_at: fiveDaysAgo,
    };
    mockChildSingleData.data = { id: "child-1", client_id: "client-9" };
    mockBookingsData.data = [{ id: "booking-1" }];

    const result = await deleteWeightMeasurementAsConsultant("m1");

    expect(result.success).toBe(true);
    expect(deleteCalls).toEqual([{ table: "weight_measurements" }]);
  });
});

describe("getConsultationNoteForBooking", () => {
  beforeEach(resetMocks);

  it("retourne null si le booking n'appartient pas à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "autre-consultante",
    };

    const result = await getConsultationNoteForBooking("booking-1");

    expect(result).toBeNull();
  });

  it("retourne null si aucune fiche n'existe encore pour ce booking", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };
    mockConsultationNoteSingleData.data = null;

    const result = await getConsultationNoteForBooking("booking-1");

    expect(result).toBeNull();
  });

  it("retourne la fiche quand le booking appartient à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };
    mockConsultationNoteSingleData.data = {
      id: "note-1",
      booking_id: "booking-1",
      status: "draft",
    };

    const result = await getConsultationNoteForBooking("booking-1");

    expect(result).toMatchObject({ id: "note-1", status: "draft" });
  });
});

describe("upsertConsultationNote", () => {
  beforeEach(resetMocks);

  const validFields = {
    child_id: null,
    motif: "Douleur à la tétée",
    antecedents_medicaux: false,
    antecedents_medicaux_detail: null,
    antecedents_chirurgicaux: false,
    antecedents_chirurgicaux_detail: null,
    allergies: false,
    allergies_detail: null,
    traitements_en_cours: false,
    traitements_en_cours_detail: null,
    observation: "",
    conclusion: "",
    notes_internes: null,
  };

  it("refuse si le booking n'appartient pas à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "autre-consultante",
    };

    const result = await upsertConsultationNote("booking-1", validFields);

    expect(result.success).toBe(false);
    expect(upsertCalls).toHaveLength(0);
  });

  it("upsert sur booking_id quand le booking appartient à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };

    const result = await upsertConsultationNote("booking-1", validFields);

    expect(result.success).toBe(true);
    expect(upsertCalls.at(-1)).toMatchObject({
      table: "consultation_notes",
      data: {
        booking_id: "booking-1",
        client_id: "client-1",
        consultant_id: "consultant-1",
        motif: "Douleur à la tétée",
      },
      onConflict: "booking_id",
    });
  });

  it("rejette une entrée invalide avant tout accès base", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };

    const result = await upsertConsultationNote("booking-1", {
      ...validFields,
      child_id: "pas-un-uuid",
    });

    expect(result.success).toBe(false);
    expect(upsertCalls).toHaveLength(0);
  });

  it("rejette un child_id qui appartient à un autre client", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };
    // Aucun enfant trouvé pour ce couple (id, client_id du booking) : l'enfant
    // existe peut-être, mais chez un autre client.
    mockChildOwnershipSingleData.data = null;

    const result = await upsertConsultationNote("booking-1", {
      ...validFields,
      child_id: "123e4567-e89b-12d3-a456-426614174000",
    });

    expect(result).toEqual({ success: false, error: "Enfant introuvable" });
    expect(upsertCalls).toHaveLength(0);
    expect(childrenEqCalls).toContainEqual({
      column: "client_id",
      value: "client-1",
    });
  });

  it("accepte un child_id qui appartient bien au client du booking", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };
    mockChildOwnershipSingleData.data = {
      id: "123e4567-e89b-12d3-a456-426614174000",
    };

    const result = await upsertConsultationNote("booking-1", {
      ...validFields,
      child_id: "123e4567-e89b-12d3-a456-426614174000",
    });

    expect(result.success).toBe(true);
    expect(upsertCalls).toHaveLength(1);
  });
});

describe("publishConsultationNote", () => {
  beforeEach(resetMocks);

  it("refuse si le booking n'appartient pas à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "autre-consultante",
    };

    const result = await publishConsultationNote("booking-1");

    expect(result.success).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it("refuse si motif, observation ou conclusion est vide", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };
    mockConsultationNoteSingleData.data = {
      id: "note-1",
      motif: "Douleur",
      observation: "",
      conclusion: "À revoir",
    };

    const result = await publishConsultationNote("booking-1");

    expect(result.success).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it("publie la fiche quand tous les champs obligatoires sont remplis", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };
    mockConsultationNoteSingleData.data = {
      id: "note-1",
      motif: "Douleur",
      observation: "Observation détaillée",
      conclusion: "À revoir",
    };

    const result = await publishConsultationNote("booking-1");

    expect(result.success).toBe(true);
    expect(updateCalls.at(-1)).toMatchObject({
      table: "consultation_notes",
      data: { status: "published" },
    });
  });
});

describe("unpublishConsultationNote", () => {
  beforeEach(resetMocks);

  it("refuse si le booking n'appartient pas à la consultante", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "autre-consultante",
    };

    const result = await unpublishConsultationNote("booking-1");

    expect(result.success).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it("repasse la fiche en brouillon", async () => {
    asConsultant();
    mockBookingSingleData.data = {
      id: "booking-1",
      client_id: "client-1",
      consultant_id: "consultant-1",
    };

    const result = await unpublishConsultationNote("booking-1");

    expect(result.success).toBe(true);
    expect(updateCalls.at(-1)).toMatchObject({
      table: "consultation_notes",
      data: { status: "draft" },
    });
  });
});

describe("getConsultationNotesForFamilyDossier", () => {
  beforeEach(resetMocks);

  it("ne renvoie rien si le consultant n'a aucune relation avec ce client", async () => {
    asConsultant();
    mockConsultationNotesListData.data = [{ id: "note-1" }];

    const result = await getConsultationNotesForFamilyDossier("client-1");

    expect(result).toEqual([]);
  });

  it("retourne les fiches du client quand une relation existe, datées du rendez-vous", async () => {
    asConsultant();
    mockBookingsData.data = [{ id: "booking-1" }];
    mockConsultationNotesListData.data = [
      {
        id: "note-1",
        booking_id: "booking-1",
        motif: "Douleur",
        status: "draft",
        bookings: { starts_at: "2026-08-01T10:00:00.000Z" },
      },
    ];

    const result = await getConsultationNotesForFamilyDossier("client-1");

    expect(result).toEqual([
      {
        id: "note-1",
        booking_id: "booking-1",
        motif: "Douleur",
        status: "draft",
        booking_starts_at: "2026-08-01T10:00:00.000Z",
      },
    ]);
  });

  it("filtre réellement sur le client_id demandé", async () => {
    asConsultant();
    mockBookingsData.data = [{ id: "booking-1" }];
    mockConsultationNotesListData.data = [{ id: "note-1" }];

    await getConsultationNotesForFamilyDossier("client-42");

    expect(consultationNotesEqCalls).toContainEqual({
      column: "client_id",
      value: "client-42",
    });
  });
});

describe("getNoteHistory", () => {
  beforeEach(resetMocks);

  it("retourne l'historique d'une note appartenant à la consultante", async () => {
    asConsultant();
    mockNoteOwnershipSingleData.data = { id: "note-1" };
    mockNoteHistoryListData.data = [
      { id: "h-2", content: "deuxième version", edited_at: "2026-08-10T10:00:00.000Z" },
      { id: "h-1", content: "première version", edited_at: "2026-08-09T10:00:00.000Z" },
    ];

    const result = await getNoteHistory("note-1");

    expect(result).toEqual([
      { id: "h-2", content: "deuxième version", edited_at: "2026-08-10T10:00:00.000Z" },
      { id: "h-1", content: "première version", edited_at: "2026-08-09T10:00:00.000Z" },
    ]);
    expect(noteOwnershipEqCalls).toEqual([
      { column: "id", value: "note-1" },
      { column: "consultant_id", value: "consultant-1" },
    ]);
  });

  it("ne renvoie rien si la note n'appartient pas à la consultante courante", async () => {
    asConsultant();
    mockNoteOwnershipSingleData.data = null;
    mockNoteHistoryListData.data = [
      { id: "h-1", content: "fuite potentielle", edited_at: "2026-08-09T10:00:00.000Z" },
    ];

    const result = await getNoteHistory("note-not-mine");

    expect(result).toEqual([]);
  });
});

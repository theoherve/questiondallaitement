import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockRpc = vi.fn();

// Supabase chain builder — chaque appel retourne un objet chaînable
const chain = () => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: mockSingle,
});

const mockFrom = vi.fn(() => chain());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { evaluateSegment } from "./actions";
import { getSessionUser } from "@/lib/auth";

// ─── Helpers ──────────────────────────────────────────────────

const CONSULTANT_ID = "consultant-uuid-001";
const CLIENT_A = "client-uuid-aaa";
const CLIENT_B = "client-uuid-bbb";

const mockConsultant = () => {
  vi.mocked(getSessionUser).mockResolvedValue({
    id: CONSULTANT_ID,
    email: "consultant@test.fr",
    roles: ["consultant"],
  } as never);
};

/**
 * Configure mockFrom pour simuler toutes les queries de getConsultantClientStats.
 * Chaque appel à from() retourne un chaînable dont la résolution finale
 * (select/eq/not/in/order/.then) retourne les données fixtures.
 */
const setupClientStats = ({
  bookings = [] as { client_id: string; starts_at: string; status: string }[],
  formationIds = [] as string[],
  enrollments = [] as { client_id: string; enrolled_at: string }[],
  profiles = [] as { id: string; first_name: string | null; last_name: string | null; email: string; created_at: string }[],
  payments = [] as { client_id: string; amount_cents: number }[],
  formations = [] as { client_id: string }[],
  score = 0,
} = {}) => {
  // mockFrom retourne un chaînable dont chaque méthode retourne `this`
  // sauf la méthode terminale qui retourne les données.
  // On utilise une approche par appel séquentiel (call count).
  mockFrom.mockImplementation((table: string) => {
    const c = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: mockSingle,
    } as Record<string, ReturnType<typeof vi.fn>>;

    // Chaque méthode chaînable doit aussi être awaitable
    for (const key of ["select", "eq", "not", "in", "order"] as const) {
      (c[key] as ReturnType<typeof vi.fn>).mockReturnValue({
        ...c,
        then: (_resolve: (v: unknown) => unknown) =>
          _resolve(
            table === "bookings" ? { data: bookings } :
            table === "accompagnements" ? { data: formationIds.map((id) => ({ id })) } :
            table === "accompagnement_enrollments" ? { data: enrollments } :
            table === "profiles" ? { data: profiles } :
            table === "payments" ? { data: payments } :
            table === "formation_registrations" ? { data: formations } :
            { data: [] },
          ),
      });
    }

    return c;
  });

  mockRpc.mockResolvedValue({ data: score, error: null });
};

// ─── evaluateSegment — redirection si non consultant ──────────

describe("evaluateSegment — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirige vers /connexion si utilisateur non connecté", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    // segment query doit quand même être mockée
    mockSingle.mockResolvedValue({ data: null });

    await expect(evaluateSegment("seg-001")).rejects.toThrow("NEXT_REDIRECT:/connexion");
  });

  it("redirige vers /connexion si rôle insuffisant", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user-001",
      email: "client@test.fr",
      roles: ["client"],
    } as never);
    mockSingle.mockResolvedValue({ data: null });

    await expect(evaluateSegment("seg-001")).rejects.toThrow("NEXT_REDIRECT:/connexion");
  });
});

// ─── evaluateSegment — segment introuvable ────────────────────

describe("evaluateSegment — segment introuvable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsultant();
  });

  it("retourne [] si le segment n'existe pas ou n'appartient pas au consultant", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const result = await evaluateSegment("seg-inexistant");

    expect(result).toEqual([]);
  });
});

// ─── matchesConditions via evaluateSegment ────────────────────

describe("evaluateSegment — filtrage par conditions (matchesConditions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsultant();
  });

  const mockSegment = (conditions: object[]) => {
    mockSingle.mockResolvedValue({ data: { conditions }, error: null });
  };

  const clientA = {
    id: CLIENT_A,
    first_name: "Alice",
    last_name: "Martin",
    email: "alice@test.fr",
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(), // inscrite il y a 60j
  };
  const clientB = {
    id: CLIENT_B,
    first_name: "Bob",
    last_name: "Dupont",
    email: "bob@test.fr",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(), // inscrit il y a 10j
  };

  it("opérateur >= : inclut le client dont booking_count atteint le seuil", async () => {
    mockSegment([{ field: "booking_count", op: ">=", value: 2 }]);
    setupClientStats({
      bookings: [
        { client_id: CLIENT_A, starts_at: new Date().toISOString(), status: "completed" },
        { client_id: CLIENT_A, starts_at: new Date().toISOString(), status: "completed" },
        { client_id: CLIENT_B, starts_at: new Date().toISOString(), status: "completed" },
      ],
      profiles: [clientA, clientB],
    });

    const result = await evaluateSegment("seg-001");

    expect(result.map((c) => c.id)).toContain(CLIENT_A);
    expect(result.map((c) => c.id)).not.toContain(CLIENT_B);
  });

  it("opérateur >= : exclut le client dont booking_count est sous le seuil", async () => {
    mockSegment([{ field: "booking_count", op: ">=", value: 3 }]);
    setupClientStats({
      bookings: [
        { client_id: CLIENT_A, starts_at: new Date().toISOString(), status: "completed" },
        { client_id: CLIENT_A, starts_at: new Date().toISOString(), status: "completed" },
      ],
      profiles: [clientA],
    });

    const result = await evaluateSegment("seg-001");

    expect(result).toEqual([]);
  });

  it("opérateur <= : inclut les clients récemment inscrits (days_since_registration)", async () => {
    mockSegment([{ field: "days_since_registration", op: "<=", value: 30 }]);
    // Les clients doivent avoir au moins un booking pour apparaître dans le CRM
    setupClientStats({
      bookings: [
        { client_id: CLIENT_A, starts_at: new Date().toISOString(), status: "completed" },
        { client_id: CLIENT_B, starts_at: new Date().toISOString(), status: "completed" },
      ],
      profiles: [clientA, clientB],
    }); // A=60j, B=10j

    const result = await evaluateSegment("seg-001");

    expect(result.map((c) => c.id)).toContain(CLIENT_B);
    expect(result.map((c) => c.id)).not.toContain(CLIENT_A);
  });

  it("opérateur = : correspondance exacte sur accompagnement_count", async () => {
    mockSegment([{ field: "accompagnement_count", op: "=", value: 1 }]);
    setupClientStats({
      profiles: [clientA, clientB],
      formationIds: ["form-001"],
      enrollments: [
        { client_id: CLIENT_A, enrolled_at: new Date().toISOString() },
      ],
    });

    const result = await evaluateSegment("seg-001");

    expect(result.map((c) => c.id)).toContain(CLIENT_A);
    expect(result.map((c) => c.id)).not.toContain(CLIENT_B);
  });

  it("opérateur != : exclut les clients avec exactement 0 consultation", async () => {
    mockSegment([{ field: "booking_count", op: "!=", value: 0 }]);
    setupClientStats({
      bookings: [
        { client_id: CLIENT_A, starts_at: new Date().toISOString(), status: "completed" },
      ],
      profiles: [clientA, clientB],
    });

    const result = await evaluateSegment("seg-001");

    expect(result.map((c) => c.id)).toContain(CLIENT_A);
    expect(result.map((c) => c.id)).not.toContain(CLIENT_B);
  });

  it("conditions multiples (AND) : client inclus seulement si toutes les conditions sont vraies", async () => {
    // booking_count >= 2 ET days_since_registration <= 30
    // CLIENT_A : 2 bookings, inscrit il y a 60j → exclue (2ème condition échoue)
    // CLIENT_B : 3 bookings, inscrit il y a 10j → inclus
    mockSegment([
      { field: "booking_count", op: ">=", value: 2 },
      { field: "days_since_registration", op: "<=", value: 30 },
    ]);
    setupClientStats({
      bookings: [
        { client_id: CLIENT_A, starts_at: new Date().toISOString(), status: "completed" },
        { client_id: CLIENT_A, starts_at: new Date().toISOString(), status: "completed" },
        { client_id: CLIENT_B, starts_at: new Date().toISOString(), status: "completed" },
        { client_id: CLIENT_B, starts_at: new Date().toISOString(), status: "completed" },
        { client_id: CLIENT_B, starts_at: new Date().toISOString(), status: "completed" },
      ],
      profiles: [clientA, clientB],
    });

    const result = await evaluateSegment("seg-001");

    expect(result.map((c) => c.id)).toContain(CLIENT_B);
    expect(result.map((c) => c.id)).not.toContain(CLIENT_A);
  });

  it("conditions multiples (AND) : une seule condition fausse suffit à exclure le client", async () => {
    // booking_count >= 1 ET accompagnement_count >= 2
    // CLIENT_A : 1 booking, 1 formation → exclue (2ème condition échoue)
    mockSegment([
      { field: "booking_count", op: ">=", value: 1 },
      { field: "accompagnement_count", op: ">=", value: 2 },
    ]);
    setupClientStats({
      bookings: [
        { client_id: CLIENT_A, starts_at: new Date().toISOString(), status: "completed" },
      ],
      formationIds: ["form-001"],
      enrollments: [
        { client_id: CLIENT_A, enrolled_at: new Date().toISOString() },
      ],
      profiles: [clientA],
    });

    const result = await evaluateSegment("seg-001");

    expect(result).toEqual([]);
  });

  it("retourne tous les clients si la liste de conditions est vide", async () => {
    mockSegment([]);
    setupClientStats({
      bookings: [
        { client_id: CLIENT_A, starts_at: new Date().toISOString(), status: "completed" },
        { client_id: CLIENT_B, starts_at: new Date().toISOString(), status: "completed" },
      ],
      profiles: [clientA, clientB],
    });

    const result = await evaluateSegment("seg-001");

    // Conditions vides → every() retourne true → tous inclus
    expect(result.length).toBe(2);
  });
});

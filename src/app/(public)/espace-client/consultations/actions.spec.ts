import { describe, it, expect, vi, beforeEach } from "vitest";

type RawNote = {
  id: string;
  client_id: string;
  status: string;
  bookings: { starts_at: string } | null;
};

const {
  mockGetSupabaseAndUser,
  selectCalls,
  eqCalls,
  mockAllNotesData,
  createMockSupabaseClient,
} = vi.hoisted(() => {
  const selectCalls: { table: string; columns: string }[] = [];
  const eqCalls: { column: string; value: unknown }[] = [];
  // Jeu de données "brut", non filtré : le mock applique réellement les
  // `.eq()` reçus, comme le ferait PostgREST, plutôt que de renvoyer une
  // valeur figée quels que soient les arguments passés à la requête.
  const mockAllNotesData: { data: RawNote[] } = { data: [] };

  const createMockSupabaseClient = () => ({
    from: (table: string) => ({
      select: (columns: string) => {
        selectCalls.push({ table, columns });
        let rows = mockAllNotesData.data;
        const applyEq = (column: string, value: unknown) => {
          eqCalls.push({ column, value });
          rows = rows.filter(
            (row) => (row as unknown as Record<string, unknown>)[column] === value,
          );
        };
        return {
          eq: (column: string, value: unknown) => {
            applyEq(column, value);
            return {
              eq: (column2: string, value2: unknown) => {
                applyEq(column2, value2);
                return {
                  order: () => Promise.resolve({ data: rows }),
                };
              },
            };
          },
        };
      },
    }),
  });

  return {
    mockGetSupabaseAndUser: vi.fn(),
    selectCalls,
    eqCalls,
    mockAllNotesData,
    createMockSupabaseClient,
  };
});

vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: mockGetSupabaseAndUser,
}));

import { getMyPublishedConsultationNotes } from "./actions";

describe("getMyPublishedConsultationNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCalls.length = 0;
    eqCalls.length = 0;
    mockAllNotesData.data = [];
  });

  it("scope la requête au client courant, sans paramètre clientId", async () => {
    mockAllNotesData.data = [
      {
        id: "note-1",
        client_id: "client-1",
        status: "published",
        bookings: { starts_at: "2026-08-01T10:00:00.000Z" },
      },
      {
        id: "note-2",
        client_id: "client-9",
        status: "published",
        bookings: { starts_at: "2026-08-02T10:00:00.000Z" },
      },
    ];
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: createMockSupabaseClient(),
    });

    const result = await getMyPublishedConsultationNotes();

    // La fiche d'un autre client (client-9) n'apparaît pas : la requête a
    // réellement filtré sur client_id, pas seulement renvoyé une valeur figée.
    expect(result).toEqual([
      {
        id: "note-1",
        client_id: "client-1",
        status: "published",
        booking_starts_at: "2026-08-01T10:00:00.000Z",
      },
    ]);
    expect(eqCalls).toContainEqual({ column: "client_id", value: "client-1" });
    expect(eqCalls).toContainEqual({ column: "status", value: "published" });
  });

  it("ne sélectionne jamais la colonne notes_internes", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: createMockSupabaseClient(),
    });

    await getMyPublishedConsultationNotes();

    const call = selectCalls.at(-1);
    expect(call?.columns).not.toContain("notes_internes");
    expect(call?.columns).not.toBe("*");
  });

  it("exclut une fiche restée en brouillon du résultat", async () => {
    mockAllNotesData.data = [
      {
        id: "note-published",
        client_id: "client-1",
        status: "published",
        bookings: { starts_at: "2026-08-01T10:00:00.000Z" },
      },
      {
        id: "note-draft",
        client_id: "client-1",
        status: "draft",
        bookings: { starts_at: "2026-08-03T10:00:00.000Z" },
      },
    ];
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: createMockSupabaseClient(),
    });

    const result = await getMyPublishedConsultationNotes();

    expect(result.map((n) => n.id)).toEqual(["note-published"]);
    expect(eqCalls).toContainEqual({ column: "status", value: "published" });
  });
});

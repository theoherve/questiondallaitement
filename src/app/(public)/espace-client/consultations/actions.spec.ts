import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSupabaseAndUser, selectCalls, createMockSupabaseClient } =
  vi.hoisted(() => {
    const selectCalls: { table: string; columns: string }[] = [];

    const createMockSupabaseClient = () => ({
      from: (table: string) => ({
        select: (columns: string) => {
          selectCalls.push({ table, columns });
          return {
            eq: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: [{ id: "note-1", status: "published" }],
                    error: null,
                  }),
              }),
            }),
          };
        },
      }),
    });

    return {
      mockGetSupabaseAndUser: vi.fn(),
      selectCalls,
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
  });

  it("scope la requête au client courant, sans paramètre clientId", async () => {
    mockGetSupabaseAndUser.mockResolvedValue({
      user: { id: "client-1" },
      supabase: createMockSupabaseClient(),
    });

    const result = await getMyPublishedConsultationNotes();

    expect(result).toEqual([{ id: "note-1", status: "published" }]);
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
});

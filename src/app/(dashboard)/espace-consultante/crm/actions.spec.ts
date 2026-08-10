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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: (data: unknown) => {
        insertCalls.push({ table, data });
        return {
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "tag-1" }, error: null }),
          }),
        };
      },
    }),
  }),
}));

import { createTag } from "./actions";

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

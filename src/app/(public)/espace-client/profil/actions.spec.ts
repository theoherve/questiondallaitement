import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const mockIs = vi.fn();
const mockEq = vi.fn(() => ({ is: mockIs }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ update: mockUpdate }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/supabase/server-auth", () => ({
  getSupabaseAndUser: vi.fn(),
}));

vi.mock("@/auth", () => ({
  signOut: vi.fn((opts: { redirectTo: string }) => {
    throw new Error(`NEXT_REDIRECT:${opts.redirectTo}`);
  }),
}));

// bcryptjs and zod imports used by other actions in the same file
vi.mock("bcryptjs", () => ({ hash: vi.fn(), compare: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requestAccountDeletion } from "./actions";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";

// ─── requestAccountDeletion ───────────────────────────────────

describe("requestAccountDeletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseAndUser).mockResolvedValue({
      user: { id: "user-abc" },
      supabase: {} as never,
    } as never);
    mockIs.mockResolvedValue({ error: null });
  });

  it("met à jour deleted_at et redirige vers / (succès)", async () => {
    await expect(requestAccountDeletion()).rejects.toThrow("NEXT_REDIRECT:/");

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "user-abc");
    expect(mockIs).toHaveBeenCalledWith("deleted_at", null);
  });

  it("retourne { success: false } si Supabase retourne une erreur", async () => {
    mockIs.mockResolvedValue({ error: { message: "DB error" } });

    const result = await requestAccountDeletion();

    expect(result).toEqual({
      success: false,
      error: "Erreur lors de la demande de suppression",
    });
  });

  it("n'appelle pas signOut si la mise à jour DB échoue", async () => {
    mockIs.mockResolvedValue({ error: { message: "DB error" } });
    const { signOut } = await import("@/auth");

    await requestAccountDeletion();

    expect(signOut).not.toHaveBeenCalled();
  });
});

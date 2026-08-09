import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, resolveAudience, mockGetSessionUser, insertCalls } = vi.hoisted(
  () => ({
    notify: vi.fn().mockResolvedValue(undefined),
    resolveAudience: vi
      .fn()
      .mockResolvedValue([{ userId: "c1", email: "c1@b.fr" }]),
    mockGetSessionUser: vi.fn(),
    insertCalls: [] as unknown[],
  })
);

vi.mock("@/lib/notifications", () => ({ notify, resolveAudience }));
vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (data: unknown) => {
        insertCalls.push(data);
        return {
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "replay-1" }, error: null }),
          }),
        };
      },
    }),
  }),
}));

import { createReplayLive } from "./actions";

const replay = {
  title: "Atelier de juillet",
  vimeo_url: "https://vimeo.com/123456789",
  live_date: "2026-07-01",
};

describe("createReplayLive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    resolveAudience.mockResolvedValue([{ userId: "c1", email: "c1@b.fr" }]);
    mockGetSessionUser.mockResolvedValue({
      id: "admin-1",
      email: "a@b.fr",
      roles: ["admin"],
    });
  });

  it("notifie les détenteurs d'un accompagnement quand on le demande", async () => {
    await createReplayLive(replay, { notifyHolders: true });

    expect(resolveAudience).toHaveBeenCalledWith("replay_published", {
      kind: "accompagnement_holders",
    });
    expect(notify).toHaveBeenCalledWith(
      "replay_published",
      [{ userId: "c1", email: "c1@b.fr" }],
      expect.objectContaining({ title: "Atelier de juillet" }),
      expect.objectContaining({ dedupeId: "replay-1" })
    );
  });

  it("ne notifie personne par défaut", async () => {
    await createReplayLive(replay);

    expect(resolveAudience).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("n'insère pas l'option de notification en base", async () => {
    await createReplayLive(replay, { notifyHolders: true });

    expect(insertCalls.at(-1)).toEqual(replay);
  });
});

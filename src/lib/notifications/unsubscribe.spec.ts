import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockMaybeSingle, mockUpsert } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) =>
      table === "profiles"
        ? { select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }
        : { upsert: mockUpsert },
  }),
}));

import { unsubscribeByToken, buildUnsubscribeUrl } from "./unsubscribe";

describe("unsubscribeByToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: { id: "u1" }, error: null });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("coupe le canal email de la catégorie visée", async () => {
    const result = await unsubscribeByToken("tok-1", "replays");

    expect(result.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        category_key: "replays",
        channel: "email",
        enabled: false,
      }),
      { onConflict: "user_id,category_key,channel" }
    );
  });

  it("ne touche pas au canal in-app", async () => {
    await unsubscribeByToken("tok-1", "replays");

    const payload = mockUpsert.mock.calls[0][0] as { channel: string };
    expect(payload.channel).toBe("email");
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it("refuse un jeton inconnu", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await unsubscribeByToken("inconnu", "replays");

    expect(result.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("refuse de désinscrire d'une catégorie imposée", async () => {
    const result = await unsubscribeByToken("tok-1", "paiements");

    expect(result.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("refuse une catégorie inconnue", async () => {
    const result = await unsubscribeByToken("tok-1", "inexistante");

    expect(result.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("buildUnsubscribeUrl", () => {
  it("construit une URL absolue portant le jeton et la catégorie", () => {
    const url = buildUnsubscribeUrl("tok-1", "replays");
    expect(url).toContain("/notifications/desinscription");
    expect(url).toContain("token=tok-1");
    expect(url).toContain("categorie=replays");
  });
});

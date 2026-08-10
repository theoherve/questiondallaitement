import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: mockSelect }) }),
  }),
}));

import { resolveChannels, loadPreferences } from "./preferences";

describe("resolveChannels", () => {
  it("laisse passer tous les canaux déclarés pour une catégorie imposée", () => {
    expect(resolveChannels("rendez_vous", ["in_app", "email"])).toEqual([
      "in_app",
      "email",
    ]);
  });

  it("ignore les préférences sur une catégorie imposée", () => {
    expect(
      resolveChannels("paiements", ["in_app", "email"], {
        "paiements:email": false,
      })
    ).toEqual(["in_app", "email"]);
  });

  it("applique la préférence sur une catégorie optionnelle", () => {
    expect(
      resolveChannels("replays", ["in_app", "email"], { "replays:email": false })
    ).toEqual(["in_app"]);
  });

  it("laisse passer une catégorie optionnelle sans préférence enregistrée", () => {
    expect(resolveChannels("replays", ["in_app", "email"])).toEqual([
      "in_app",
      "email",
    ]);
  });

  it("coupe le digest en l'absence de préférence, car il est en opt-in", () => {
    expect(resolveChannels("digest", ["in_app", "email"])).toEqual([]);
  });

  it("active le digest quand la préférence l'autorise", () => {
    expect(
      resolveChannels("digest", ["in_app", "email"], { "digest:email": true })
    ).toEqual(["email"]);
  });

  it("ne renvoie jamais un canal non déclaré par l'événement", () => {
    expect(
      resolveChannels("replays", ["in_app"], { "replays:email": true })
    ).toEqual(["in_app"]);
  });
});

describe("loadPreferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("indexe les écarts par catégorie et par canal", async () => {
    mockSelect.mockResolvedValue({
      data: [
        { category_key: "replays", channel: "email", enabled: false },
        { category_key: "digest", channel: "in_app", enabled: true },
      ],
      error: null,
    });

    expect(await loadPreferences("u1")).toEqual({
      "replays:email": false,
      "digest:in_app": true,
    });
  });

  it("renvoie un objet vide quand la lecture échoue, pour ne rien bloquer", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSelect.mockResolvedValue({ data: null, error: { message: "DB down" } });

    expect(await loadPreferences("u1")).toEqual({});
    consoleSpy.mockRestore();
  });
});

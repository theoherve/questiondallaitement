import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, resolveAudience, tableData } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  resolveAudience: vi.fn(),
  tableData: {} as Record<string, unknown[]>,
}));

vi.mock("@/lib/notifications/notify", () => ({ notify }));
vi.mock("@/lib/notifications/audience", () => ({ resolveAudience }));

const makeChain = (table: string) => {
  const rows = tableData[table] ?? [];
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, error: null }),
  };
  return new Proxy(chain, {
    get: (target, prop) =>
      prop in target ? target[prop as string] : () => makeChain(table),
  });
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => makeChain(t) }),
}));

import { runWeeklyDigest } from "./weekly-digest";

const MONDAY = new Date("2026-08-10T09:00:00Z");
const WEDNESDAY = new Date("2026-08-12T09:00:00Z");

describe("runWeeklyDigest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableData)) delete tableData[k];
    resolveAudience.mockResolvedValue([
      { userId: "u1", email: "a@b.fr", unsubscribeToken: "tok-1" },
    ]);
    tableData.notifications = [
      { user_id: "u1", title: "Nouveau replay" },
      { user_id: "u1", title: "Nouvel article" },
    ];
  });

  it("n'envoie rien un jour qui n'est pas lundi", async () => {
    expect(await runWeeklyDigest(WEDNESDAY)).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("envoie le résumé le lundi", async () => {
    const sent = await runWeeklyDigest(MONDAY);

    expect(sent).toBe(1);
    expect(notify).toHaveBeenCalledWith(
      "weekly_digest",
      [expect.objectContaining({ userId: "u1" })],
      expect.objectContaining({
        count: 2,
        highlights: ["Nouveau replay", "Nouvel article"],
      }),
      expect.objectContaining({ dedupeId: expect.stringContaining("u1:") })
    );
  });

  it("ne cible que les personnes ayant activé le digest", async () => {
    await runWeeklyDigest(MONDAY);

    expect(resolveAudience).toHaveBeenCalledWith("weekly_digest", {
      kind: "preference_enabled",
      categoryKey: "digest",
    });
  });

  it("n'écrit à personne dont la semaine a été vide", async () => {
    tableData.notifications = [];

    expect(await runWeeklyDigest(MONDAY)).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("déduplique par utilisatrice et par semaine", async () => {
    await runWeeklyDigest(MONDAY);

    const dedupeId = notify.mock.calls[0][3].dedupeId as string;
    expect(dedupeId).toMatch(/^u1:\d{4}-W\d{2}$/);
  });

  it("limite le nombre de titres repris dans le résumé", async () => {
    tableData.notifications = Array.from({ length: 12 }, (_, i) => ({
      user_id: "u1",
      title: `Notification ${i}`,
    }));

    await runWeeklyDigest(MONDAY);

    const data = notify.mock.calls[0][2] as {
      count: number;
      highlights: string[];
    };
    expect(data.count).toBe(12);
    expect(data.highlights.length).toBeLessThanOrEqual(5);
  });

  it("n'interroge personne quand l'audience est vide", async () => {
    resolveAudience.mockResolvedValue([]);

    expect(await runWeeklyDigest(MONDAY)).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });
});

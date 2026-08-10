import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, getRoleRecipients, tableData } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  getRoleRecipients: vi.fn(),
  tableData: {} as Record<string, unknown[]>,
}));

vi.mock("@/lib/notifications/notify", () => ({ notify }));
vi.mock("@/lib/notifications/recipients", () => ({ getRoleRecipients }));

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

import { runAdminDigest } from "./admin-digest";

const MORNING = new Date("2026-08-10T07:30:00Z");

describe("runAdminDigest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableData)) delete tableData[k];
    getRoleRecipients.mockResolvedValue([
      { userId: "admin-1", email: "a@b.fr" },
    ]);
    tableData.notifications = [
      { title: "Nouvel achat", category: "system" },
      { title: "Remboursement effectué", category: "system" },
    ];
  });

  it("envoie le récapitulatif à l'administration", async () => {
    const sent = await runAdminDigest(MORNING);

    expect(sent).toBe(1);
    expect(notify).toHaveBeenCalledWith(
      "admin_digest",
      [expect.objectContaining({ userId: "admin-1" })],
      expect.objectContaining({
        count: 2,
        highlights: ["Nouvel achat", "Remboursement effectué"],
      }),
      expect.objectContaining({ dedupeId: "2026-08-10" })
    );
  });

  it("n'envoie rien quand la journée a été vide", async () => {
    tableData.notifications = [];

    expect(await runAdminDigest(MORNING)).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("n'envoie rien sans administratrice", async () => {
    getRoleRecipients.mockResolvedValue([]);

    expect(await runAdminDigest(MORNING)).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("déduplique par jour, pour un cron horaire", async () => {
    await runAdminDigest(MORNING);
    const first = (notify.mock.calls[0][3] as { dedupeId: string }).dedupeId;
    expect(first).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("limite le nombre de titres repris", async () => {
    tableData.notifications = Array.from({ length: 30 }, (_, i) => ({
      title: `Evenement ${i}`,
      category: "system",
    }));

    await runAdminDigest(MORNING);

    const data = notify.mock.calls[0][2] as {
      count: number;
      highlights: string[];
    };
    expect(data.count).toBe(30);
    expect(data.highlights.length).toBeLessThanOrEqual(10);
  });
});

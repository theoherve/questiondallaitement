import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, tableData } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  tableData: {} as Record<string, unknown[]>,
}));

vi.mock("@/lib/notifications/notify", () => ({ notify }));

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

import { runModuleReminders } from "./module-reminder";

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();

describe("runModuleReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableData)) delete tableData[k];

    // Les blocs ne sont pas rattachés à l'accompagnement mais à ses sections :
    // le compte total passe donc par la même imbrication que l'espace client.
    tableData.accompagnement_enrollments = [
      {
        id: "enr-1",
        client_id: "c1",
        accompagnement_id: "acc-1",
        accompagnements: {
          id: "acc-1",
          title: "Reprendre le travail",
          accompagnement_sections: [
            { accompagnement_blocks: [{ id: "b1" }, { id: "b2" }] },
            { accompagnement_blocks: [{ id: "b3" }] },
          ],
        },
        profiles: { email: "a@b.fr", notification_unsubscribe_token: "tok-1" },
      },
    ];
    tableData.accompagnement_progress = [
      {
        enrollment_id: "enr-1",
        block_id: "b1",
        completed: true,
        completed_at: daysAgo(10),
      },
    ];
  });

  it("relance une inscription commencée et laissée en plan", async () => {
    const sent = await runModuleReminders();

    expect(sent).toBe(1);
    expect(notify).toHaveBeenCalledWith(
      "module_reminder",
      [
        expect.objectContaining({
          userId: "c1",
          email: "a@b.fr",
          unsubscribeToken: "tok-1",
        }),
      ],
      expect.objectContaining({ accompagnement_id: "acc-1", remaining: 2 }),
      expect.objectContaining({
        dedupeId: expect.stringMatching(/^enr-1:\d{4}-\d{2}$/),
      })
    );
  });

  it("ne relance pas une progression récente", async () => {
    tableData.accompagnement_progress = [
      {
        enrollment_id: "enr-1",
        block_id: "b1",
        completed: true,
        completed_at: daysAgo(2),
      },
    ];

    expect(await runModuleReminders()).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("ne relance pas une inscription jamais commencée", async () => {
    tableData.accompagnement_progress = [];

    expect(await runModuleReminders()).toBe(0);
  });

  it("ne relance pas un accompagnement terminé", async () => {
    tableData.accompagnement_progress = [
      { enrollment_id: "enr-1", block_id: "b1", completed: true, completed_at: daysAgo(10) },
      { enrollment_id: "enr-1", block_id: "b2", completed: true, completed_at: daysAgo(10) },
      { enrollment_id: "enr-1", block_id: "b3", completed: true, completed_at: daysAgo(10) },
    ];

    expect(await runModuleReminders()).toBe(0);
  });

  it("déduplique par inscription et par mois", async () => {
    await runModuleReminders();

    const dedupeId = notify.mock.calls[0][3].dedupeId as string;
    const [, month] = dedupeId.split(":");
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });

  it("ne lève pas quand une inscription est incomplète", async () => {
    tableData.accompagnement_enrollments = [
      {
        id: "enr-2",
        client_id: "c2",
        accompagnement_id: "acc-2",
        accompagnements: null,
        profiles: null,
      },
    ];

    await expect(runModuleReminders()).resolves.toBe(0);
  });
});

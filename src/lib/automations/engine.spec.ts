import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, tableData, insertCalls } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  tableData: {} as Record<string, unknown[]>,
  insertCalls: [] as { table: string; data: unknown }[],
}));

vi.mock("@/lib/notifications", () => ({ notify }));
vi.mock("@/lib/resend/client", () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue(undefined),
}));

const makeChain = (table: string) => {
  const rows = tableData[table] ?? [];
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, error: null }),
    insert: (data: unknown) => {
      insertCalls.push({ table, data });
      return Promise.resolve({ error: null });
    },
    upsert: () => Promise.resolve({ error: null }),
  };
  return new Proxy(chain, {
    get: (target, prop) =>
      prop in target ? target[prop as string] : () => makeChain(table),
  });
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => makeChain(t) }),
}));

import { runAutomations } from "./engine";

const triggerData = {
  client_id: "c1",
  client_email: "a@b.fr",
  client_name: "Camille",
  accompagnement_title: "Reprendre le travail",
};

describe("runAutomations et l'action send_notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    for (const k of Object.keys(tableData)) delete tableData[k];

    tableData.automations = [
      {
        id: "auto-1",
        consultant_id: "cons-1",
        name: "Bienvenue",
        trigger_type: "accompagnement_purchased",
        trigger_config: {},
        actions: [
          {
            type: "send_notification",
            title: "Bienvenue {{client_name}}",
            body: "Votre accompagnement {{accompagnement_title}} vous attend.",
          },
        ],
      },
    ];
  });

  it("notifie la cliente avec les variables remplacées", async () => {
    await runAutomations("accompagnement_purchased", "cons-1", triggerData);

    expect(notify).toHaveBeenCalledWith(
      "automation_message",
      [expect.objectContaining({ userId: "c1", email: "a@b.fr" })],
      {
        title: "Bienvenue Camille",
        body: "Votre accompagnement Reprendre le travail vous attend.",
        href: undefined,
      },
      expect.objectContaining({ dedupeId: expect.stringContaining("auto-1") })
    );
  });

  it("journalise le succès de l'action", async () => {
    await runAutomations("accompagnement_purchased", "cons-1", triggerData);

    const log = insertCalls.find((c) => c.table === "automation_logs");
    expect(log).toBeDefined();
    expect((log!.data as { status: string }).status).toBe("success");
  });

  it("échoue proprement sans identifiant de cliente", async () => {
    await runAutomations("accompagnement_purchased", "cons-1", {
      client_email: "a@b.fr",
    } as never);

    expect(notify).not.toHaveBeenCalled();
    const log = insertCalls.find((c) => c.table === "automation_logs");
    expect((log!.data as { status: string }).status).toBe("partial");
  });

  it("déduplique par automatisation et par cliente", async () => {
    await runAutomations("accompagnement_purchased", "cons-1", triggerData);

    const options = notify.mock.calls[0][3] as { dedupeId: string };
    expect(options.dedupeId).toBe("auto-1:c1");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// `vi.mock` est hissé en haut du fichier : les mocks qu'il référence doivent
// être créés par `vi.hoisted`, sinon ils n'existent pas encore à l'exécution.
const { notify, getRoleRecipients } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  getRoleRecipients: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/notifications", () => ({ notify, getRoleRecipients }));
vi.mock("@/lib/emails/send", () => ({
  sendBlogPostPublishedNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/automations/engine", () => ({
  runAutomations: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/admin-workflows/generate-formations", () => ({
  generateRecurringFormations: vi.fn().mockResolvedValue({ generated: 0 }),
}));
vi.mock("@/lib/admin-workflows/scheduler", () => ({
  scheduleWorkflowActionsForUpcomingFormations: vi
    .fn()
    .mockResolvedValue({ scheduled: 0 }),
}));
vi.mock("@/lib/admin-workflows/executor", () => ({
  executeScheduledActions: vi.fn().mockResolvedValue({ executed: 0, failed: 0 }),
}));

/** Résultat renvoyé par table. Toute table non listée renvoie une liste vide. */
const tableData: Record<string, unknown[]> = {};

/**
 * Chaîne Supabase générique : n'importe quelle suite d'appels
 * (`select().eq().gte()...`) renvoie le même objet, qui se résout sur la donnée
 * de la table. Écrire une chaîne par requête serait ingérable ici, le cron en
 * enchaîne une dizaine de formes différentes.
 */
const makeChain = (table: string) => {
  const rows = tableData[table] ?? [];
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, error: null, count: rows.length }),
    single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
  };
  return new Proxy(chain, {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      return () => makeChain(table);
    },
  });
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => makeChain(table),
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue({}) } },
  }),
}));

import { GET } from "./route";

const authorized = () =>
  new Request("http://localhost/api/cron", {
    headers: { authorization: "Bearer s3cr3t" },
  });

describe("cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "s3cr3t";
    for (const key of Object.keys(tableData)) delete tableData[key];
  });

  it("refuse un appel sans le secret", async () => {
    const res = await GET(new Request("http://localhost/api/cron"));
    expect(res.status).toBe(401);
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifie le rappel de consultation à la cliente concernée", async () => {
    tableData.bookings = [
      {
        id: "booking-1",
        client_id: "client-1",
        starts_at: "2026-08-10T08:30:00Z",
        status: "confirmed",
        profiles: { email: "a@b.fr", first_name: "Camille", last_name: "D" },
        consultants: { profiles: { first_name: "Carole", last_name: "H" } },
      },
    ];

    await GET(authorized());

    const reminder = notify.mock.calls.find(
      (c) => c[0] === "booking_reminder"
    );
    expect(reminder).toBeDefined();
    expect(reminder![1]).toEqual([{ userId: "client-1", email: "a@b.fr" }]);
    expect(reminder![2]).toMatchObject({
      booking_id: "booking-1",
      client_name: "Camille D",
      consultant_name: "Carole H",
    });
  });

  it("déduplique le rappel par réservation et par jour", async () => {
    tableData.bookings = [
      {
        id: "booking-1",
        client_id: "client-1",
        starts_at: "2026-08-10T08:30:00Z",
        status: "confirmed",
        profiles: { email: "a@b.fr", first_name: "Camille", last_name: "D" },
        consultants: { profiles: { first_name: "Carole", last_name: "H" } },
      },
    ];

    await GET(authorized());

    const reminder = notify.mock.calls.find((c) => c[0] === "booking_reminder");
    expect(reminder![3].dedupeId).toMatch(/^booking-1:\d{4}-\d{2}-\d{2}$/);
  });

  it("prévient le backoffice quand une étape échoue", async () => {
    const { generateRecurringFormations } = await import(
      "@/lib/admin-workflows/generate-formations"
    );
    vi.mocked(generateRecurringFormations).mockRejectedValueOnce(
      new Error("Supabase timeout")
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await GET(authorized());

    const failure = notify.mock.calls.find((c) => c[0] === "admin_job_failed");
    expect(failure).toBeDefined();
    expect(failure![2]).toMatchObject({ reason: "Supabase timeout" });
    consoleSpy.mockRestore();
  });
});

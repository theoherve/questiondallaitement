import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  loadClientStats,
  matchesConditions,
  getRoleRecipients,
  mockInsert,
  segmentState,
} = vi.hoisted(() => ({
  loadClientStats: vi.fn(),
  matchesConditions: vi.fn(),
  getRoleRecipients: vi.fn(),
  mockInsert: vi.fn(),
  segmentState: {
    row: { conditions: [{ field: "has_accompagnement", op: "=", value: true }] } as
      | { conditions: unknown[] }
      | null,
  },
}));

vi.mock("@/lib/crm/segment-eval", () => ({ loadClientStats, matchesConditions }));
vi.mock("./recipients", () => ({ getRoleRecipients }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) =>
      table === "notification_broadcasts"
        ? { insert: mockInsert }
        : {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: segmentState.row, error: null }),
              }),
            }),
          },
  }),
}));

import { resolveAudience } from "./audience";

const clients = [
  { id: "c1", email: "c1@b.fr", has_accompagnement: true },
  { id: "c2", email: "c2@b.fr", has_accompagnement: true },
];

describe("resolveAudience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    loadClientStats.mockResolvedValue(clients);
    matchesConditions.mockReturnValue(true);
    getRoleRecipients.mockResolvedValue([{ userId: "admin-1", email: "a@b.fr" }]);
    segmentState.row = {
      conditions: [{ field: "has_accompagnement", op: "=", value: true }],
    };
  });

  it("renvoie le destinataire unique sans requête", async () => {
    const result = await resolveAudience("replay_published", {
      kind: "recipient",
      userId: "u1",
      email: "u1@b.fr",
    });

    expect(result).toEqual([{ userId: "u1", email: "u1@b.fr" }]);
    expect(loadClientStats).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("délègue la règle de rôle à getRoleRecipients", async () => {
    const result = await resolveAudience("admin_purchase", {
      kind: "role",
      role: "admin",
    });

    expect(result).toEqual([{ userId: "admin-1", email: "a@b.fr" }]);
  });

  it("filtre les clientes par les conditions du segment", async () => {
    matchesConditions.mockImplementation((c: { id: string }) => c.id === "c2");

    const result = await resolveAudience("replay_published", {
      kind: "segment",
      segmentId: "seg-1",
    });

    expect(result).toEqual([{ userId: "c2", email: "c2@b.fr" }]);
  });

  it("journalise un envoi ciblé avec son effectif", async () => {
    await resolveAudience("replay_published", {
      kind: "segment",
      segmentId: "seg-1",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "replay_published",
        recipient_count: 2,
        truncated: false,
      })
    );
  });

  it("plafonne la liste et signale la coupure", async () => {
    const result = await resolveAudience(
      "replay_published",
      { kind: "segment", segmentId: "seg-1" },
      { maxRecipients: 1 }
    );

    expect(result).toHaveLength(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ recipient_count: 1, truncated: true })
    );
  });

  it("renvoie une liste vide quand le segment est introuvable", async () => {
    segmentState.row = null;

    const result = await resolveAudience("replay_published", {
      kind: "segment",
      segmentId: "inconnu",
    });

    expect(result).toEqual([]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("cible les détenteurs d'un accompagnement sans passer par un segment", async () => {
    loadClientStats.mockResolvedValue([
      { id: "c1", email: "c1@b.fr", has_accompagnement: true },
      { id: "c2", email: "c2@b.fr", has_accompagnement: false },
    ]);

    const result = await resolveAudience("replay_published", {
      kind: "accompagnement_holders",
    });

    expect(result).toEqual([{ userId: "c1", email: "c1@b.fr" }]);
  });

  it("n'empêche pas l'envoi quand la journalisation échoue", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockRejectedValue(new Error("DB down"));

    const result = await resolveAudience("replay_published", {
      kind: "accompagnement_holders",
    });

    expect(result).toHaveLength(2);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

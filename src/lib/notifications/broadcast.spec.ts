import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, resolveAudience } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  resolveAudience: vi.fn(),
}));

vi.mock("./notify", () => ({ notify }));
vi.mock("./audience", () => ({ resolveAudience }));

import { sendUserBroadcast, countAudience } from "./broadcast";

const recipients = [
  { userId: "c1", email: "c1@b.fr" },
  { userId: "c2", email: "c2@b.fr" },
];

describe("sendUserBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAudience.mockResolvedValue(recipients);
  });

  it("envoie le message à toute l'audience résolue", async () => {
    const result = await sendUserBroadcast({
      title: "Fermeture estivale",
      body: "Du 1er au 15 août.",
      audience: { kind: "all_clients" },
    });

    expect(result.sent).toBe(2);
    expect(notify).toHaveBeenCalledWith(
      "broadcast_message",
      recipients,
      expect.objectContaining({ title: "Fermeture estivale" }),
      expect.objectContaining({ dedupeId: expect.any(String) })
    );
  });

  it("traduit un segment en règle d'audience", async () => {
    await sendUserBroadcast({
      title: "T",
      body: "B",
      audience: { kind: "segment", segmentId: "seg-1" },
    });

    expect(resolveAudience).toHaveBeenCalledWith("broadcast_message", {
      kind: "segment",
      segmentId: "seg-1",
    });
  });

  it("n'envoie rien quand l'audience est vide", async () => {
    resolveAudience.mockResolvedValue([]);

    const result = await sendUserBroadcast({
      title: "T",
      body: "B",
      audience: { kind: "all_clients" },
    });

    expect(result.sent).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("donne à chaque envoi une clé de déduplication distincte", async () => {
    await sendUserBroadcast({
      title: "T",
      body: "B",
      audience: { kind: "all_clients" },
    });
    await sendUserBroadcast({
      title: "T",
      body: "B",
      audience: { kind: "all_clients" },
    });

    const first = (notify.mock.calls[0][3] as { dedupeId: string }).dedupeId;
    const second = (notify.mock.calls[1][3] as { dedupeId: string }).dedupeId;
    // Deux annonces successives au meme libelle restent deux annonces : la cle
    // ne doit pas faire taire la seconde.
    expect(first).not.toBe(second);
  });
});

describe("countAudience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAudience.mockResolvedValue(recipients);
  });

  it("compte sans rien envoyer", async () => {
    expect(await countAudience({ kind: "all_clients" })).toBe(2);
    expect(notify).not.toHaveBeenCalled();
  });
});

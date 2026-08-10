import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSelect, mockUpdateEq, mockDeleteEq, sendNotification, setVapidDetails } =
  vi.hoisted(() => ({
    mockSelect: vi.fn(),
    mockUpdateEq: vi.fn(),
    mockDeleteEq: vi.fn(),
    sendNotification: vi.fn(),
    setVapidDetails: vi.fn(),
  }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: mockSelect }),
      update: () => ({ eq: mockUpdateEq }),
      delete: () => ({ eq: mockDeleteEq }),
    }),
  }),
}));

vi.mock("web-push", () => ({
  default: { setVapidDetails, sendNotification },
}));

import { sendPushToUser } from "./send";

const SUBS = [
  { endpoint: "https://push.example/a", p256dh: "key-a", auth: "auth-a" },
  { endpoint: "https://push.example/b", p256dh: "key-b", auth: "auth-b" },
];

/** Erreur telle que `web-push` la lève : le statut HTTP porte le sens. */
const httpError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

describe("sendPushToUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub");
    vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
    vi.stubEnv("VAPID_SUBJECT", "mailto:contact@questiondallaitement.fr");
    mockSelect.mockResolvedValue({ data: SUBS, error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
    sendNotification.mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("envoie à tous les abonnements de l'utilisatrice", async () => {
    const sent = await sendPushToUser("u1", { title: "Rappel" });

    expect(sent).toBe(2);
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(sendNotification.mock.calls[0][0]).toEqual({
      endpoint: "https://push.example/a",
      keys: { p256dh: "key-a", auth: "auth-a" },
    });
  });

  it("transmet titre, corps et cible dans la charge utile", async () => {
    await sendPushToUser("u1", {
      title: "Rappel",
      body: "Demain à 10h",
      href: "/espace-client/reservations",
    });

    expect(JSON.parse(sendNotification.mock.calls[0][1] as string)).toEqual(
      expect.objectContaining({
        title: "Rappel",
        body: "Demain à 10h",
        href: "/espace-client/reservations",
      })
    );
  });

  it("supprime l'abonnement quand le service répond 410", async () => {
    sendNotification.mockRejectedValueOnce(httpError(410));

    const sent = await sendPushToUser("u1", { title: "Rappel" });

    expect(sent).toBe(1);
    expect(mockDeleteEq).toHaveBeenCalledWith(
      "endpoint",
      "https://push.example/a"
    );
  });

  it("supprime l'abonnement quand le service répond 404", async () => {
    sendNotification.mockRejectedValueOnce(httpError(404));

    await sendPushToUser("u1", { title: "Rappel" });

    expect(mockDeleteEq).toHaveBeenCalledWith(
      "endpoint",
      "https://push.example/a"
    );
  });

  it("garde l'abonnement sur une panne passagère", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendNotification.mockRejectedValueOnce(httpError(500));

    const sent = await sendPushToUser("u1", { title: "Rappel" });

    expect(sent).toBe(1);
    expect(mockDeleteEq).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("n'envoie rien et ne lève pas quand les clés VAPID manquent", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("VAPID_PRIVATE_KEY", "");

    expect(await sendPushToUser("u1", { title: "Rappel" })).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("renvoie zéro sans abonnement, sans interroger le service", async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });

    expect(await sendPushToUser("u1", { title: "Rappel" })).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("tronque un titre et un corps trop longs", async () => {
    await sendPushToUser("u1", {
      title: "T".repeat(200),
      body: "B".repeat(500),
    });

    const payload = JSON.parse(sendNotification.mock.calls[0][1] as string);
    expect(payload.title.length).toBe(80);
    expect(payload.body.length).toBe(160);
  });
});

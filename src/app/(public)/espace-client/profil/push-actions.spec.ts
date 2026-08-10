import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSessionUser, mockUpsert, mockSelectEq, mockDeleteMatch } = vi.hoisted(
  () => ({
    getSessionUser: vi.fn(),
    mockUpsert: vi.fn(),
    mockSelectEq: vi.fn(),
    mockDeleteMatch: vi.fn(),
  })
);

vi.mock("@/lib/auth", () => ({ getSessionUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: mockUpsert,
      select: () => ({ eq: () => ({ order: mockSelectEq }) }),
      delete: () => ({ match: mockDeleteMatch }),
    }),
  }),
}));

import {
  registerPushSubscription,
  listPushDevices,
  removePushDevice,
} from "./push-actions";

const VALID = {
  endpoint: "https://push.example/abc",
  p256dh: "key",
  auth: "auth",
  userAgent: "Mozilla/5.0",
};

describe("registerPushSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ id: "u1" });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("refuse sans session", async () => {
    getSessionUser.mockResolvedValue(null);

    expect(await registerPushSubscription(VALID)).toEqual({
      success: false,
      error: "Non authentifié",
    });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("enregistre l'abonnement pour l'utilisatrice connectée", async () => {
    expect(await registerPushSubscription(VALID)).toEqual({ success: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        endpoint: VALID.endpoint,
        p256dh: "key",
        auth: "auth",
      }),
      { onConflict: "endpoint" }
    );
  });

  it("n'enregistre qu'une ligne pour un même endpoint", async () => {
    await registerPushSubscription(VALID);
    await registerPushSubscription(VALID);

    // Deux appels, mais un upsert sur `endpoint` : c'est la base qui garantit
    // l'unicité, l'action ne fait pas de lecture préalable.
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    for (const call of mockUpsert.mock.calls) {
      expect(call[1]).toEqual({ onConflict: "endpoint" });
    }
  });

  it("refuse un endpoint qui n'est pas une URL", async () => {
    const result = await registerPushSubscription({ ...VALID, endpoint: "abc" });

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("refuse un abonnement sans clés de chiffrement", async () => {
    const result = await registerPushSubscription({ ...VALID, p256dh: "" });

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("listPushDevices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ id: "u1" });
    mockSelectEq.mockResolvedValue({
      data: [
        {
          endpoint: "https://push.example/abc",
          user_agent: "Mozilla/5.0",
          created_at: "2026-08-10T10:00:00Z",
        },
      ],
      error: null,
    });
  });

  it("renvoie les appareils de l'utilisatrice", async () => {
    const devices = await listPushDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].endpoint).toBe("https://push.example/abc");
  });

  it("renvoie une liste vide sans session", async () => {
    getSessionUser.mockResolvedValue(null);
    expect(await listPushDevices()).toEqual([]);
  });
});

describe("removePushDevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ id: "u1" });
    mockDeleteMatch.mockResolvedValue({ error: null });
  });

  it("ne supprime que dans ses propres appareils", async () => {
    expect(await removePushDevice("https://push.example/abc")).toEqual({
      success: true,
    });
    // Le filtre porte sur l'endpoint ET sur l'utilisatrice : sans le second,
    // connaitre un endpoint suffirait a desabonner autrui.
    expect(mockDeleteMatch).toHaveBeenCalledWith({
      endpoint: "https://push.example/abc",
      user_id: "u1",
    });
  });

  it("refuse sans session", async () => {
    getSessionUser.mockResolvedValue(null);

    expect(await removePushDevice("https://push.example/abc")).toEqual({
      success: false,
      error: "Non authentifié",
    });
    expect(mockDeleteMatch).not.toHaveBeenCalled();
  });
});

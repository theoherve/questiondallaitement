import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();
const mockHeaders = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: (...a: unknown[]) => mockRpc(...a) }),
}));

vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

import { rateLimit, AUTH_RATE_LIMITS } from "./rate-limit";

const withIp = (ip: string | null) => {
  mockHeaders.mockResolvedValue({
    get: (name: string) =>
      name === "x-forwarded-for" ? ip : null,
  });
};

const allow = (remaining = 4) =>
  mockRpc.mockResolvedValue({
    data: [
      {
        allowed: true,
        remaining,
        reset_at: new Date(Date.now() + 300_000).toISOString(),
      },
    ],
    error: null,
  });

describe("rateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withIp("203.0.113.7");
    allow();
  });

  it("interroge la base avec la cle, la limite et la fenetre", async () => {
    // L'etat doit etre partage entre instances : c'est tout l'objet de 5-1.
    // Un compteur local repartirait a zero a chaque demarrage a froid et
    // serait multiplie par le nombre d'instances.
    await rateLimit(AUTH_RATE_LIMITS.login);

    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "login:203.0.113.7",
      p_limit: AUTH_RATE_LIMITS.login.limit,
      p_window_seconds: AUTH_RATE_LIMITS.login.windowSeconds,
    });
  });

  it("laisse passer sous la limite", async () => {
    const result = await rateLimit(AUTH_RATE_LIMITS.login);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("bloque au-dela de la limite", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          allowed: false,
          remaining: 0,
          reset_at: new Date(Date.now() + 120_000).toISOString(),
        },
      ],
      error: null,
    });

    const result = await rateLimit(AUTH_RATE_LIMITS.login);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("separe les compteurs par prefixe", async () => {
    // Sinon une reinitialisation de mot de passe consommerait le quota de
    // connexion de la meme personne.
    await rateLimit(AUTH_RATE_LIMITS.login);
    await rateLimit(AUTH_RATE_LIMITS.forgotPassword);

    const keys = mockRpc.mock.calls.map((c) => c[1].p_key);
    expect(keys).toEqual([
      "login:203.0.113.7",
      "forgot-password:203.0.113.7",
    ]);
  });

  it("ne retient que la premiere adresse de x-forwarded-for", async () => {
    // L'en-tete accumule les proxies. Prendre la chaine entiere donnerait une
    // cle differente selon le chemin reseau, et la limite ne mordrait plus.
    withIp("203.0.113.7, 70.41.3.18, 150.172.238.178");

    await rateLimit(AUTH_RATE_LIMITS.login);

    expect(mockRpc.mock.calls[0][1].p_key).toBe("login:203.0.113.7");
  });

  it("laisse passer si la base ne repond pas", async () => {
    // Choix assume : bloquer sur une panne verrouillerait la connexion pour
    // tout le monde. Et la connexion interroge de toute facon la base juste
    // apres — si elle est tombee, rien ne fonctionne. On trace bruyamment.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRpc.mockResolvedValue({ data: null, error: { message: "timeout" } });

    const result = await rateLimit(AUTH_RATE_LIMITS.login);

    expect(result.success).toBe(true);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("compte les requetes sans adresse identifiable sur une meme cle", async () => {
    withIp(null);

    await rateLimit(AUTH_RATE_LIMITS.login);

    expect(mockRpc.mock.calls[0][1].p_key).toBe("login:unknown");
  });
});

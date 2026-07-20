import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const updateCalls: Array<{ table: string; values: Record<string, unknown> }> = [];
let profileRow: Record<string, unknown> | null = null;

const makeChain = (table: string): Record<string, unknown> => {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    update: vi.fn((values: Record<string, unknown>) => {
      updateCalls.push({ table, values });
      return chain;
    }),
    maybeSingle: vi.fn(() => Promise.resolve({ data: profileRow, error: null })),
    single: vi.fn(() => Promise.resolve({ data: profileRow, error: null })),
  };
  // Thenable : `update().eq()` est await-e sans terminateur.
  (chain as { then?: unknown }).then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(onFulfilled);
  return chain;
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (table: string) => makeChain(table) }),
}));

vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));

// `actions.ts` importe AuthError depuis next-auth, dont le chargement reel
// tire next/server et casse hors runtime Next.
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

vi.mock("@/lib/emails/send", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

vi.mock("@/lib/brevo/sync", () => ({ syncOnSignup: vi.fn() }));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  AUTH_RATE_LIMITS: {},
}));

/** `redirect()` interrompt le flux en levant : on reproduit ce contrat. */
const REDIRECT = "NEXT_REDIRECT";
const redirects: string[] = [];

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirects.push(url);
    throw new Error(REDIRECT);
  },
}));

import { handleResetPassword } from "./actions";

const runResetPassword = async (formData: FormData) => {
  try {
    await handleResetPassword(formData);
  } catch (err) {
    if ((err as Error).message !== REDIRECT) throw err;
  }
};

const makeForm = (): FormData => {
  const form = new FormData();
  form.set("token", "a".repeat(64));
  form.set("password", "MotDePasse123!");
  form.set("confirm_password", "MotDePasse123!");
  return form;
};

describe("resetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCalls.length = 0;
    redirects.length = 0;
    profileRow = {
      id: "profil-1",
      password_reset_expires: new Date(Date.now() + 3600_000).toISOString(),
    };
  });

  it("marque l'adresse comme verifiee en posant le mot de passe", async () => {
    // Une invitee arrive ici par un lien envoye a son adresse : cliquer dessus
    // prouve qu'elle la controle. Sans ce drapeau, `handleLogin` la renvoie sur
    // « Veuillez confirmer votre adresse email » — un email de confirmation
    // qu'elle n'a jamais recu, puisque le compte a ete cree pour elle. Le
    // parcours invitee se terminait donc en cul-de-sac meme lien valide.
    await runResetPassword(makeForm());

    const update = updateCalls.find((c) => c.table === "profiles");
    expect(update).toBeDefined();
    expect(update!.values.email_verified).toBe(true);
  });

  it("consomme le token et enregistre le mot de passe", async () => {
    await runResetPassword(makeForm());

    const update = updateCalls.find((c) => c.table === "profiles")!;
    expect(update.values.password_hash).toEqual(expect.any(String));
    expect(update.values.password_hash).not.toBe("MotDePasse123!");
    // Un token rejouable permettrait de reprendre le compte plus tard.
    expect(update.values.password_reset_token).toBeNull();
    expect(update.values.password_reset_expires).toBeNull();
  });

  it("refuse un token expire sans toucher au profil", async () => {
    profileRow = {
      id: "profil-1",
      password_reset_expires: new Date(Date.now() - 1000).toISOString(),
    };

    await runResetPassword(makeForm());

    expect(updateCalls).toHaveLength(0);
    expect(redirects.join()).toContain("expir");
  });

  it("refuse un token inconnu sans toucher au profil", async () => {
    profileRow = null;

    await runResetPassword(makeForm());

    expect(updateCalls).toHaveLength(0);
  });
});

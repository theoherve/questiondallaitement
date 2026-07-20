import { describe, it, expect, vi, beforeEach } from "vitest";

// next-auth ne se resout pas dans l'env node de Vitest (il importe next/server).
// On rejoue la hierarchie AuthError -> CredentialsSignin : actions.ts importe
// AuthError depuis le meme specifier, donc l'instanceof reste valide.
const { AuthError, CredentialsSignin } = vi.hoisted(() => {
  class AuthError extends Error {}
  class CredentialsSignin extends AuthError {
    type = "CredentialsSignin";
  }
  return { AuthError, CredentialsSignin };
});

vi.mock("next-auth", () => ({ AuthError, CredentialsSignin }));

const signIn = vi.fn();
const redirect = vi.fn((url: string) => {
  const err = new Error("NEXT_REDIRECT") as Error & { digest: string };
  err.digest = `NEXT_REDIRECT;replace;${url};`;
  throw err;
});

let profileRow: Record<string, unknown> | null = null;

vi.mock("@/auth", () => ({ signIn, signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
  AUTH_RATE_LIMITS: { login: {} },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            maybeSingle: async () => ({ data: profileRow, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

const { handleLogin } = await import("./actions");

const loginForm = (email: string, password: string) => {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
};

const redirectedTo = () => redirect.mock.calls.at(-1)?.[0] as string;

describe("handleLogin", () => {
  beforeEach(() => {
    redirect.mockClear();
    signIn.mockReset();
    profileRow = {
      id: "u1",
      first_name: "Alice",
      email_verified: true,
      password_hash: "$2a$10$hash",
      password_reset_token: null,
      password_reset_expires: null,
      wix_contact_id: null,
    };
  });

  it("redirects with an error message when signIn throws CredentialsSignin", async () => {
    signIn.mockRejectedValue(new CredentialsSignin());

    await expect(
      handleLogin(loginForm("alice@example.com", "wrong-password")),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectedTo()).toContain("/connexion?error=");
    expect(redirectedTo()).toContain(encodeURIComponent("Email ou mot de passe incorrect"));
  });

  it("redirects to the espace client on success", async () => {
    signIn.mockResolvedValue(undefined);

    await expect(
      handleLogin(loginForm("alice@example.com", "good-password")),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectedTo()).toBe("/espace-client");
  });
});

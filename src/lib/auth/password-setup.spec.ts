import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendGuestAccountEmail = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/emails/send", () => ({
  sendGuestAccountEmail: (...args: unknown[]) => mockSendGuestAccountEmail(...args),
}));

vi.mock("@/config/site", () => ({
  siteConfig: { url: "https://exemple.test" },
}));

import {
  createPasswordSetupUrl,
  sendGuestSetupEmailIfNeeded,
  PASSWORD_SETUP_EXPIRY_HOURS,
} from "./password-setup";

/** Supabase minimal : capture l'update et repond sans erreur. */
const makeSupabase = () => {
  const updates: Array<{ table: string; values: Record<string, unknown>; id: string }> = [];

  const client = {
    updates,
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => ({
        eq: (_column: string, id: string) => {
          updates.push({ table, values, id });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  };

  return client;
};

describe("createPasswordSetupUrl", () => {
  it("pose un token sur le profil et le porte dans l'URL", async () => {
    const supabase = makeSupabase();

    const url = await createPasswordSetupUrl(supabase, "profil-1");

    expect(supabase.updates).toHaveLength(1);
    const [update] = supabase.updates;
    expect(update.table).toBe("profiles");
    expect(update.id).toBe("profil-1");

    const token = update.values.password_reset_token as string;

    // `resetPassword` cherche le profil par `password_reset_token`. Une URL qui
    // ne porte pas ce token exact renvoie « Lien invalide » — c'etait le bug :
    // l'email guest pointait sur /reset-password?email=..., que la page ignore.
    expect(url).toBe(`https://exemple.test/reset-password?token=${token}`);
  });

  it("produit un token imprevisible", async () => {
    // Un token devinable laisserait prendre la main sur le compte d'une cliente
    // dont on connait l'email.
    const first = makeSupabase();
    const second = makeSupabase();

    await createPasswordSetupUrl(first, "profil-1");
    await createPasswordSetupUrl(second, "profil-1");

    const tokenOf = (s: ReturnType<typeof makeSupabase>) =>
      s.updates[0].values.password_reset_token as string;

    expect(tokenOf(first)).not.toBe(tokenOf(second));
    expect(tokenOf(first)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("date l'expiration a l'horizon annonce", async () => {
    const supabase = makeSupabase();
    const before = Date.now();

    await createPasswordSetupUrl(supabase, "profil-1");

    const expires = new Date(
      supabase.updates[0].values.password_reset_expires as string,
    ).getTime();
    const expected = before + PASSWORD_SETUP_EXPIRY_HOURS * 3600 * 1000;

    expect(Math.abs(expires - expected)).toBeLessThan(5_000);
  });
});

describe("sendGuestSetupEmailIfNeeded", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envoie le lien de creation de mot de passe a un compte sans mot de passe", async () => {
    const supabase = makeSupabase();

    await sendGuestSetupEmailIfNeeded(supabase, {
      id: "profil-1",
      email: "invitee@test.fr",
      first_name: "Camille",
      password_hash: null,
    });

    expect(mockSendGuestAccountEmail).toHaveBeenCalledTimes(1);
    const [to, variables] = mockSendGuestAccountEmail.mock.calls[0];
    expect(to).toBe("invitee@test.fr");
    expect(variables.client_name).toBe("Camille");
    expect(variables.setup_url).toContain("/reset-password?token=");
  });

  it("ne renvoie rien a une cliente qui a deja un mot de passe", async () => {
    const supabase = makeSupabase();

    await sendGuestSetupEmailIfNeeded(supabase, {
      id: "profil-1",
      email: "cliente@test.fr",
      first_name: "Marie",
      password_hash: "$2a$10$deja-defini",
    });

    expect(mockSendGuestAccountEmail).not.toHaveBeenCalled();
    // Surtout : ne pas invalider le token d'une reinitialisation en cours.
    expect(supabase.updates).toHaveLength(0);
  });

  it("ne tente rien sans adresse email", async () => {
    const supabase = makeSupabase();

    await sendGuestSetupEmailIfNeeded(supabase, {
      id: "profil-1",
      email: null,
      first_name: "Camille",
      password_hash: null,
    });

    expect(mockSendGuestAccountEmail).not.toHaveBeenCalled();
  });

  it("n'echoue pas quand l'envoi d'email casse", async () => {
    // L'email est accessoire : le paiement est encaisse et la reservation
    // existe. Laisser remonter l'erreur ferait echouer le webhook, que Stripe
    // rejouerait ensuite en boucle.
    mockSendGuestAccountEmail.mockRejectedValueOnce(new Error("Resend HS"));
    const supabase = makeSupabase();

    await expect(
      sendGuestSetupEmailIfNeeded(supabase, {
        id: "profil-1",
        email: "invitee@test.fr",
        first_name: "Camille",
        password_hash: null,
      }),
    ).resolves.toBeUndefined();
  });
});

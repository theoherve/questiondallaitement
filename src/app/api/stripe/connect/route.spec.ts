import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

let consultantRow: Record<string, unknown> | null = null;

const mockFrom = vi.fn(() => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() =>
      Promise.resolve({ data: consultantRow, error: null }),
    ),
  };
  return chain;
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const mockGetSessionUser = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
  // Reimplemente plutot que mocke : c'est la regle d'autorisation elle-meme
  // qu'on veut voir a l'oeuvre, pas un booleen force par le test.
  hasAnyRole: (
    user: { roles?: string[] } | null,
    roles: string[],
  ): boolean => !!user && roles.some((r) => user.roles?.includes(r)),
}));

const mockCreateConnectAccount = vi.fn();
const mockCreateAccountLink = vi.fn();

vi.mock("@/lib/stripe/connect", () => ({
  createConnectAccount: (...args: unknown[]) =>
    mockCreateConnectAccount(...args),
  createAccountLink: (...args: unknown[]) => mockCreateAccountLink(...args),
}));

import { GET } from "./route";

const CONSULTANT_ID = "consultant-uuid-001";

const asConsultant = () => {
  mockGetSessionUser.mockResolvedValue({
    id: CONSULTANT_ID,
    email: "c@test.fr",
    roles: ["consultant"],
  });
  consultantRow = { id: CONSULTANT_ID, stripe_account_id: "acct_existant" };
};

describe("GET /api/stripe/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consultantRow = null;
    process.env.NEXT_PUBLIC_APP_URL = "https://exemple.test";
    mockCreateAccountLink.mockResolvedValue({
      url: "https://connect.stripe.com/setup/abc",
    });
    mockCreateConnectAccount.mockResolvedValue({ id: "acct_nouveau" });
  });

  it("redirige vers le lien d'onboarding Stripe", async () => {
    asConsultant();

    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://connect.stripe.com/setup/abc",
    );
  });

  it("reutilise le compte Connect existant", async () => {
    // Sans cela, chaque passage creerait un compte Express de plus — et la
    // sandbox en porte deja deux, orphelins, jamais finalises.
    asConsultant();

    await GET();

    expect(mockCreateConnectAccount).not.toHaveBeenCalled();
    expect(mockCreateAccountLink).toHaveBeenCalledWith(
      "acct_existant",
      expect.stringContaining("stripe=refresh"),
      expect.stringContaining("stripe=success"),
    );
  });

  it("cree le compte a la premiere visite", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: CONSULTANT_ID,
      email: "c@test.fr",
      roles: ["consultant"],
    });
    consultantRow = { id: CONSULTANT_ID, stripe_account_id: null };

    await GET();

    expect(mockCreateConnectAccount).toHaveBeenCalledWith(
      CONSULTANT_ID,
      "c@test.fr",
    );
    expect(mockCreateAccountLink).toHaveBeenCalledWith(
      "acct_nouveau",
      expect.any(String),
      expect.any(String),
    );
  });

  it("refuse un visiteur anonyme", async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockCreateConnectAccount).not.toHaveBeenCalled();
  });

  it("refuse un compte sans le role consultante", async () => {
    // La ligne `consultants` peut survivre a une retrogradation. Se contenter
    // de la trouver reviendrait a rouvrir un onboarding de paiement a
    // quelqu'un qui n'est plus consultante.
    mockGetSessionUser.mockResolvedValue({
      id: CONSULTANT_ID,
      email: "c@test.fr",
      roles: ["client"],
    });
    consultantRow = { id: CONSULTANT_ID, stripe_account_id: null };

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mockCreateConnectAccount).not.toHaveBeenCalled();
  });

  it("renvoie 404 quand aucune fiche consultante n'existe", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: CONSULTANT_ID,
      email: "c@test.fr",
      roles: ["consultant"],
    });
    consultantRow = null;

    const response = await GET();

    expect(response.status).toBe(404);
  });

  it("echoue proprement quand Stripe refuse", async () => {
    // Sans capture, l'exception remonte en page d'erreur 500 : la consultante
    // clique sur « connecter mon compte » et tombe sur un ecran illisible,
    // sans rien a rapporter.
    asConsultant();
    mockCreateAccountLink.mockRejectedValue(new Error("Stripe indisponible"));

    const response = await GET();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.any(String),
    });
  });

  it("refuse de construire des URL de retour invalides", async () => {
    // `NEXT_PUBLIC_APP_URL!` non renseignee produisait des liens
    // « undefined/espace-consultante… » que Stripe rejette avec un message
    // sans rapport avec la cause.
    asConsultant();
    delete process.env.NEXT_PUBLIC_APP_URL;

    const response = await GET();

    expect(response.status).toBe(500);
    expect(mockCreateAccountLink).not.toHaveBeenCalled();
  });
});

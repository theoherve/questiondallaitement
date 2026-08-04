import { describe, it, expect, vi, beforeEach } from "vitest";

// `server-only` interdit l'import hors composant serveur ; sous vitest il n'y a
// pas de graphe de rendu, donc on le neutralise.
vi.mock("server-only", () => ({}));

const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

const buildChain = () => ({
  select: mockSelect,
  update: mockUpdate,
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => buildChain() }),
}));

const mockRemoveContactFromList = vi.fn();
vi.mock("@/lib/brevo/client", () => ({
  removeContactFromList: (...args: unknown[]) => mockRemoveContactFromList(...args),
  addContactToList: vi.fn(),
}));

vi.mock("@/lib/url", () => ({ baseUrl: () => "https://example.test" }));

import { findSubscriberByToken, unsubscribeByToken } from "./unsubscribe";

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue(buildChain());
  mockEq.mockReturnValue(buildChain());
  mockUpdate.mockReturnValue(buildChain());
  mockRemoveContactFromList.mockResolvedValue({ ok: true, status: 201 });
});

describe("findSubscriberByToken", () => {
  /**
   * La garantie qui compte. Cette fonction sert le rendu de la page de
   * desinscription, et les passerelles de securite prechargent les liens des
   * emails : en recette, une adresse professionnelle a ete desinscrite vingt
   * secondes apres reception, sans clic humain. Afficher la page ne doit donc
   * jamais rien modifier.
   */
  it("ne modifie rien", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { first_name: "Margaux", unsubscribed_at: null },
      error: null,
    });

    const result = await findSubscriberByToken("jeton");

    expect(result).toEqual({
      status: "found",
      firstName: "Margaux",
      alreadyUnsubscribed: false,
    });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRemoveContactFromList).not.toHaveBeenCalled();
  });

  it("signale une désinscription déjà faite sans la refaire", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { first_name: "Margaux", unsubscribed_at: "2026-08-01T10:00:00Z" },
      error: null,
    });

    const result = await findSubscriberByToken("jeton");

    expect(result).toMatchObject({ alreadyUnsubscribed: true });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("refuse un jeton inconnu", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    expect(await findSubscriberByToken("inconnu")).toEqual({
      status: "unknown_token",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("unsubscribeByToken", () => {
  it("désinscrit et retire le contact de la liste Brevo", async () => {
    vi.stubEnv("BREVO_LIST_ID_NEWSLETTER", "4");
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "abc",
        email: "margaux@example.com",
        first_name: "Margaux",
        unsubscribed_at: null,
      },
      error: null,
    });

    const result = await unsubscribeByToken("jeton");

    expect(result).toMatchObject({ status: "unsubscribed", firstName: "Margaux" });
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockRemoveContactFromList).toHaveBeenCalledWith(
      "margaux@example.com",
      4,
    );
  });

  it("n'écrase pas la date d'une désinscription déjà enregistrée", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "abc",
        email: "margaux@example.com",
        first_name: "Margaux",
        unsubscribed_at: "2026-08-01T10:00:00Z",
      },
      error: null,
    });

    const result = await unsubscribeByToken("jeton");

    expect(result).toMatchObject({ status: "already_unsubscribed" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

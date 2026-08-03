import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

const buildChain = () => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
});

const mockFrom = vi.fn(() => buildChain());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRenderBlockEmail = vi.fn();
vi.mock("@/lib/emails/render-block-email", () => ({
  renderBlockEmail: (...args: unknown[]) => mockRenderBlockEmail(...args),
}));

import {
  restoreTemplateDesign,
  restoreDefaultTemplates,
  createMissingTemplates,
  deleteTemplate,
} from "./actions";
import { DEFAULT_TEMPLATE_DESIGNS } from "@/lib/emails/default-template-designs";
import { getSessionUser } from "@/lib/auth";

const ADMIN = { id: "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5", roles: ["admin"] };
const TEMPLATE_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

const setAuth = (user: unknown) => {
  vi.mocked(getSessionUser).mockResolvedValue(user as never);
};

beforeEach(() => {
  vi.clearAllMocks();
  // Fluent defaults — chain-returning methods yield the chain, resolvers yield
  // empty results so tests override only what they assert on.
  mockSelect.mockReturnValue(buildChain());
  mockEq.mockReturnValue(buildChain());
  mockInsert.mockReturnValue(buildChain());
  mockUpdate.mockReturnValue(buildChain());
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockRenderBlockEmail.mockResolvedValue("<html>rendered</html>");
  setAuth(ADMIN);
});

// ─── Role guard ───────────────────────────────────────────────

describe("restoreTemplateDesign — guard", () => {
  it("redirige si utilisateur non authentifié", async () => {
    setAuth(null);
    await expect(restoreTemplateDesign("welcome")).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
  });

  it("redirige un non-admin", async () => {
    setAuth({ id: "c", roles: ["client"] });
    await expect(restoreTemplateDesign("welcome")).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
  });
});

// ─── restoreTemplateDesign ────────────────────────────────────

describe("restoreTemplateDesign", () => {
  it("refuse un nom sans design par défaut", async () => {
    const result = await restoreTemplateDesign("nom-inconnu");
    expect(result).toEqual({
      success: false,
      error: "Aucun design par défaut pour ce template.",
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("met à jour la ligne existante quand le template existe", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: TEMPLATE_ID },
      error: null,
    });
    // update().eq() returns { error: null } after the last eq
    mockEq.mockImplementationOnce(() => buildChain()) // select().eq("name",...)
      .mockImplementationOnce(() => ({ error: null })); // update().eq("id",...)

    const result = await restoreTemplateDesign("welcome");

    expect(result).toEqual({ success: true, data: { id: TEMPLATE_ID } });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockInsert).not.toHaveBeenCalled();

    const payload = mockUpdate.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: "welcome",
      subject: "Bienvenue sur Question d'Allaitement",
      body_html: "<html>rendered</html>",
      variables: ["client_name", "dashboard_url"],
      type: "transactional",
    });
    expect(payload.body_design).toBeDefined();
  });

  it("insère une nouvelle ligne quand le template n'existe pas encore", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSingle.mockResolvedValueOnce({
      data: { id: "new-id" },
      error: null,
    });

    const result = await restoreTemplateDesign("welcome");

    expect(result).toEqual({ success: true, data: { id: "new-id" } });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      name: "welcome",
      type: "transactional",
    });
  });

  it("retourne une erreur quand l'update échoue", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: TEMPLATE_ID },
      error: null,
    });
    mockEq
      .mockImplementationOnce(() => buildChain())
      .mockImplementationOnce(() => ({ error: { message: "db down" } }));

    const result = await restoreTemplateDesign("welcome");

    expect(result).toEqual({
      success: false,
      error: "Erreur lors de la restauration.",
    });
  });

  it("retourne une erreur quand l'insert échoue", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "constraint violation" },
    });

    const result = await restoreTemplateDesign("welcome");

    expect(result).toEqual({
      success: false,
      error: "Erreur lors de la restauration.",
    });
  });
});

// ─── restoreDefaultTemplates ──────────────────────────────────

describe("restoreDefaultTemplates", () => {
  it("itère sur chaque design par défaut et compte les succès", async () => {
    // Every lookup finds an existing row, every update succeeds.
    mockMaybeSingle.mockResolvedValue({
      data: { id: TEMPLATE_ID },
      error: null,
    });
    mockEq.mockImplementation(() => {
      // Alternates: select().eq(name,...) returns chain, update().eq(id,...) returns { error:null }
      // Simplest: always return a value that satisfies both paths.
      return Object.assign(buildChain(), { error: null });
    });

    const result = await restoreDefaultTemplates();

    const expectedCount = Object.keys(DEFAULT_TEMPLATE_DESIGNS).length;
    expect(result).toEqual({
      success: true,
      data: { updated: expectedCount },
    });
    expect(mockRenderBlockEmail).toHaveBeenCalledTimes(expectedCount);
  });
});

// ─── createMissingTemplates ───────────────────────────────────

describe("createMissingTemplates", () => {
  /**
   * L'interet de cette action est entierement dans ce qu'elle ne fait pas :
   * reclamer un template absent ne doit couter aucune retouche sur les autres.
   */
  it("n'insère que les templates absents et ne touche jamais aux existants", async () => {
    const names = Object.keys(DEFAULT_TEMPLATE_DESIGNS);
    const missing = names[0];
    const alreadyThere = names.slice(1).map((name) => ({ name }));

    mockSelect.mockResolvedValue({ data: alreadyThere, error: null });
    mockInsert.mockResolvedValue({ error: null });

    const result = await createMissingTemplates();

    expect(result).toEqual({ success: true, data: { created: [missing] } });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0]).toMatchObject({ name: missing });
    // Aucun UPDATE : c'est la garantie qui distingue cette action de
    // restoreDefaultTemplates.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("ne fait rien quand tous les templates existent déjà", async () => {
    mockSelect.mockResolvedValue({
      data: Object.keys(DEFAULT_TEMPLATE_DESIGNS).map((name) => ({ name })),
      error: null,
    });

    const result = await createMissingTemplates();

    expect(result).toEqual({ success: true, data: { created: [] } });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ─── deleteTemplate — protection des templates requis (6-4) ───

describe("deleteTemplate", () => {
  const mockDelete = vi.fn();

  const templateNamed = (name: string) => {
    mockSingle.mockResolvedValue({ data: { name }, error: null });
    mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom.mockReturnValue({ ...buildChain(), delete: mockDelete });
  };

  it("refuse de supprimer un template dont le code depend", async () => {
    templateNamed("booking_confirmation");

    const result = await deleteTemplate(TEMPLATE_ID);

    expect(result.success).toBe(false);
    // Le message doit nommer ce qui casserait : « suppression interdite »
    // laisserait chercher pourquoi.
    expect(result.error).toContain("confirmation de réservation");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("laisse supprimer un template marketing cree par l'admin", async () => {
    templateNamed("campagne_de_noel");

    const result = await deleteTemplate(TEMPLATE_ID);

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });

  it("refuse quand le template est introuvable plutot que de supprimer a l'aveugle", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({ ...buildChain(), delete: mockDelete });

    const result = await deleteTemplate(TEMPLATE_ID);

    expect(result.success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

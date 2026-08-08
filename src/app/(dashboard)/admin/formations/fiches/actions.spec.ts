import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: async () => ({ id: "admin-1", roles: ["admin"] }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import {
  createFormationTemplate,
  updateFormationTemplate,
  deleteFormationTemplate,
} from "./actions";

/**
 * Chaine Supabase minimale : chaque methode renvoie la chaine, `single`
 * resout le resultat fourni, et l'objet est thenable pour les appels qui
 * n'ont pas de `single` (le `update(...).eq(...)`, le `select` compte).
 */
const createChain = (result: {
  data?: unknown;
  error?: unknown;
  count?: number;
}) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "insert", "update", "delete"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const validInput = {
  title: "Allaitement maternel, les indispensables",
  slug: "allaitement-maternel-les-indispensables",
  category: "formation" as const,
};

beforeEach(() => {
  mockFrom.mockReset();
});

describe("createFormationTemplate", () => {
  it("persiste les quatre sections editoriales", async () => {
    const chain = createChain({ data: { id: "template-1" } });
    mockFrom.mockReturnValue(chain);

    const result = await createFormationTemplate({
      ...validInput,
      summary_html: "<p>Trois points cles</p>",
      objectives_html: "<ul><li>Reperer une prise inefficace</li></ul>",
      program_html: "<ol><li>Module un</li></ol>",
      audience_html: "<p>Sages-femmes</p>",
    });

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        summary_html: "<p>Trois points cles</p>",
        program_html: "<ol><li>Module un</li></ol>",
      }),
    );
  });

  it("ramene une section vidée a null pour laisser l'heritage jouer", async () => {
    const chain = createChain({ data: { id: "template-1" } });
    mockFrom.mockReturnValue(chain);

    await createFormationTemplate({ ...validInput, summary_html: "<p></p>" });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ summary_html: null }),
    );
  });

  it("refuse un slug invalide", async () => {
    const result = await createFormationTemplate({
      ...validInput,
      slug: "Slug Invalide",
    });

    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("updateFormationTemplate", () => {
  it("met a jour et revalide les sessions rattachees", async () => {
    // Deux appels : l'update de la fiche, puis la lecture des slugs.
    mockFrom
      .mockReturnValueOnce(createChain({ error: null }))
      .mockReturnValueOnce(createChain({ data: [{ slug: "session-1" }] }));

    const result = await updateFormationTemplate("template-1", validInput);

    expect(result.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("formations");
  });
});

describe("deleteFormationTemplate", () => {
  it("refuse tant que des sessions utilisent la fiche", async () => {
    mockFrom.mockReturnValue(createChain({ count: 3 }));

    const result = await deleteFormationTemplate("template-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("3 session(s)");
  });

  it("supprime une fiche orpheline", async () => {
    const countChain = createChain({ count: 0 });
    const deleteChain = createChain({ error: null });
    mockFrom.mockReturnValueOnce(countChain).mockReturnValueOnce(deleteChain);

    const result = await deleteFormationTemplate("template-1");

    expect(result.success).toBe(true);
    expect(deleteChain.delete).toHaveBeenCalled();
  });
});

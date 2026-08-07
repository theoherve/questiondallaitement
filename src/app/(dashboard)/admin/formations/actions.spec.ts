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

import { createFormation, updateFormation } from "./actions";

/**
 * Chaine Supabase minimale : chaque methode renvoie la chaine, `single`
 * resout le resultat fourni, et l'objet est thenable pour les appels sans
 * `single` (le `update(...).eq(...)` de `updateFormation`).
 */
const createChain = (result: { data?: unknown; error?: unknown }) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "insert", "update"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
};

const validInput = {
  title: "Formation allaitement",
  slug: "formation-allaitement",
  description: "Une phrase.",
  type: "online" as const,
  starts_at: "2026-09-01T09:00:00.000Z",
  ends_at: "2026-09-01T17:00:00.000Z",
  price_cents: 12000,
  currency: "eur",
  show_price: true,
  consultant_id: "11111111-1111-4111-8111-111111111111",
  is_published: false,
};

beforeEach(() => {
  mockFrom.mockReset();
});

describe("createFormation", () => {
  it("persiste les quatre sections editoriales", async () => {
    const chain = createChain({ data: { id: "formation-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    const result = await createFormation({
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
        objectives_html: "<ul><li>Reperer une prise inefficace</li></ul>",
        program_html: "<ol><li>Module un</li></ol>",
        audience_html: "<p>Sages-femmes</p>",
      }),
    );
  });

  it("normalise un resume vide en null", async () => {
    const chain = createChain({ data: { id: "formation-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    await createFormation({ ...validInput, summary_html: "<p></p>" });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ summary_html: null }),
    );
  });

  it("ne garde que les reperes du catalogue, dans son ordre", async () => {
    const chain = createChain({ data: { id: "formation-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    await createFormation({
      ...validInput,
      highlights: ["ibclc", "repere-invente", "elearning"],
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ highlights: ["elearning", "ibclc"] }),
    );
  });

  it("persiste l'image de couverture", async () => {
    const chain = createChain({ data: { id: "formation-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    await createFormation({
      ...validInput,
      thumbnail_url: "https://exemple.fr/couverture.jpg",
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnail_url: "https://exemple.fr/couverture.jpg",
      }),
    );
  });

  it("accepte une formation d'une seule journee sans horaire", async () => {
    const chain = createChain({ data: { id: "formation-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    // Sans heure, les deux bornes tombent le meme jour : la contrainte
    // « fin apres debut » ne doit pas rejeter ce cas.
    const result = await createFormation({
      ...validInput,
      starts_at: "2026-09-01T00:00:00.000Z",
      ends_at: "2026-09-01T21:59:00.000Z",
      show_time: false,
    });

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ show_time: false }),
    );
  });

  it("marque l'horaire comme affichable par defaut", async () => {
    const chain = createChain({ data: { id: "formation-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    await createFormation(validInput);

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ show_time: true }),
    );
  });

  it("accepte une formation sans aucune section", async () => {
    const chain = createChain({ data: { id: "formation-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    const result = await createFormation(validInput);

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        summary_html: null,
        objectives_html: null,
        program_html: null,
        audience_html: null,
        highlights: [],
      }),
    );
  });
});

describe("updateFormation", () => {
  it("persiste les quatre sections editoriales", async () => {
    const chain = createChain({ data: { slug: "ancien-slug" } });
    mockFrom.mockReturnValue(chain);

    const result = await updateFormation("formation-1", {
      ...validInput,
      summary_html: "<p>Resume mis a jour</p>",
      objectives_html: "<ul><li>Objectif mis a jour</li></ul>",
      program_html: "<ol><li>Module mis a jour</li></ol>",
      audience_html: "<p>Public mis a jour</p>",
    });

    expect(result.success).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        summary_html: "<p>Resume mis a jour</p>",
        objectives_html: "<ul><li>Objectif mis a jour</li></ul>",
        program_html: "<ol><li>Module mis a jour</li></ol>",
        audience_html: "<p>Public mis a jour</p>",
      }),
    );
  });
});

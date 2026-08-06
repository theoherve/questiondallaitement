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

import { createEvent, updateEvent } from "./actions";

/**
 * Chaine Supabase minimale : chaque methode renvoie la chaine, `single`
 * resout le resultat fourni, et l'objet est thenable pour les appels sans
 * `single` (le `update(...).eq(...)` de `updateEvent`).
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

describe("createEvent", () => {
  it("persiste summary_html et long_description", async () => {
    const chain = createChain({ data: { id: "event-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    const result = await createEvent({
      ...validInput,
      summary_html: "<p>Trois points cles</p>",
      long_description: "<p>Le programme detaille</p>",
    });

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        summary_html: "<p>Trois points cles</p>",
        long_description: "<p>Le programme detaille</p>",
      }),
    );
  });

  it("normalise un resume vide en null", async () => {
    const chain = createChain({ data: { id: "event-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    await createEvent({ ...validInput, summary_html: "<p></p>" });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ summary_html: null }),
    );
  });

  it("accepte un evenement sans resume", async () => {
    const chain = createChain({ data: { id: "event-1", slug: validInput.slug } });
    mockFrom.mockReturnValue(chain);

    const result = await createEvent(validInput);

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ summary_html: null, long_description: null }),
    );
  });
});

describe("updateEvent", () => {
  it("persiste summary_html et long_description", async () => {
    const chain = createChain({ data: { slug: "ancien-slug" } });
    mockFrom.mockReturnValue(chain);

    const result = await updateEvent("event-1", {
      ...validInput,
      summary_html: "<p>Resume mis a jour</p>",
      long_description: "<p>Programme mis a jour</p>",
    });

    expect(result.success).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        summary_html: "<p>Resume mis a jour</p>",
        long_description: "<p>Programme mis a jour</p>",
      }),
    );
  });
});

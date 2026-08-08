import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

const buildChain = () => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
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

import {
  createBioLink,
  updateBioLink,
  reorderBioLinks,
} from "./actions";
import { getSessionUser } from "@/lib/auth";

const ADMIN = { id: "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5", roles: ["admin"] };
const LINK_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const OTHER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

const setAuth = (user: unknown) => {
  vi.mocked(getSessionUser).mockResolvedValue(user as never);
};

const validLink = {
  kind: "link" as const,
  title: "Je me prépare à allaiter",
  subtitle: null,
  url: "https://exemple.fr/page",
  thumbnail_url: null,
  is_featured: false,
  is_active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue(buildChain());
  // `.eq()` clôt les chaînes d'écriture (`update().eq()`, `delete().eq()`) :
  // c'est lui qui porte le résultat attendu par les actions.
  mockEq.mockResolvedValue({ data: null, error: null });
  mockInsert.mockReturnValue(buildChain());
  mockUpdate.mockReturnValue(buildChain());
  mockDelete.mockReturnValue(buildChain());
  mockOrder.mockReturnValue(buildChain());
  mockLimit.mockReturnValue(buildChain());
  mockSingle.mockResolvedValue({ data: { id: LINK_ID }, error: null });
  mockMaybeSingle.mockResolvedValue({ data: { position: 40 }, error: null });
  setAuth(ADMIN);
});

describe("createBioLink", () => {
  it("refuse un lien sans adresse et désigne le champ fautif", async () => {
    const result = await createBioLink({ ...validLink, url: "" });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.url).toBe("L'adresse est requise pour un lien");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("refuse une adresse qui n'est ni absolue ni un chemin du site", async () => {
    const result = await createBioLink({ ...validLink, url: "exemple.fr" });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.url).toContain("https://");
  });

  it("accepte un chemin interne", async () => {
    const result = await createBioLink({ ...validLink, url: "/accompagnements" });

    expect(result.success).toBe(true);
  });

  it("place la nouvelle entrée après la dernière", async () => {
    await createBioLink(validLink);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ position: 50 }),
    );
  });

  it("crée une rubrique sans adresse, et la vide de tout attribut de lien", async () => {
    const result = await createBioLink({
      ...validLink,
      kind: "header",
      title: "Mes livres",
      url: "https://exemple.fr/ignoré",
      thumbnail_url: "/liens/ignorée.png",
      is_featured: true,
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "header",
        url: null,
        thumbnail_url: null,
        is_featured: false,
      }),
    );
  });

  it("refuse un titre vide", async () => {
    const result = await createBioLink({ ...validLink, title: "   " });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.title).toBe("Le titre est requis");
  });

  it("redirige un utilisateur non administrateur", async () => {
    setAuth({ id: "u1", roles: ["client"] });

    await expect(createBioLink(validLink)).rejects.toThrow(
      "NEXT_REDIRECT:/connexion",
    );
  });
});

describe("updateBioLink", () => {
  it("enregistre les modifications valides", async () => {
    const result = await updateBioLink(LINK_ID, validLink);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ title: validLink.title }),
    );
  });
});

describe("reorderBioLinks", () => {
  it("numérote les positions par pas de dix, dans l'ordre reçu", async () => {
    const result = await reorderBioLinks([LINK_ID, OTHER_ID]);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenNthCalledWith(1, { position: 10 });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { position: 20 });
  });

  it("refuse une liste d'identifiants invalides", async () => {
    const result = await reorderBioLinks(["pas-un-uuid"]);

    expect(result.success).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("signale l'échec si une écriture échoue", async () => {
    mockEq.mockResolvedValueOnce({ error: null });
    mockEq.mockResolvedValueOnce({ error: { message: "boom" } });

    const result = await reorderBioLinks([LINK_ID, OTHER_ID]);

    expect(result.success).toBe(false);
  });
});

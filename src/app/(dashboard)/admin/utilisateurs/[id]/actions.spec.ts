import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockIs = vi.fn();
const mockEq = vi.fn();
const mockContains = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockUpsert = vi.fn();
const mockNot = vi.fn();
const mockRpc = vi.fn();
const mockGenerateLink = vi.fn();

const buildChain = () => ({
  select: mockSelect,
  update: mockUpdate,
  insert: mockInsert,
  delete: mockDelete,
  upsert: mockUpsert,
  eq: mockEq,
  is: mockIs,
  not: mockNot,
  contains: mockContains,
  single: mockSingle,
  rpc: mockRpc,
});

const mockFrom = vi.fn(() => buildChain());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
    auth: { admin: { generateLink: mockGenerateLink } },
  }),
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
  updateUserProfile,
  resetUserPassword,
  toggleUserBan,
  exportUserData,
  adminAssignTag,
  adminRemoveTag,
  adminCreateNote,
  adminDeleteNote,
} from "./actions";
import { getSessionUser } from "@/lib/auth";

const ADMIN_USER = { id: "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5", roles: ["admin"] };
const VALID_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const VALID_UUID_2 = "6ba7b810-9dad-41d0-80b4-00c04fd430c8";

// ─── Helper: build FormData ──────────────────────────────────

const buildFormData = (data: Record<string, string | string[]>): FormData => {
  const fd = new FormData();
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      for (const v of val) fd.append(key, v);
    } else {
      fd.append(key, val);
    }
  }
  return fd;
};

// ─── Setup ───────────────────────────────────────────────────

const setupAdminAuth = () => {
  vi.mocked(getSessionUser).mockResolvedValue(ADMIN_USER as never);
};

const setupChain = () => {
  // Default: chain methods return themselves for fluent API
  mockSelect.mockReturnValue({ eq: mockEq, order: vi.fn().mockReturnValue({ data: [] }) });
  mockEq.mockReturnValue({ is: mockIs, single: mockSingle, eq: mockEq, select: mockSelect });
  mockIs.mockReturnValue({ eq: mockEq, single: mockSingle, data: [] });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockInsert.mockResolvedValue({ error: null });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockUpsert.mockResolvedValue({ error: null });
  mockSingle.mockResolvedValue({ data: null, error: null });
};

beforeEach(() => {
  vi.clearAllMocks();
  setupAdminAuth();
  setupChain();
});

// ─── updateUserProfile ───────────────────────────────────────

describe("updateUserProfile", () => {
  it("rejette un UUID invalide", async () => {
    const fd = buildFormData({
      userId: "not-a-uuid",
      first_name: "Test",
      last_name: "User",
      roles: ["client"],
    });

    const result = await updateUserProfile(fd);

    expect(result).toEqual({ success: false, error: "Utilisateur invalide" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejette quand aucun rôle sélectionné", async () => {
    const fd = buildFormData({
      userId: VALID_UUID,
      first_name: "Test",
      last_name: "User",
    });

    const result = await updateUserProfile(fd);

    expect(result).toEqual({ success: false, error: "Au moins un rôle requis" });
  });

  it("met à jour le profil avec des données valides", async () => {
    // Chain: update().eq().is() → { error: null }
    mockIs.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });

    const fd = buildFormData({
      userId: VALID_UUID,
      first_name: "Jean",
      last_name: "Dupont",
      phone: "0612345678",
      roles: ["client", "admin"],
    });

    const result = await updateUserProfile(fd);

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith("profiles");
  });

  it("redirige si pas admin", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const fd = buildFormData({
      userId: VALID_UUID,
      roles: ["client"],
    });

    await expect(updateUserProfile(fd)).rejects.toThrow("NEXT_REDIRECT:/connexion");
  });
});

// ─── resetUserPassword ───────────────────────────────────────

describe("resetUserPassword", () => {
  it("rejette un UUID invalide", async () => {
    const result = await resetUserPassword("bad-id");

    expect(result).toEqual({ success: false, error: "Utilisateur invalide" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("retourne erreur si utilisateur introuvable", async () => {
    mockSingle.mockResolvedValue({ data: null });

    const result = await resetUserPassword(VALID_UUID);

    expect(result).toEqual({ success: false, error: "Utilisateur introuvable" });
  });

  it("retourne succès si le lien est généré", async () => {
    mockSingle.mockResolvedValue({ data: { email: "test@example.com" } });
    mockGenerateLink.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });

    const result = await resetUserPassword(VALID_UUID);

    expect(result.success).toBe(true);
    expect(result.data?.message).toContain("test@example.com");
  });
});

// ─── toggleUserBan ───────────────────────────────────────────

describe("toggleUserBan", () => {
  it("rejette un UUID invalide", async () => {
    const result = await toggleUserBan("invalid", true);

    expect(result).toEqual({ success: false, error: "Utilisateur invalide" });
  });

  it("empêche un admin de se bannir lui-même", async () => {
    const result = await toggleUserBan(ADMIN_USER.id, true);

    expect(result).toEqual({
      success: false,
      error: "Vous ne pouvez pas vous bannir",
    });
  });

  it("empêche de bannir le dernier admin", async () => {
    // First call: from("profiles").select("roles").eq().single() → admin user
    // Second call: from("profiles").select("id", {count}).contains().is() → count=1
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // select("roles") → .eq().single()
        return { eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { roles: ["admin"] } }) }) };
      }
      // select("id", {count, head}) → .contains().is()
      return { contains: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ count: 1 }) }) };
    });

    const result = await toggleUserBan(VALID_UUID, true);

    expect(result).toEqual({
      success: false,
      error: "Impossible de bannir le dernier administrateur.",
    });
  });
});

// ─── exportUserData ──────────────────────────────────────────

describe("exportUserData", () => {
  it("rejette un UUID invalide", async () => {
    const result = await exportUserData("nope");

    expect(result).toEqual({ success: false, error: "Utilisateur invalide" });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ─── adminAssignTag ──────────────────────────────────────────

describe("adminAssignTag", () => {
  it("rejette si clientId invalide", async () => {
    const result = await adminAssignTag("bad", VALID_UUID);

    expect(result).toEqual({ success: false, error: "Identifiant invalide" });
  });

  it("rejette si tagId invalide", async () => {
    const result = await adminAssignTag(VALID_UUID, "bad");

    expect(result).toEqual({ success: false, error: "Identifiant invalide" });
  });

  it("réussit avec des UUIDs valides", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const result = await adminAssignTag(VALID_UUID, VALID_UUID_2);

    expect(result).toEqual({ success: true });
  });
});

// ─── adminRemoveTag ──────────────────────────────────────────

describe("adminRemoveTag", () => {
  it("rejette si un UUID invalide", async () => {
    const result = await adminRemoveTag("bad", VALID_UUID, VALID_UUID_2);

    expect(result).toEqual({ success: false, error: "Identifiant invalide" });
  });
});

// ─── adminCreateNote ─────────────────────────────────────────

describe("adminCreateNote", () => {
  it("rejette si clientId invalide", async () => {
    const result = await adminCreateNote("bad", "content");

    expect(result).toEqual({ success: false, error: "Identifiant invalide" });
  });

  it("rejette si contenu vide", async () => {
    const result = await adminCreateNote(VALID_UUID, "   ");

    expect(result).toEqual({ success: false, error: "Le contenu est requis" });
  });
});

// ─── adminDeleteNote ─────────────────────────────────────────

describe("adminDeleteNote", () => {
  it("rejette si noteId invalide", async () => {
    const result = await adminDeleteNote("bad", VALID_UUID);

    expect(result).toEqual({ success: false, error: "Identifiant invalide" });
  });

  it("rejette si clientId invalide", async () => {
    const result = await adminDeleteNote(VALID_UUID, "bad");

    expect(result).toEqual({ success: false, error: "Identifiant invalide" });
  });
});

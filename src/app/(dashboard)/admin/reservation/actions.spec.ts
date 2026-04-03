import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSelectAfterEq = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}));

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

import { getLocationConfigs, updateLocationConfig } from "./actions";
import { getSessionUser } from "@/lib/auth";

// ─── getLocationConfigs ───────────────────────────────────────

describe("getLocationConfigs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: null });
    mockSelect.mockReturnValue({ order: mockOrder });
  });

  it("retourne les données quand la requête réussit", async () => {
    const rows = [
      { location_type: "cabinet", label: "Au cabinet", sort_order: 1 },
      { location_type: "teleconsultation", label: "Téléconsultation", sort_order: 2 },
    ];
    mockOrder.mockResolvedValue({ data: rows });

    const result = await getLocationConfigs();

    expect(result).toEqual(rows);
    expect(mockFrom).toHaveBeenCalledWith("location_configs");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockOrder).toHaveBeenCalledWith("sort_order");
  });

  it("retourne [] quand data est null (table vide ou erreur)", async () => {
    mockOrder.mockResolvedValue({ data: null });

    const result = await getLocationConfigs();

    expect(result).toEqual([]);
  });
});

// ─── updateLocationConfig ─────────────────────────────────────

describe("updateLocationConfig", () => {
  const validFormData = {
    label: "Au cabinet",
    description: "En personne",
    address: "9 Rue Collette",
    city: "Paris",
    postal_code: "75017",
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Chain: .update().eq().select() → { error: null, count: 1 }
    mockSelectAfterEq.mockResolvedValue({ error: null, count: 1 });
    mockEq.mockReturnValue({ select: mockSelectAfterEq });
    mockUpdate.mockReturnValue({ eq: mockEq });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "admin-id",
      roles: ["admin"],
    } as never);
  });

  it("retourne { success: true } quand la mise à jour réussit", async () => {
    const result = await updateLocationConfig("cabinet", validFormData);

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith("location_configs");
    expect(mockUpdate).toHaveBeenCalledWith({
      label: "Au cabinet",
      description: "En personne",
      address: "9 Rue Collette",
      city: "Paris",
      postal_code: "75017",
      is_active: true,
    });
    expect(mockEq).toHaveBeenCalledWith("location_type", "cabinet");
    expect(mockSelectAfterEq).toHaveBeenCalledWith("location_type", { count: "exact", head: true });
  });

  it("retourne { success: false, error } quand Supabase retourne une erreur", async () => {
    mockSelectAfterEq.mockResolvedValue({ error: { message: "DB error" }, count: null });

    const result = await updateLocationConfig("teleconsultation", validFormData);

    expect(result).toEqual({ success: false, error: "DB error" });
  });

  it("retourne { success: false } quand aucune ligne n'est affectée (type introuvable)", async () => {
    mockSelectAfterEq.mockResolvedValue({ error: null, count: 0 });

    const result = await updateLocationConfig("cabinet", validFormData);

    expect(result).toEqual({ success: false, error: "Type de lieu introuvable" });
  });

  it("redirige vers /admin si l'utilisateur n'est pas admin", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user-id",
      roles: ["consultant"],
    } as never);

    await expect(updateLocationConfig("cabinet", validFormData)).rejects.toThrow(
      "NEXT_REDIRECT:/admin"
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("redirige vers /admin si getSessionUser retourne null", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    await expect(updateLocationConfig("cabinet", validFormData)).rejects.toThrow(
      "NEXT_REDIRECT:/admin"
    );
  });

  it("convertit les champs vides en null pour description, address, city, postal_code", async () => {
    const emptyData = {
      label: "Téléconsultation",
      description: "",
      address: "",
      city: "",
      postal_code: "",
      is_active: false,
    };

    await updateLocationConfig("teleconsultation", emptyData);

    expect(mockUpdate).toHaveBeenCalledWith({
      label: "Téléconsultation",
      description: null,
      address: null,
      city: null,
      postal_code: null,
      is_active: false,
    });
  });
});

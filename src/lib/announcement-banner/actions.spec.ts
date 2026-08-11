import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSessionUser, mockGetAnnouncementBanner, mockSaveAnnouncementBanner, insertMock, fromMock } =
  vi.hoisted(() => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    return {
      mockGetSessionUser: vi.fn(),
      mockGetAnnouncementBanner: vi.fn(),
      mockSaveAnnouncementBanner: vi.fn(),
      insertMock,
      fromMock: vi.fn(() => ({ insert: insertMock })),
    };
  });

vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/announcement-banner/store", async () => {
  const actual = await vi.importActual<typeof import("./store")>("./store");
  return {
    ...actual,
    getAnnouncementBanner: mockGetAnnouncementBanner,
    saveAnnouncementBanner: mockSaveAnnouncementBanner,
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  getAnnouncementBannerAction,
  updateAnnouncementBannerAction,
} from "./actions";
import { DEFAULT_ANNOUNCEMENT_BANNER } from "./store";

const validInput = {
  enabled: true,
  message: "Nouveau site en ligne !",
  link_url: "",
  link_label: "",
  start_date: null,
  end_date: null,
};

describe("announcement-banner actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({ id: "admin-1", email: "a@b.fr", roles: ["admin"] });
    mockGetAnnouncementBanner.mockResolvedValue({ ...DEFAULT_ANNOUNCEMENT_BANNER, message: "Promo" });
    mockSaveAnnouncementBanner.mockResolvedValue({ error: null });
  });

  it("renvoie le defaut sans session admin sur getAnnouncementBannerAction", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const result = await getAnnouncementBannerAction();
    expect(result).toEqual(DEFAULT_ANNOUNCEMENT_BANNER);
    expect(mockGetAnnouncementBanner).not.toHaveBeenCalled();
  });

  it("renvoie le bandeau courant pour un admin", async () => {
    const result = await getAnnouncementBannerAction();
    expect(result.message).toBe("Promo");
  });

  it("refuse la mise a jour sans session admin", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "c1", email: "c@b.fr", roles: ["client"] });
    const result = await updateAnnouncementBannerAction(validInput);
    expect(result).toEqual({ success: false, error: "Non autorisé" });
    expect(mockSaveAnnouncementBanner).not.toHaveBeenCalled();
  });

  it("refuse des donnees invalides", async () => {
    const result = await updateAnnouncementBannerAction({ ...validInput, message: "" });
    expect(result.success).toBe(false);
    expect(mockSaveAnnouncementBanner).not.toHaveBeenCalled();
  });

  it("sauvegarde un bandeau valide, journalise, et invalide le cache", async () => {
    const result = await updateAnnouncementBannerAction(validInput);
    expect(result).toEqual({ success: true });
    expect(mockSaveAnnouncementBanner).toHaveBeenCalledWith(validInput);
    expect(fromMock).toHaveBeenCalledWith("audit_logs");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "announcement_banner_updated", user_id: "admin-1" }),
    );
  });

  it("renvoie l'erreur de sauvegarde si l'upsert echoue", async () => {
    mockSaveAnnouncementBanner.mockResolvedValue({ error: "Erreur lors de l'enregistrement du bandeau." });
    const result = await updateAnnouncementBannerAction(validInput);
    expect(result).toEqual({ success: false, error: "Erreur lors de l'enregistrement du bandeau." });
  });
});

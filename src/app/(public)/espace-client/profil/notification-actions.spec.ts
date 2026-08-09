import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpsert, mockGetSessionUser } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockGetSessionUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ upsert: mockUpsert }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setNotificationPreference } from "./notification-actions";

describe("setNotificationPreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    mockGetSessionUser.mockResolvedValue({
      id: "u1",
      email: "a@b.fr",
      roles: ["client"],
    });
  });

  it("refuse sans session", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const result = await setNotificationPreference("replays", "email", false);
    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("enregistre l'écart pour l'utilisatrice connectée", async () => {
    const result = await setNotificationPreference("replays", "email", false);

    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        category_key: "replays",
        channel: "email",
        enabled: false,
      }),
      { onConflict: "user_id,category_key,channel" }
    );
  });

  it("refuse de modifier une catégorie imposée", async () => {
    const result = await setNotificationPreference("paiements", "email", false);

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("refuse une catégorie inconnue", async () => {
    const result = await setNotificationPreference(
      "inexistante" as never,
      "email",
      false
    );

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("refuse un canal inconnu", async () => {
    const result = await setNotificationPreference(
      "replays",
      "sms" as never,
      false
    );

    expect(result.success).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

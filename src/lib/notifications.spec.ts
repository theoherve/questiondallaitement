import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { createNotification } from "./notifications";

// ─── createNotification ───────────────────────────────────────

describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it("insère une notification avec tous les paramètres", async () => {
    await createNotification(
      "user-123",
      "booking_confirmed",
      "Réservation confirmée",
      "Votre consultation a été confirmée.",
      { booking_id: "booking-abc" }
    );

    expect(mockFrom).toHaveBeenCalledWith("notifications");
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-123",
      type: "booking_confirmed",
      title: "Réservation confirmée",
      body: "Votre consultation a été confirmée.",
      metadata: { booking_id: "booking-abc" },
    });
  });

  it("insère avec body=null et metadata=null quand non fournis", async () => {
    await createNotification("user-456", "admin", "Message administratif");

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-456",
      type: "admin",
      title: "Message administratif",
      body: null,
      metadata: null,
    });
  });

  it("accepte les trois types de notifications", async () => {
    const types = ["booking_confirmed", "consultant_message", "admin"] as const;
    for (const type of types) {
      vi.clearAllMocks();
      mockInsert.mockResolvedValue({ error: null });
      await createNotification("user-1", type, "Titre");
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ type }));
    }
  });

  it("log l'erreur sans throw si Supabase retourne une erreur", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockResolvedValue({ error: { message: "DB error" } });

    await expect(
      createNotification("user-789", "admin", "Titre")
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("user-789"),
      expect.anything()
    );
    consoleSpy.mockRestore();
  });
});

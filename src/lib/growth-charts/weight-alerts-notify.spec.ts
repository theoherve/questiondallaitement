import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyWeightAlerts } from "./weight-alerts-notify";
import { notify, getRoleRecipients } from "@/lib/notifications";
import { computeWeightAlerts } from "./weight-alerts";

vi.mock("@/lib/notifications", () => ({
  notify: vi.fn(),
  getRoleRecipients: vi.fn(),
}));

vi.mock("./weight-alerts", async () => {
  const actual = await vi.importActual<typeof import("./weight-alerts")>(
    "./weight-alerts",
  );
  return { ...actual, computeWeightAlerts: vi.fn(actual.computeWeightAlerts) };
});

const child = {
  id: "child-1",
  first_name: "Léo",
  client_id: "client-1",
  birth_date: "2026-01-01",
  sex: "female" as const,
  is_premature: false,
  gestational_age_weeks: null,
  birth_weight_grams: 3200,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRoleRecipients).mockResolvedValue([
    { userId: "consultant-1", email: "carole@example.com" },
  ]);
  vi.mocked(notify).mockResolvedValue(undefined);
});

describe("notifyWeightAlerts", () => {
  it("n'appelle pas notify quand aucune alerte n'est active", async () => {
    const alerts = await notifyWeightAlerts(child, [
      { id: "m1", measured_at: "2026-01-05", weight_grams: 3190 },
    ]);
    expect(alerts).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifie chaque alerte active avec un dedupeId stable par mesure et règle", async () => {
    const alerts = await notifyWeightAlerts(child, [
      { id: "m1", measured_at: "2026-01-05", weight_grams: 2900 }, // -9.4%, vigilance
    ]);
    expect(alerts.map((a) => a.rule)).toContain("loss_vigilance");
    expect(notify).toHaveBeenCalledWith(
      "weight_alert_vigilance",
      [{ userId: "consultant-1", email: "carole@example.com" }],
      {
        childId: "child-1",
        childName: "Léo",
        clientId: "client-1",
        message: expect.stringContaining("Perte de poids à surveiller"),
      },
      { dedupeId: "child-1:loss_vigilance:m1" },
    );
  });

  it("résout avec un tableau vide et ne lève pas si le calcul des alertes échoue", async () => {
    vi.mocked(computeWeightAlerts).mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const alerts = await notifyWeightAlerts(child, [
      { id: "m1", measured_at: "2026-01-05", weight_grams: 2900 },
    ]);

    expect(alerts).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
  });
});

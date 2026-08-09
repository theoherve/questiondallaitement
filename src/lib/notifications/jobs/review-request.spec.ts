import { describe, it, expect, vi, beforeEach } from "vitest";

const { notify, tableData, capturedFilters } = vi.hoisted(() => ({
  notify: vi.fn().mockResolvedValue(undefined),
  tableData: {} as Record<string, unknown[]>,
  capturedFilters: [] as { method: string; args: unknown[] }[],
}));

vi.mock("@/lib/notifications/notify", () => ({ notify }));

const makeChain = (table: string) => {
  const rows = tableData[table] ?? [];
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, error: null }),
  };
  return new Proxy(chain, {
    get: (target, prop) => {
      if (prop in target) return target[prop as string];
      return (...args: unknown[]) => {
        capturedFilters.push({ method: String(prop), args });
        return makeChain(table);
      };
    },
  });
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => makeChain(t) }),
}));

import { runReviewRequests } from "./review-request";

describe("runReviewRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFilters.length = 0;
    for (const k of Object.keys(tableData)) delete tableData[k];

    tableData.bookings = [
      {
        id: "book-1",
        client_id: "c1",
        profiles: {
          first_name: "Camille",
          email: "a@b.fr",
          notification_unsubscribe_token: "tok-1",
        },
      },
    ];
  });

  it("demande un avis pour une consultation honorée", async () => {
    const sent = await runReviewRequests();

    expect(sent).toBe(1);
    expect(notify).toHaveBeenCalledWith(
      "review_request",
      [
        expect.objectContaining({
          userId: "c1",
          email: "a@b.fr",
          unsubscribeToken: "tok-1",
        }),
      ],
      expect.objectContaining({
        booking_id: "book-1",
        client_name: "Camille",
      }),
      { dedupeId: "book-1" }
    );
  });

  it("pointe vers le formulaire d'avis Google, pas vers la liste", async () => {
    await runReviewRequests();

    const data = notify.mock.calls[0][2] as { review_url: string };
    expect(data.review_url).toContain("writereview");
    expect(data.review_url).toContain("placeid=");
  });

  it("ne retient que les consultations honorées", async () => {
    await runReviewRequests();

    const statusFilter = capturedFilters.find(
      (f) => f.method === "eq" && f.args[0] === "status"
    );
    expect(statusFilter?.args[1]).toBe("completed");
  });

  it("borne la recherche sur la journée d'il y a deux jours", async () => {
    await runReviewRequests();

    const gte = capturedFilters.find(
      (f) => f.method === "gte" && f.args[0] === "ends_at"
    );
    const lte = capturedFilters.find(
      (f) => f.method === "lte" && f.args[0] === "ends_at"
    );
    expect(gte).toBeDefined();
    expect(lte).toBeDefined();

    const spanMs =
      new Date(lte!.args[1] as string).getTime() -
      new Date(gte!.args[1] as string).getTime();
    // Une journee, a la milliseconde de fin pres.
    expect(spanMs).toBeGreaterThan(86_000_000);
    expect(spanMs).toBeLessThan(86_500_000);
  });

  it("ignore une réservation sans adresse email", async () => {
    tableData.bookings = [
      {
        id: "book-2",
        client_id: "c2",
        profiles: { first_name: "X", email: null },
      },
    ];

    expect(await runReviewRequests()).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("renvoie 0 sans consultation à traiter", async () => {
    tableData.bookings = [];

    expect(await runReviewRequests()).toBe(0);
  });
});

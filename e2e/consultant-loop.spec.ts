import { test, expect } from "@playwright/test";
import { db, guardTestMode } from "./helpers/env";
import { CLIENT_STATE, CONSULTANT_STATE } from "./helpers/session-state";

/** Fixtures — doivent rester alignees sur scripts/e2e/lib/fixtures.mjs. */
const CONSULTANT_ID = "e2e00000-0000-4000-8000-000000000200";
const CLIENT_ID = "e2e00000-0000-4000-8000-000000000100";
const CONSULTATION_TYPE_ID = "e2e00000-0000-4000-8000-000000000300";
const DURATION_OPTION_ID = "e2e00000-0000-4000-8000-000000000310";
const BOOKING_ID = "e2e00000-0000-4000-8000-000000000600";

/**
 * 4-1 — La consultante voit la reservation et la confirme.
 *
 * Une reservation payee en ligne arrive en `pending` : c'est la consultante qui
 * la confirme. Ce scenario couvre le maillon entre l'encaissement et le
 * rendez-vous reellement acte — jusqu'ici verifie nulle part.
 *
 * La reservation est posee directement en base plutot que via le wizard : le
 * chemin d'achat est deja couvert par 3-2, et le rejouer ici ferait dependre ce
 * test d'un parcours sans rapport avec ce qu'il verifie.
 */
test.describe("N3 — boucle consultante", () => {
  test.beforeAll(() => guardTestMode());

  test.beforeEach(async () => {
    const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    await db.from("bookings").delete().eq("id", BOOKING_ID);
    const { error } = await db.from("bookings").insert({
      id: BOOKING_ID,
      client_id: CLIENT_ID,
      consultant_id: CONSULTANT_ID,
      consultation_type_id: CONSULTATION_TYPE_ID,
      duration_option_id: DURATION_OPTION_ID,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "pending",
      location: "teleconsultation",
      payment_method: "online",
      reason: "Scenario N3 automatise.",
    });

    expect(error, `seed de la reservation : ${error?.message}`).toBeNull();
  });

  test.afterEach(async () => {
    await db.from("bookings").delete().eq("id", BOOKING_ID);
  });

  test.describe("connectee en consultante", () => {
    test.use({ storageState: CONSULTANT_STATE });

    test("voit la reservation en attente et la confirme", async ({ page }) => {
      await page.goto("/espace-consultante/reservations");

      const card = page.locator(
        `[data-testid="booking-card"][data-booking-id="${BOOKING_ID}"]`,
      );
      await expect(
        card,
        "la reservation en attente n'apparait pas dans l'espace consultante",
      ).toBeVisible();
      await expect(card).toHaveAttribute("data-status", "pending");

      await card.getByTestId("booking-confirm-action").click();

      // L'action revalide la page : la carte doit repasser en `confirmed` sans
      // rechargement manuel.
      await expect(card).toHaveAttribute("data-status", "confirmed");

      // Et la verite est en base, pas seulement a l'ecran.
      const { data: booking } = await db
        .from("bookings")
        .select("status")
        .eq("id", BOOKING_ID)
        .single();

      expect(booking!.status).toBe("confirmed");
    });
  });

  test.describe("connectee en cliente", () => {
    test.use({ storageState: CLIENT_STATE });

    test("est renvoyee hors de l'espace consultante", async ({ page }) => {
      // La protection vient du middleware, pas du layout : `ROLE_ROUTE_MAP`
      // reserve /espace-consultante aux roles consultant(_limited) et admin et
      // redirige les autres vers l'accueil. Le layout, lui, ne lit les roles
      // que pour composer la navigation.
      //
      // On verifie la redirection et pas seulement l'absence de carte : une
      // page qui plante rendrait « aucune carte » vrai sans rien prouver.
      await page.goto("/espace-consultante/reservations");

      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.locator(
          `[data-testid="booking-card"][data-booking-id="${BOOKING_ID}"]`,
        ),
      ).toHaveCount(0);

      const { data: booking } = await db
        .from("bookings")
        .select("status")
        .eq("id", BOOKING_ID)
        .single();

      expect(booking!.status).toBe("pending");
    });
  });
});

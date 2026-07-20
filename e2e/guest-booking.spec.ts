import { test, expect } from "@playwright/test";
import { db, guardTestMode } from "./helpers/env";
import { fillBookingWizard, E2E_CONSULTANT_ID } from "./helpers/booking-wizard";

/** Doit rester aligne sur GUEST_EMAIL de scripts/e2e/lib/fixtures.mjs. */
const GUEST_EMAIL = "e2e-guest@questiondallaitement.test";

/**
 * 3-3 + 3-5 — Reservation en invitee, payee sur place.
 *
 * Ces deux scenarios tiennent dans une seule passe parce que `on_site` est le
 * seul chemin ou tout se joue en synchrone : pas de Stripe, pas de webhook, la
 * reservation et le compte existent des le retour de `createBooking`. Le meme
 * parcours paye en ligne ne pourrait rien affirmer de plus au navigateur — le
 * compte est bien cree, mais son email de finalisation part du webhook, hors
 * de portee de N2.
 *
 * Supprime le profil invitee avant de commencer : sinon la deuxieme passe
 * emprunte le chemin « profil existant » et ne teste plus rien.
 */
test.describe("N2 — reservation en invitee (paiement sur place)", () => {
  test.beforeAll(() => guardTestMode());

  test.beforeEach(async () => {
    const { data: existing } = await db
      .from("profiles")
      .select("id")
      .eq("email", GUEST_EMAIL)
      .maybeSingle();

    if (existing) {
      await db.from("bookings").delete().eq("client_id", existing.id);
      await db.from("profiles").delete().eq("id", existing.id);
    }
  });

  test("cree le compte, la reservation, et un lien de mot de passe utilisable", async ({
    page,
  }) => {
    const slotStart = await fillBookingWizard(page, {
      location: "cabinet",
      paymentMethod: "on_site",
      contact: {
        first_name: "Invitee",
        last_name: "E2E",
        email: GUEST_EMAIL,
        phone: "0612345678",
        reason: "Scenario invitee automatise.",
      },
    });

    // on_site ne passe pas par Stripe : le wizard va droit a la confirmation.
    await page.waitForURL(/\/reserver\/confirmation\?booking_id=/, {
      timeout: 30_000,
    });

    const { data: profile } = await db
      .from("profiles")
      .select("id, roles, email_verified, password_hash, password_reset_token, password_reset_expires")
      .eq("email", GUEST_EMAIL)
      .single();

    expect(profile, "aucun profil cree pour l'invitee").not.toBeNull();
    expect(profile!.roles).toContain("client");
    expect(profile!.password_hash).toBeNull();

    // Le coeur du bug 3-3 : l'email de finalisation pointait sur
    // /reset-password?email=..., que la page ignore — elle ne lit que `token`.
    // Toutes les invitees recevaient donc « Lien invalide ». Le token doit
    // exister et etre encore valable.
    expect(
      profile!.password_reset_token,
      "aucun token de creation de mot de passe : le lien de l'email sera mort",
    ).toMatch(/^[0-9a-f]{64}$/);
    expect(
      new Date(profile!.password_reset_expires!).getTime(),
    ).toBeGreaterThan(Date.now());

    // Le compte part non verifie — c'est `handleResetPassword` qui le validera
    // quand elle suivra le lien. Si ce champ passait a true ici, la
    // verification par email ne voudrait plus rien dire.
    expect(profile!.email_verified).toBe(false);

    const { data: booking } = await db
      .from("bookings")
      .select("status, payment_method, location, starts_at, consultant_id")
      .eq("client_id", profile!.id)
      .single();

    expect(booking, "aucune reservation creee").not.toBeNull();
    // `pending` et non `confirmed` : la consultante encaisse sur place, c'est
    // elle qui confirmera.
    expect(booking!.status).toBe("pending");
    expect(booking!.payment_method).toBe("on_site");
    expect(booking!.location).toBe("cabinet");
    expect(booking!.consultant_id).toBe(E2E_CONSULTANT_ID);
    expect(new Date(booking!.starts_at).toISOString()).toBe(
      new Date(slotStart).toISOString(),
    );
  });

  test("refuse le paiement sur place en teleconsultation", async ({ page }) => {
    // Rien a encaisser en presentiel quand la consultation est a distance :
    // l'option ne doit pas etre proposee.
    await page.goto("/reserver");

    await page
      .getByTestId("step-service-option")
      .filter({ hasText: "Consultation E2E" })
      .click();
    await page.getByTestId("step-duration-option").first().click();
    await page
      .locator('[data-testid="step-location-option"][data-location="teleconsultation"]')
      .click();
    await page
      .locator(
        `[data-testid="step-consultant-option"][data-consultant-id="${E2E_CONSULTANT_ID}"]`,
      )
      .click();

    const openDays = page.locator(
      '[data-testid="step-calendar-day"][data-available="true"]',
    );
    await expect(openDays.first()).toBeVisible();

    const slot = page.getByTestId("step-calendar-slot").first();
    for (let i = 0; i < (await openDays.count()); i++) {
      await openDays.nth(i).click();
      const appeared = await slot
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (appeared) break;
    }
    await slot.click();

    await page.locator("#first_name").fill("Invitee");
    await page.locator("#last_name").fill("E2E");
    await page.locator("#email").fill(GUEST_EMAIL);
    await page.locator("#phone").fill("0612345678");
    await page.locator("#reason").fill("Scenario invitee automatise.");
    await page.getByRole("button", { name: /continuer|suivant/i }).click();

    await expect(
      page.locator('[data-testid="step-payment-option"][data-payment-method="on_site"]'),
    ).toHaveCount(0);
  });
});

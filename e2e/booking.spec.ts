import { test, expect } from "@playwright/test";
import { guardTestMode } from "./helpers/env";
import { getCheckoutSession, sessionIdFromUrl } from "./helpers/stripe";

/** Consultante fixture — doit rester aligne sur IDS.consultantProfile (N1). */
const E2E_CONSULTANT_ID = "e2e00000-0000-4000-8000-000000000200";

/**
 * 3-2 — Reservation A : le wizard complet jusqu'a Stripe Checkout.
 *
 * La suite s'arrete a la redirection et verifie la session cote API plutot que
 * de remplir le formulaire carte : le DOM de Checkout est hebergee par Stripe,
 * varie d'un run a l'autre et embarque hCaptcha — le piloter rend la suite
 * fragile sans rien couvrir de plus.
 *
 * Ce que ce test protege : tout le chemin applicatif jusqu'a l'argent, y compris
 * la construction de la session (montant, compte destinataire, commission).
 * Le fulfillment post-paiement est couvert par la suite N1, qui rejoue les
 * webhooks signes (`pnpm test:e2e:n1`).
 */
test.describe("N2 — reservation en ligne", () => {
  test.beforeAll(() => guardTestMode());

  test("wizard complet → session Checkout correctement construite", async ({
    page,
  }) => {
    await page.goto("/reserver");

    // Step 0 — service
    await page
      .getByTestId("step-service-option")
      .filter({ hasText: "Consultation E2E" })
      .click();

    // Step 1 — duree
    await page.getByTestId("step-duration-option").first().click();

    // Step 2 — lieu
    await page
      .locator('[data-testid="step-location-option"][data-location="teleconsultation"]')
      .click();

    // Step 3 — consultante : cibler la fixture, jamais .first().
    // Plusieurs consultantes existent en base et leur ordre n'est pas garanti ;
    // les autres n'ont pas de disponibilites, donc tomber sur l'une d'elles
    // vide le calendrier a l'etape suivante.
    await page
      .locator(
        `[data-testid="step-consultant-option"][data-consultant-id="${E2E_CONSULTANT_ID}"]`,
      )
      .click();

    // Step 4 — creneau : le jour d'abord, les horaires ne se chargent qu'ensuite.
    //
    // Un jour peut etre ouvert sans offrir de creneau : la fixture est disponible
    // de 9h a 18h, donc en fin de journee le jour meme n'a plus rien de libre.
    // On essaie les jours ouverts successivement plutot que de supposer que le
    // premier convient — sinon la suite passe le matin et tombe le soir.
    const openDays = page.locator(
      '[data-testid="step-calendar-day"][data-available="true"]',
    );
    await expect(openDays.first()).toBeVisible();

    const slot = page.getByTestId("step-calendar-slot").first();
    let slotStart: string | null = null;

    for (let i = 0; i < (await openDays.count()); i++) {
      await openDays.nth(i).click();
      // waitFor et non isVisible : isVisible() ne patiente pas (son timeout est
      // ignore), donc il repondrait faux avant meme le chargement des creneaux.
      const appeared = await slot
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (appeared) {
        slotStart = await slot.getAttribute("data-slot-start");
        break;
      }
    }

    expect(
      slotStart,
      `aucun creneau libre sur ${await openDays.count()} jour(s) ouvert(s) ` +
        `(jours: ${(await openDays.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.date))).join(", ")})`,
    ).not.toBeNull();
    await slot.click();

    // Step 5 — contact
    await page.locator("#first_name").fill("Camille");
    await page.locator("#last_name").fill("E2E");
    await page.locator("#email").fill("e2e-client@questiondallaitement.test");
    await page.locator("#phone").fill("0612345678");
    await page.locator("#reason").fill("Scenario E2E automatise.");
    await page.getByRole("button", { name: /continuer|suivant/i }).click();

    // Step 6 — paiement en ligne
    await page
      .locator('[data-testid="step-payment-option"][data-payment-method="online"]')
      .click();

    // Step 7 — confirmation
    await page.getByTestId("booking-confirm").click();

    // Le wizard rend ses erreurs serveur dans un role="alert" et reste sur place.
    // Sans ce garde-fou, l'echec remonte en "timeout de navigation", ce qui
    // masque la vraie cause (c'est ainsi que le bug PGRST201 s'etait deguise).
    const alert = page.getByTestId("booking-error");
    if (await alert.isVisible({ timeout: 3_000 }).catch(() => false)) {
      throw new Error(`createBooking a echoue : ${await alert.textContent()}`);
    }

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

    const session = await getCheckoutSession(sessionIdFromUrl(page.url()));

    expect(session.status).toBe("open");
    expect(session.currency).toBe("eur");
    expect(session.customer_email).toBe("e2e-client@questiondallaitement.test");

    // 80 € = prix de la fixture booking
    expect(session.amount_total).toBe(8000);

    // Les metadonnees pilotent le fulfillment cote webhook : si elles derivent,
    // le paiement aboutit mais rien ne se cree en base.
    expect(session.metadata.type).toBe("booking");
    expect(session.metadata.reference_id).toBeTruthy();
    expect(session.metadata.starts_at).toBe(slotStart);
    expect(Number(session.metadata.platform_fee_cents)).toBe(
      Math.round(8000 * 0.15),
    );
  });
});

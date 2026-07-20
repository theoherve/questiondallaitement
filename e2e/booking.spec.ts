import { test, expect } from "@playwright/test";
import { guardTestMode } from "./helpers/env";
import { fillBookingWizard } from "./helpers/booking-wizard";
import { getCheckoutSession, sessionIdFromUrl } from "./helpers/stripe";

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
    const slotStart = await fillBookingWizard(page, {
      location: "teleconsultation",
      paymentMethod: "online",
      contact: {
        first_name: "Camille",
        last_name: "E2E",
        email: "e2e-client@questiondallaitement.test",
        phone: "0612345678",
        reason: "Scenario E2E automatise.",
      },
    });

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

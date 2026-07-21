import { expect, type Page } from "@playwright/test";

/** Consultante fixture — doit rester aligne sur IDS.consultantProfile. */
export const E2E_CONSULTANT_ID = "e2e00000-0000-4000-8000-000000000200";

export type WizardContact = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reason: string;
};

export type WizardOptions = {
  location: "teleconsultation" | "cabinet" | "domicile";
  paymentMethod: "online" | "on_site";
  contact: WizardContact;
};

/**
 * Deroule les 8 etapes de `/reserver` jusqu'a la confirmation incluse.
 *
 * Renvoie le `data-slot-start` du creneau retenu : les appelants en ont besoin
 * pour verifier ce qui a ete envoye a Stripe ou enregistre en base.
 */
export const fillBookingWizard = async (
  page: Page,
  { location, paymentMethod, contact }: WizardOptions,
): Promise<string> => {
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
    .locator(`[data-testid="step-location-option"][data-location="${location}"]`)
    .click();

  // Step 3 — consultante : cibler la fixture, jamais .first().
  // Plusieurs consultantes existent en base et leur ordre n'est pas garanti ;
  // les autres n'ont pas de disponibilites, donc tomber sur l'une d'elles vide
  // le calendrier a l'etape suivante.
  await page
    .locator(
      `[data-testid="step-consultant-option"][data-consultant-id="${E2E_CONSULTANT_ID}"]`,
    )
    .click();

  // Step 4 — creneau : le jour d'abord, les horaires ne se chargent qu'ensuite.
  //
  // Un jour peut etre ouvert sans offrir de creneau : la fixture est disponible
  // de 9h a 18h, donc en fin de journee le jour meme n'a plus rien de libre. On
  // essaie les jours ouverts successivement plutot que de supposer que le
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
  await page.locator("#first_name").fill(contact.first_name);
  await page.locator("#last_name").fill(contact.last_name);
  await page.locator("#email").fill(contact.email);
  await page.locator("#phone").fill(contact.phone);
  await page.locator("#reason").fill(contact.reason);
  await page.getByRole("button", { name: /continuer|suivant/i }).click();

  // Step 6 — paiement
  await page
    .locator(
      `[data-testid="step-payment-option"][data-payment-method="${paymentMethod}"]`,
    )
    .click();

  // Step 7 — confirmation.
  //
  // La renonciation au droit de retractation n'apparait que pour une
  // consultation dans les quatorze jours. Le harnais prend toujours le premier
  // creneau libre, donc elle est presente en pratique — mais on ne la suppose
  // pas : un jour ou le calendrier n'offrirait que des dates lointaines, ce
  // `count()` evite un echec incomprehensible.
  const waiver = page.getByTestId("withdrawal-waiver");
  if ((await waiver.count()) > 0) {
    await waiver.check();
  }

  await page.getByTestId("booking-confirm").click();

  // Le wizard rend ses erreurs serveur dans un role="alert" et reste sur place.
  // Sans ce garde-fou, l'echec remonte en « timeout de navigation », ce qui
  // masque la vraie cause (c'est ainsi que le bug PGRST201 s'etait deguise).
  //
  // On sonde en boucle plutot qu'avec `isVisible({ timeout })` : ce dernier
  // ignore son timeout et repond immediatement, donc il ratait les erreurs
  // arrivant apres l'aller-retour serveur. Le garde-fou existait mais ne
  // servait a rien — c'est ce qui a masque l'absence de la table
  // `withdrawal_waivers`.
  const alert = page.getByTestId("booking-error");
  const startedAt = page.url();

  for (let i = 0; i < 20; i++) {
    if (await alert.isVisible().catch(() => false)) {
      throw new Error(`createBooking a echoue : ${await alert.textContent()}`);
    }
    // La navigation a commence : plus rien a attendre ici.
    if (page.url() !== startedAt) break;
    await page.waitForTimeout(250);
  }

  return slotStart as string;
};

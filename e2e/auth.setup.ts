import { test as setup } from "@playwright/test";
import { loginAsClient } from "./helpers/auth";
import { CLIENT_STATE, CONSULTANT_STATE } from "./helpers/session-state";

/**
 * Ouvre une session par role, une seule fois, et la range sur disque.
 *
 * `handleLogin` est protege par un rate limit de 5 tentatives par tranche de
 * 5 minutes. Une suite qui se reconnecte a chaque test le declenche : au
 * cinquieme scenario, la connexion echoue et les tests suivants tombent pour
 * une raison qui n'a rien a voir avec ce qu'ils verifient. Rejouer le
 * formulaire de connexion n'apprend d'ailleurs rien de plus — 3-3 le couvre
 * deja explicitement.
 */
const CLIENT_EMAIL = "e2e-client@questiondallaitement.test";
const CONSULTANT_EMAIL = "e2e-consultante@questiondallaitement.test";

setup("session cliente", async ({ page }) => {
  await loginAsClient(page, CLIENT_EMAIL);
  await page.context().storageState({ path: CLIENT_STATE });
});

setup("session consultante", async ({ page }) => {
  await loginAsClient(page, CONSULTANT_EMAIL);
  await page.context().storageState({ path: CONSULTANT_STATE });
});

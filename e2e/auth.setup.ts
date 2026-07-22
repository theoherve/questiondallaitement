import { test as setup } from "@playwright/test";
import { existsSync, statSync } from "node:fs";
import { loginAsClient } from "./helpers/auth";
import { CLIENT_STATE, CONSULTANT_STATE } from "./helpers/session-state";

/**
 * Duree pendant laquelle une session rangee sur disque est reutilisee telle
 * quelle, sans repasser par le formulaire.
 *
 * Depuis que le limiteur de debit est partage en base (5-1), il ne repart plus
 * a zero au redemarrage du serveur : deux connexions par passe suffisent a
 * epuiser les cinq tentatives autorisees en cinq minutes des la troisieme
 * execution. La suite devenait rouge pour une raison etrangere a ce qu'elle
 * teste — au moment meme ou la protection commencait a bien fonctionner.
 *
 * Les sessions NextAuth durent trente jours ; douze heures laissent une marge
 * confortable tout en garantissant qu'une session cassee ne survit pas a une
 * journee de travail.
 */
const SESSION_MAX_AGE_MS = 12 * 3600 * 1000;

const isFresh = (path: string): boolean => {
  if (!existsSync(path)) return false;
  return Date.now() - statSync(path).mtimeMs < SESSION_MAX_AGE_MS;
};

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
  if (isFresh(CLIENT_STATE)) return;
  await loginAsClient(page, CLIENT_EMAIL);
  await page.context().storageState({ path: CLIENT_STATE });
});

setup("session consultante", async ({ page }) => {
  if (isFresh(CONSULTANT_STATE)) return;
  await loginAsClient(page, CONSULTANT_EMAIL);
  await page.context().storageState({ path: CONSULTANT_STATE });
});

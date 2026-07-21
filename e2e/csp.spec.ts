import { test, expect } from "@playwright/test";
import { CLIENT_STATE } from "./helpers/session-state";

/**
 * 5-2 — La CSP ne doit rien casser.
 *
 * Une politique trop stricte ne fait pas d'erreur visible : elle bloque un
 * script, une police ou un appel reseau, et la page s'affiche simplement de
 * travers. Ce genre de degradation ne se voit qu'a l'usage, souvent apres la
 * mise en production.
 *
 * Ces scenarios parcourent les pages qui portent des dependances externes et
 * echouent sur la moindre violation signalee par le navigateur.
 */

/** Violations CSP et erreurs reseau bloquees, collectees pendant la visite. */
const collectViolations = (page: import("@playwright/test").Page) => {
  const violations: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (/Content Security Policy|Refused to (load|execute|connect|frame)/i.test(text)) {
      violations.push(text);
    }
  });

  return violations;
};

const PUBLIC_PAGES = [
  "/",
  "/reserver",
  "/accompagnements",
  "/accompagnements/accompagnement-e2e",
  "/connexion",
];

test.describe("N2 — Content-Security-Policy", () => {
  test("l'en-tete est bien servi", async ({ page }) => {
    const response = await page.goto("/");
    const csp = response?.headers()["content-security-policy"];

    expect(csp, "aucune CSP servie").toBeTruthy();
    // Les directives sur lesquelles repose vraiment la protection : si l'une
    // saute lors d'un remaniement, ce test le dit.
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("connect-src");
  });

  for (const path of PUBLIC_PAGES) {
    test(`aucune violation sur ${path}`, async ({ page }) => {
      const violations = collectViolations(page);

      await page.goto(path);
      await page.waitForLoadState("networkidle");

      expect(
        violations,
        `la CSP bloque des ressources sur ${path}`,
      ).toEqual([]);
    });
  }

  test.describe("cliente connectee", () => {
    test.use({ storageState: CLIENT_STATE });

    test("aucune violation dans l'espace client", async ({ page }) => {
      const violations = collectViolations(page);

      await page.goto("/espace-client");
      await page.waitForLoadState("networkidle");

      expect(violations).toEqual([]);
    });
  });

  test("le wizard de reservation reste utilisable", async ({ page }) => {
    // Le parcours d'achat est ce qu'une CSP mal posee casse en premier :
    // il enchaine appels serveur et redirection vers un domaine tiers.
    const violations = collectViolations(page);

    await page.goto("/reserver");
    await page
      .getByTestId("step-service-option")
      .filter({ hasText: "Consultation E2E" })
      .click();
    await page.getByTestId("step-duration-option").first().click();

    await expect(
      page.locator('[data-testid="step-location-option"]').first(),
    ).toBeVisible();
    expect(violations).toEqual([]);
  });
});

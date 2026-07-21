import { test, expect } from "@playwright/test";
import { db, guardTestMode } from "./helpers/env";
import { CLIENT_STATE } from "./helpers/session-state";
import { getCheckoutSession, sessionIdFromUrl } from "./helpers/stripe";

/** Fixtures — doivent rester alignees sur scripts/e2e/lib/fixtures.mjs. */
const FORMATION_ID = "e2e00000-0000-4000-8000-000000000400";
const FORMATION_SLUG = "accompagnement-e2e";
const CONSULTANT_ID = "e2e00000-0000-4000-8000-000000000200";
const CLIENT_EMAIL = "e2e-client@questiondallaitement.test";
const PRICE_CENTS = 9900;
const COMMISSION_RATE = 15;

/**
 * 3-4 — Achat d'accompagnement : le second flux d'argent du site.
 *
 * Contrairement a la reservation, cet achat exige un compte : `purchaseFormation`
 * refuse tout visiteur anonyme. La suite passe donc par le vrai formulaire de
 * connexion, ce qui couvre au passage le chemin `handleLogin` → NextAuth.
 *
 * Comme 3-2, on s'arrete a la redirection Stripe et on verifie la session cote
 * API : le DOM de Checkout est hebergee par Stripe et embarque hCaptcha. Le
 * fulfillment (creation de `formation_enrollments`) est couvert par N1, qui
 * rejoue le webhook signe.
 */
test.describe("N2 — achat d'accompagnement", () => {
  test.beforeAll(() => guardTestMode());

  test("visiteur anonyme : invite a se connecter, pas a payer", async ({
    browser,
  }) => {
    // Contexte neuf sans session : les autres scenarios de ce fichier partent
    // d'une cliente connectee.
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    // Ce n'est pas de la cosmetique : `purchaseFormation` rejette les anonymes.
    // Si la page affichait le bouton d'achat, la cliente cliquerait dans le vide.
    await page.goto(`/accompagnements/${FORMATION_SLUG}`);

    await expect(page.getByTestId("purchase-login-cta")).toBeVisible();
    await expect(page.getByTestId("purchase-button")).toHaveCount(0);
    // Pas de case non plus : rien a renoncer tant qu'on ne peut pas acheter.
    await expect(page.getByTestId("withdrawal-waiver")).toHaveCount(0);

    await context.close();
  });

  test.describe("cliente connectee", () => {
    test.use({ storageState: CLIENT_STATE });

    test("cliente connectee → session Checkout correctement construite", async ({
      page,
    }) => {
      await page.goto(`/accompagnements/${FORMATION_SLUG}`);

      // Le prix affiche vient de la meme colonne que celui envoye a Stripe :
      // s'ils divergent, la cliente paie autre chose que ce qu'elle a lu.
      await expect(page.getByText("99,00 €")).toBeVisible();

      await page.getByTestId("purchase-button").click();

      // `purchaseFormation` renvoie { success: false } sur six chemins distincts
      // (deja inscrite, accompagnement introuvable, Connect absent, erreur Stripe…)
      // et la page reste en place. Sans cette lecture, l'echec remonterait en
      // « timeout de navigation » et masquerait la cause — exactement la facon
      // dont le bug PGRST201 s'etait deguise en Phase 3.
      const alert = page.getByTestId("purchase-error");
      if (await alert.isVisible({ timeout: 3_000 }).catch(() => false)) {
        throw new Error(`purchaseFormation a echoue : ${await alert.textContent()}`);
      }

      await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

      const session = await getCheckoutSession(sessionIdFromUrl(page.url()));

      expect(session.status).toBe("open");
      expect(session.currency).toBe("eur");
      expect(session.amount_total).toBe(PRICE_CENTS);
      expect(session.customer_email).toBe(CLIENT_EMAIL);

      // Ces metadonnees pilotent le fulfillment : si elles derivent, le paiement
      // aboutit et l'inscription ne se cree jamais — la cliente a paye pour rien.
      expect(session.metadata.type).toBe("formation");
      expect(session.metadata.reference_id).toBe(FORMATION_ID);
      expect(Number(session.metadata.platform_fee_cents)).toBe(
        Math.round(PRICE_CENTS * (COMMISSION_RATE / 100)),
      );
    });

    test("consultante sans compte Connect : l'echec est affiche, pas avale", async ({
      page,
    }) => {
      // Scenario reel : une consultante publie un accompagnement avant d'avoir
      // termine son onboarding Stripe. La page s'affiche normalement, seul
      // l'achat echoue.
      //
      // Ce test existe aussi pour prouver que le garde-fou `purchase-error` des
      // autres scenarios n'est pas du code mort : sans lui, un `purchase-error`
      // jamais rendu les laisserait passer en silence.
      const { data: before, error: readError } = await db
        .from("consultants")
        .select("stripe_account_id")
        .eq("id", CONSULTANT_ID)
        .single();

      expect(readError, "fixture consultante introuvable").toBeNull();

      await db
        .from("consultants")
        .update({ stripe_account_id: null })
        .eq("id", CONSULTANT_ID);

      try {
        await page.goto(`/accompagnements/${FORMATION_SLUG}`);
        await page.getByTestId("purchase-button").click();

        await expect(page.getByTestId("purchase-error")).toHaveText(
          /paiement n'est pas disponible/i,
        );
        expect(page.url()).toContain(`/accompagnements/${FORMATION_SLUG}`);
      } finally {
        // Restauration hors du `expect` : un echec d'assertion laisserait sinon
        // la fixture cassee et ferait tomber tous les scenarios suivants.
        await db
          .from("consultants")
          .update({ stripe_account_id: before?.stripe_account_id ?? null })
          .eq("id", CONSULTANT_ID);
      }
    });
  });
});

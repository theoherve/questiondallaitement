/**
 * Scrape Wix member formations structure (sections + steps) into JSON.
 *
 * Prérequis:
 * - pnpm add -D playwright tsx
 * - Variables d'env: WIX_EMAIL, WIX_PASSWORD (non utilisées directement,
 *   la connexion se fait manuellement dans la fenêtre Chromium)
 *
 * Usage:
 *   npx tsx scripts/migration/scrape-wix-formations.ts wix-formations-full.json
 *
 * ─── Pourquoi ça plantait avant ────────────────────────────────────────────
 * Wix ne rend PAS les <li> des étapes dans le DOM tant que la section n'est
 * pas ouverte (lazy rendering React). Le script précédent utilisait
 * page.waitForTimeout(500) + getByRole("region") — mais le data-hook
 * "sidebar-layout-for-participant__stepsListTiles" n'apparaît qu'APRÈS le
 * clic ET après que React a fini de patcher le DOM.
 *
 * ─── Ce qui a changé ───────────────────────────────────────────────────────
 * 1. On cible les boutons par data-hook (stable) plutôt que par rôle ARIA.
 * 2. Après chaque clic on attend l'apparition du data-hook stepsListTiles
 *    dans la section correspondante via page.waitForFunction().
 * 3. On lit les titres des steps via le sélecteur CSS exact issu du DOM réel
 *    (p.sI2AXKc à l'intérieur de [data-hook="…stepsListTiles"]).
 * 4. On ferme chaque section après lecture pour éviter les conflits
 *    d'état si Wix ne permet qu'une section ouverte à la fois.
 */

import { existsSync, writeFileSync } from "fs";
import { chromium, type Page } from "playwright";
import { wixFormations } from "./wix-formations";

// ─── Types ──────────────────────────────────────────────────────────────────

type ScrapedStep = {
  id: string;
  title: string;
};

type ScrapedSection = {
  id: string;
  title: string;
  stepCount: number | null;
  steps: ScrapedStep[];
};

type ScrapedFormation = {
  slug: string;
  title: string;
  url: string;
  sections: ScrapedSection[];
};

// ─── Constantes ─────────────────────────────────────────────────────────────

const BASE_URL = "https://www.caroleherve.fr";

// Sélecteurs CSS stables basés sur data-hook (indépendants des class hachées)
const SEL = {
  accordionButton:
    '[data-hook="sidebar-layout-for-participant__sectionsListTiles__accordion-button"]',
  sectionTitle: ".sRnjeTL",
  sectionStepCount: ".sZoaSFJ",
  stepsListTiles:
    '[data-hook="sidebar-layout-for-participant__stepsListTiles"]',
  stepTitle: "p.sI2AXKc",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Scrape toutes les sections + steps d'une page participant-page déjà chargée.
 */
async function scrapeSections(page: Page): Promise<ScrapedSection[]> {
  const sections: ScrapedSection[] = [];

  // Récupère tous les boutons d'accordéon de sections
  const buttons = page.locator(SEL.accordionButton);
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);

    // Titre et stepCount depuis le label du bouton
    const rawTitle = await button.locator(SEL.sectionTitle).innerText();
    const rawStepCount = await button.locator(SEL.sectionStepCount).innerText();
    const title = rawTitle.trim();

    // "0/7 étapes" → 7
    const stepCountMatch = rawStepCount.match(/\/(\d+)/);
    const stepCount = stepCountMatch ? Number(stepCountMatch[1]) : null;

    // Récupère l'ID de la section depuis aria-controls
    const sectionId = (await button.getAttribute("aria-controls")) ?? "";

    // Si la section est déjà fermée, on l'ouvre
    const isExpanded = (await button.getAttribute("aria-expanded")) === "true";
    if (!isExpanded) {
      await button.click();
    }

    const steps: ScrapedStep[] = [];

    if (stepCount && stepCount > 0) {
      // Attendre que le contenu lazy soit rendu dans le DOM
      // On cible le stepsListTiles DANS la section via son id
      const regionSelector = `#${sectionId} ${SEL.stepsListTiles}`;

      try {
        await page.waitForSelector(regionSelector, { timeout: 5_000 });

        const stepEls = page.locator(regionSelector).locator("li");
        const stepCount2 = await stepEls.count();

        for (let j = 0; j < stepCount2; j++) {
          const stepEl = stepEls.nth(j);
          const stepTitle = (
            await stepEl.locator(SEL.stepTitle).innerText()
          ).trim();
          // L'id de l'étape est dans data-id sur le <li>
          const stepId = (await stepEl.getAttribute("data-id")) ?? "";

          if (stepTitle) {
            steps.push({ id: stepId, title: stepTitle });
          }
        }
      } catch {
        console.warn(
          `  ⚠️  Timeout en attendant les steps de "${title}" (section ${sectionId})`,
        );
      }
    }

    sections.push({ id: sectionId, title, stepCount, steps });

    // Refermer la section (évite les side-effects si Wix n'autorise qu'une
    // seule section ouverte simultanément)
    const isStillExpanded =
      (await button.getAttribute("aria-expanded")) === "true";
    if (isStillExpanded) {
      await button.click();
      await page.waitForTimeout(300);
    }
  }

  return sections;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const main = async () => {
  const [outputPath] = process.argv.slice(2);

  if (!outputPath) {
    console.error(
      "Usage: npx tsx scripts/migration/scrape-wix-formations.ts <output.json>",
    );
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });

  const storageStatePath = "wix-auth-state.json";
  const context = existsSync(storageStatePath)
    ? await browser.newContext({ storageState: storageStatePath })
    : await browser.newContext();

  const page = await context.newPage();

  try {
    // ── 1. Connexion manuelle ──────────────────────────────────────────────
    await page.goto(`${BASE_URL}/a-propos`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    if (!/members-area\/my\/challenges/.test(page.url())) {
      console.log(
        "\n📋 Connecte-toi dans la fenêtre Chromium qui vient de s'ouvrir.\n" +
          "   Puis navigue vers ton espace membres (Mes formations).\n" +
          "   Le script reprendra dès que tu arrives sur /members-area/my/challenges.\n",
      );

      await page.waitForURL(/members-area\/my\/challenges/, {
        timeout: 5 * 60_000,
      });
    }

    // Sauvegarde les cookies pour le prochain run (évite de re-login)
    await context.storageState({ path: storageStatePath });
    console.log("✅ Connecté. Démarrage du scraping...\n");

    // ── 2. Scraping formation par formation ───────────────────────────────
    const scraped: ScrapedFormation[] = [];

    for (const formation of wixFormations) {
      console.log(`⏳ ${formation.title}`);

      // Retour sur la liste des formations
      await page.goto(`${BASE_URL}/members-area/my/challenges`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      // Cherche le lien "Voir le programme" pour cette formation
      // Le lien contient le titre de la formation dans son accessibleName
      const titleEscaped = formation.title.replace(
        /[-/\\^$*+?.()|[\]{}]/g,
        "\\$&",
      );
      const link = page
        .getByRole("link", { name: new RegExp(titleEscaped, "i") })
        .filter({ hasText: /voir le programme/i })
        .first();

      if (!(await link.isVisible().catch(() => false))) {
        console.warn(
          `  ⚠️  Lien "Voir le programme" introuvable pour : ${formation.title}`,
        );
        continue;
      }

      await link.click();
      await page.waitForURL(/participant-page/, { timeout: 30_000 });

      // Attendre que la sidebar soit bien chargée
      await page.waitForSelector(SEL.accordionButton, { timeout: 15_000 });

      const url = page.url();
      const sections = await scrapeSections(page);

      const totalStepsScraped = sections.reduce(
        (sum, s) => sum + s.steps.length,
        0,
      );
      console.log(
        `  ✅ ${sections.length} sections, ${totalStepsScraped} steps récupérés`,
      );

      scraped.push({
        slug: formation.slug,
        title: formation.title,
        url,
        sections,
      });
    }

    // ── 3. Export JSON ────────────────────────────────────────────────────
    writeFileSync(outputPath, JSON.stringify(scraped, null, 2), "utf-8");
    console.log(`\n✅ Résultat écrit dans : ${outputPath}`);
  } catch (error) {
    console.error("Erreur de scraping :", error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Scrape Wix member formations structure (sections + steps) into JSON.
 *
 * Prérequis:
 * - pnpm add -D playwright
 * - Variables d'env:
 *   - WIX_EMAIL
 *   - WIX_PASSWORD
 *
 * Usage:
 *   npx tsx scripts/migration/scrape-wix-formations.ts wix-formations-full.json
 */

import { existsSync, writeFileSync } from "fs";
import { chromium } from "playwright";
import { wixFormations } from "./wix-formations";

type ScrapedStep = {
  title: string;
};

type ScrapedSection = {
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

const BASE_URL = "https://www.caroleherve.fr";

const escapeRegex = (value: string) => {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
};

const main = async () => {
  const [outputPath] = process.argv.slice(2);

  if (!outputPath) {
    console.error(
      "Usage: npx tsx scripts/migration/scrape-wix-formations.ts wix-formations-full.json",
    );
    process.exit(1);
  }

  const email = process.env.WIX_EMAIL;
  const password = process.env.WIX_PASSWORD;

  if (!email || !password) {
    console.error("Missing WIX_EMAIL or WIX_PASSWORD env vars");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });

  const storageStatePath = "wix-auth-state.json";
  const context = existsSync(storageStatePath)
    ? await browser.newContext({ storageState: storageStatePath })
    : await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Ouvrir une page publique, puis te laisser naviguer / te connecter
    await page.goto(`${BASE_URL}/a-propos`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    if (!/members-area\/my\/challenges/.test(page.url())) {
      console.log(
        "Dans la fenêtre Chromium ouverte, connecte-toi comme d'habitude (menu Se connecter, etc.).\n" +
          "Une fois connecté, navigue vers ton espace membres (page Mes formations / Espace membres).\n" +
          "Dès que tu arrives sur /members-area/my/challenges, le script reprendra automatiquement.",
      );

      await page.waitForURL(/members-area\/my\/challenges/, {
        timeout: 5 * 60_000, // 5 minutes pour se connecter tranquillement
      });
    }

    // Sauvegarder l'état d'authentification pour les prochains runs
    await context.storageState({ path: storageStatePath });

    const scraped: ScrapedFormation[] = [];

    for (const formation of wixFormations) {
      // 2. Ouvrir la page de la formation via "Voir le programme"
      await page.goto(`${BASE_URL}/members-area/my/challenges`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      // Lien accessible type: "Voir le programme: \"Je me prépare à allaiter\""
      const titleRegex = new RegExp(escapeRegex(formation.title), "i");
      const link = page
        .getByRole("link", { name: titleRegex })
        .filter({ hasText: /voir le programme/i })
        .first();

      if (!(await link.isVisible().catch(() => false))) {
        console.warn(
          `⚠️ Impossible de trouver "Voir le programme" pour: ${formation.title}`,
        );
        continue;
      }

      await link.click();

      await page.waitForURL(/participant-page/, {
        timeout: 30_000,
      });

      const url = page.url();
      const sections: ScrapedSection[] = [];

      // 3. Récupérer les boutons de sections (sidebar)
      const sectionButtons = page
        .getByRole("button")
        .filter({ hasText: /étapes/i });
      const sectionCount = await sectionButtons.count();

      for (let i = 0; i < sectionCount; i++) {
        const button = sectionButtons.nth(i);
        const rawLabel = (await button.innerText()).trim();

        // Exemple de label: "Ce que vous devez savoir . 0/7 étapes"
        let title = rawLabel;
        let stepCount: number | null = null;

        const match = rawLabel.match(/^(.*)\s+\.\s*0\/(\d+)\s+étapes/i);
        if (match) {
          title = match[1].trim();
          stepCount = Number(match[2]);
        }

        // Déplier la section pour lister les étapes
        await button.click();
        await page.waitForTimeout(500);

        const steps: ScrapedStep[] = [];

        // Essayer de cibler la région correspondant à cette section
        const region = page
          .getByRole("region", {
            name: new RegExp(escapeRegex(title), "i"),
          })
          .first();

        if (await region.isVisible().catch(() => false)) {
          const stepItems = region.getByRole("listitem");
          const stepItemsCount = await stepItems.count();
          for (let j = 0; j < stepItemsCount; j++) {
            const stepText = (await stepItems.nth(j).innerText()).trim();
            if (!stepText) {
              continue;
            }

            steps.push({ title: stepText });
          }
        }

        sections.push({
          title,
          stepCount,
          steps,
        });
      }

      scraped.push({
        slug: formation.slug,
        title: formation.title,
        url,
        sections,
      });
    }

    writeFileSync(outputPath, JSON.stringify(scraped, null, 2), "utf-8");
    console.log(`✅ Scraped formations structure -> ${outputPath}`);
  } catch (error) {
    console.error("Scrape error:", error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


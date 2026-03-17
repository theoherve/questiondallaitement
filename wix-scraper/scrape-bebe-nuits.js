/**
 * Scraper ciblé : "Mon bébé ne fait pas ses nuits"
 *
 * Utilise la même technique que scraper.js (injection de script dans la page Wix)
 * mais ne scrape qu'une seule formation en naviguant depuis la liste des défis.
 *
 * Usage :
 *   node wix-scraper/scrape-bebe-nuits.js
 *
 * Sortie : wix-bebe-nuits.json (à la racine du projet)
 * Ensuite lancez : node scripts/migration/merge-bebe-nuits.mjs
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FORMATION_SLUG = 'mon-bebe-ne-fait-pas-ses-nuits';
const CHALLENGES_URL  = 'https://www.caroleherve.fr/members-area/my/challenges';
const OUTPUT_PATH     = path.resolve(__dirname, '../wix-bebe-nuits.json');

// ─── Helper : attendre que la page soit stable ───────────────────────────
async function waitUntilReady(page) {
  try {
    await page.waitForNetworkIdle({ idleTime: 1500, timeout: 10_000 });
  } catch (_) {}
  await page.waitForSelector(
    '[data-hook="sidebar-layout-for-participant__sectionsListTiles__accordion-button"]',
    { timeout: 30_000 }
  );
  await new Promise(r => setTimeout(r, 2000));
}

// ─── Script injecté dans le contexte du navigateur ───────────────────────
const PAGE_SCRIPT = () => {
  return new Promise(async (resolve) => {
    try {
      const SEL_BTN        = '[data-hook="sidebar-layout-for-participant__sectionsListTiles__accordion-button"]';
      const SEL_STEPS      = '[data-hook="sidebar-layout-for-participant__stepsListTiles"]';
      const SEL_STEP_TITLE = 'p.sI2AXKc';
      const CONTENT_CANDIDATES = [
        '[data-hook="sidebar-layout-for-participant__stepView"]',
        '[data-hook="sidebar-layout-for-participant__stepViewWrapper"]',
        '[data-hook="program-step"]',
        '[class*="stepView"]',
        'main',
      ];

      const sleep   = ms => new Promise(r => setTimeout(r, ms));
      const waitFor = (sel, timeout = 12000) => new Promise((res, rej) => {
        const start = Date.now();
        const check = () => {
          const el = document.querySelector(sel);
          if (el) return res(el);
          if (Date.now() - start > timeout) return rej(new Error('Timeout: ' + sel));
          setTimeout(check, 200);
        };
        check();
      });

      const findContentEl = () => {
        for (const sel of CONTENT_CANDIDATES) {
          const el = document.querySelector(sel);
          if (el && el.innerText?.trim().length > 20) return el;
        }
        return null;
      };

      const waitForContentChange = async (prevText, timeout = 9000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          await sleep(300);
          const el = findContentEl();
          const txt = el?.innerText?.trim();
          if (el && txt && txt !== prevText && txt.length > 20) return el;
        }
        return findContentEl();
      };

      // ── Extraction médias ──────────────────────────────────────────────
      const extractMedia = (el) => {
        if (!el) return { images: [], videos: [], pdfs: [] };
        const images = [];
        el.querySelectorAll('wow-image').forEach(wi => {
          try {
            const info = JSON.parse(wi.getAttribute('data-image-info') || '{}');
            const uri  = info?.imageData?.uri;
            if (uri) {
              const w = info?.imageData?.width  || 1200;
              const h = info?.imageData?.height || 800;
              images.push({ src: 'https://static.wixstatic.com/media/' + uri + '/v1/fill/w_' + w + ',h_' + h + ',al_c,q_90,enc_auto/' + uri, alt: wi.querySelector('img')?.alt || '', uri });
              return;
            }
          } catch(_) {}
          const img = wi.querySelector('img');
          if (img?.src && !img.src.startsWith('data:')) images.push({ src: img.src, alt: img.alt || '' });
        });
        el.querySelectorAll('img:not(wow-image img)').forEach(img => {
          if (img.src && !img.src.startsWith('data:')) images.push({ src: img.src, alt: img.alt || '' });
        });
        const videos = [];
        el.querySelectorAll('.react-player__preview').forEach(btn => {
          const style = btn.getAttribute('style') || '';
          const m = style.match(/vimeocdn\.com\/video\/(\d+)/);
          if (m) videos.push({ type: 'vimeo', id: m[1], player: 'https://player.vimeo.com/video/' + m[1], thumbnail: 'https://i.vimeocdn.com/video/' + m[1] + '_640.jpg' });
        });
        el.querySelectorAll('iframe').forEach(iframe => {
          const src = iframe.src || '';
          if (/vimeo/i.test(src)) {
            const m = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
            videos.push({ type: 'vimeo', id: m?.[1] || '', player: src });
          } else if (/youtube|youtu\.be/i.test(src)) {
            videos.push({ type: 'youtube', player: src });
          }
        });
        const pdfs = [];
        el.querySelectorAll('[data-hook="file-upload-viewer"]').forEach(v => {
          const name = (v.querySelector('[data-hook="file-upload-name"]')?.innerText?.trim() || '')
                     + (v.querySelector('[data-hook="file-upload-extension"]')?.innerText?.trim() || '');
          const size = v.querySelector('._6KBVt')?.innerText?.trim() || '';
          if (name) pdfs.push({ name, size });
        });
        el.querySelectorAll('a[href]').forEach(a => {
          if (/\.pdf/i.test(a.href)) pdfs.push({ href: a.href, label: a.innerText?.trim() || '' });
        });
        return { images, videos, pdfs };
      };

      const extractHTML = (el) => {
        if (!el) return '';
        const clone = el.cloneNode(true);
        clone.querySelectorAll('script, style, noscript').forEach(n => n.remove());
        return clone.innerHTML.trim();
      };

      const clickStep = async (sectionId, i) => {
        const list = document.querySelector('#' + sectionId + ' ' + SEL_STEPS);
        if (!list) return false;
        const item = list.querySelectorAll('li')[i];
        if (!item) return false;
        (item.querySelector('a, button') || item).click();
        return true;
      };

      // ── Boucle sections ────────────────────────────────────────────────
      await waitFor(SEL_BTN, 15000);
      await sleep(1000);

      const buttons  = Array.from(document.querySelectorAll(SEL_BTN));
      const sections = [];

      for (const btn of buttons) {
        const sTitle    = btn.querySelector('.sRnjeTL')?.innerText?.trim() ?? '';
        const stepCount = Number((btn.querySelector('.sZoaSFJ')?.innerText?.match(/\/(\d+)/) || [])[1] || 0);
        const sectionId = btn.getAttribute('aria-controls') ?? '';

        if (btn.getAttribute('aria-expanded') !== 'true') { btn.click(); await sleep(1000); }

        const stepsData = [];

        if (stepCount > 0 && sectionId) {
          try {
            await waitFor('#' + sectionId + ' ' + SEL_STEPS, 8000);
            await sleep(500);
            const items = Array.from(document.querySelectorAll('#' + sectionId + ' ' + SEL_STEPS + ' li'));

            for (let i = 0; i < items.length; i++) {
              const stepTitle = items[i].querySelector(SEL_STEP_TITLE)?.innerText?.trim() ?? ('Step ' + (i + 1));
              const prevText  = findContentEl()?.innerText?.trim() ?? '';

              if (!await clickStep(sectionId, i)) {
                stepsData.push({ title: stepTitle, html: '', media: { images: [], videos: [], pdfs: [] }, error: 'click_failed' });
                continue;
              }

              const contentEl = await waitForContentChange(prevText, 9000);
              await sleep(700);

              stepsData.push({ title: stepTitle, html: extractHTML(contentEl), media: extractMedia(contentEl) });
              await sleep(400);
            }
          } catch(e) {
            stepsData.push({ title: '__error__', html: '', media: {}, error: e.message });
          }
        }

        sections.push({ title: sTitle, stepCount, steps: stepsData });
        if (btn.getAttribute('aria-expanded') === 'true') { btn.click(); await sleep(400); }
      }

      resolve(JSON.stringify(sections));
    } catch(e) {
      resolve(JSON.stringify([{ error: e.message }]));
    }
  });
};

// ─── Main ─────────────────────────────────────────────────────────────────
(async () => {
  console.log('🚀 Lancement du navigateur...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  // ── 1. Connexion manuelle (page dédiée) ───────────────────────────────
  // On crée une première page juste pour la connexion. Le flow Wix cause
  // souvent une détached-frame sur la page originale après login, donc on
  // ouvre une NOUVELLE page pour le scraping après que l'utilisateur a fini.
  let loginPage = await browser.newPage();
  loginPage.on('pageerror', () => {});

  console.log('\n🔐 Le navigateur va s\'ouvrir sur caroleherve.fr.');
  console.log('   Connecte-toi si besoin, puis appuie sur ENTRÉE ici pour continuer.\n');
  await loginPage.goto('https://www.caroleherve.fr', { waitUntil: 'domcontentloaded' });
  await new Promise(resolve => process.stdin.once('data', resolve));

  // Fermer la page de login et ouvrir une page fraîche pour le scraping
  // (évite l'erreur "detached Frame" après les redirections du login Wix)
  await loginPage.close();
  const page = await browser.newPage();
  page.on('pageerror', () => {});

  // ── 2. Navigation vers la liste des formations ─────────────────────────
  console.log(`\n📚 Navigation vers la liste des formations...`);
  await page.goto(CHALLENGES_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  try {
    await page.waitForNetworkIdle({ idleTime: 1500, timeout: 10_000 });
  } catch (_) {}
  await new Promise(r => setTimeout(r, 2000));

  // ── 3. Trouver et cliquer sur le lien "Voir le programme" ─────────────
  console.log('🔍 Recherche du lien "Mon bébé ne fait pas ses nuits"...');

  // Chercher un lien contenant "Mon bébé ne fait pas ses nuits" (avec "Voir le programme")
  const formationLink = await page.evaluate(() => {
    // Chercher toutes les cartes de formation
    const allLinks = Array.from(document.querySelectorAll('a'));
    // Chercher un lien avec "voir le programme" près du titre cible
    for (const link of allLinks) {
      const text = link.innerText?.toLowerCase() || '';
      if (text.includes('voir le programme') || text.includes('go to program') || text.includes('view program')) {
        // Remonter pour vérifier si la carte contient le bon titre
        const card = link.closest('[class*="challenge"]') || link.closest('[class*="card"]') || link.parentElement?.parentElement?.parentElement;
        if (card) {
          const cardText = card.innerText?.toLowerCase() || '';
          if (cardText.includes('bébé ne fait pas ses nuits') || cardText.includes('bebe ne fait pas ses nuits')) {
            return link.href;
          }
        }
      }
    }
    // Fallback : chercher directement par le texte du lien contenant "participant-page"
    for (const link of allLinks) {
      if (link.href?.includes('participant-page') && (link.innerText?.toLowerCase().includes('voir') || link.innerText?.toLowerCase().includes('go'))) {
        // Essayer de trouver la bonne formation
      }
    }
    return null;
  });

  let participantUrl = formationLink;

  if (!participantUrl) {
    console.log('⚠️  Lien automatique non trouvé.');
    console.log('   Navigue manuellement vers la page "participant-page" de "Mon bébé ne fait pas ses nuits".');
    console.log('   URL attendue : https://www.caroleherve.fr/participant-page/mon-bebe-ne-fait-pas-ses-nuits?...');
    console.log('   Puis appuie sur ENTRÉE ici.\n');
    await new Promise(resolve => process.stdin.once('data', resolve));
    participantUrl = page.url();
  } else {
    console.log(`✅ Lien trouvé : ${participantUrl}`);
    await page.goto(participantUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }

  // ── 4. Attendre le chargement de la page de la formation ──────────────
  if (!page.url().includes('participant-page')) {
    console.log('❌ Pas sur une page participant-page. Vérifiez votre navigation.');
    await browser.close();
    process.exit(1);
  }

  console.log('\n⏳ Attente du chargement de la sidebar Wix...');
  await waitUntilReady(page);

  // ── 5. Scraping avec retry ─────────────────────────────────────────────
  let sections = null;
  let attempts = 0;

  while (attempts < 3 && sections === null) {
    attempts++;
    try {
      const raw = await page.mainFrame().evaluate(PAGE_SCRIPT);
      const parsed = JSON.parse(raw);

      if (parsed.length === 0 || (parsed.length === 1 && parsed[0].error)) {
        throw new Error(parsed[0]?.error || 'Résultat vide');
      }
      const hasContent = parsed.some(s => s.steps && s.steps.length > 0);
      if (!hasContent) throw new Error('Aucun step récupéré');

      sections = parsed;
      console.log(`\n✅ Tentative ${attempts} — ${sections.length} sections récupérées`);
      sections.forEach(s => console.log(`   • ${s.title} : ${s.steps?.length ?? 0} steps`));
    } catch (e) {
      console.error(`\n⚠️  Tentative ${attempts}/3 : ${e.message}`);
      if (attempts < 3) {
        console.log('   🔄 Retry dans 5s...');
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  if (sections === null) {
    console.error('❌ Échec définitif du scraping.');
    await browser.close();
    process.exit(1);
  }

  // ── 6. Sauvegarde JSON ─────────────────────────────────────────────────
  const result = {
    slug: FORMATION_SLUG,
    title: 'Mon bébé ne fait pas ses nuits',
    url: page.url(),
    sections,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n🎉 Résultat sauvegardé dans : ${OUTPUT_PATH}`);
  console.log('\n👉 Lance maintenant :');
  console.log('   node scripts/migration/merge-bebe-nuits.mjs');

  await browser.close();
})();

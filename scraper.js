const puppeteer = require('puppeteer');
const fs = require('fs');

// ─── Les 7 formations (+ 2 à ajouter quand tu as les URLs) ────────────────
const FORMATIONS = [
  { slug: 'je-me-prepare-a-allaiter',               url: 'https://www.caroleherve.fr/participant-page/je-me-prepare-a-allaiter?programId=28305ddf-ddb1-4324-8cb7-9efc23aef46f&participantId=6065bef6-5895-4ec2-8016-60a9eca0660b' },
  { slug: 'mon-allaitement-des-premiers-jours',     url: 'https://www.caroleherve.fr/participant-page/mon-allaitement-des-premiers-jours?programId=a5724b19-2b9d-47cd-aa59-019f489d8127&participantId=8a219bf2-7a6f-48ec-88a7-ba61faeb4d22' },
  { slug: 'je-souhaite-sevrer-mon-bebe',            url: 'https://www.caroleherve.fr/participant-page/je-souhaite-sevrer-mon-bebe?programId=2ef4beb9-a221-402e-b639-bdb11db5465b&participantId=1daeaef5-46b5-4f3c-9f59-696e18e25738' },
  { slug: 'je-reprends-une-activite-professionnelle', url: 'https://www.caroleherve.fr/participant-page/je-reprends-une-activite-professionnelle?programId=b6c663bd-ab48-4f49-80a4-0302790f386e&participantId=062b45a4-3777-4f3f-8b60-e83de23ffe47' },
  { slug: 'mon-allaitement-au-fil-des-mois',        url: 'https://www.caroleherve.fr/participant-page/mon-allaitement-au-fil-des-mois?programId=9f1e80db-62c3-4299-b4a9-a6a6efc6ee64&participantId=afff7717-857d-4aab-bfa5-24b182ed0b77' },
  { slug: 'les-urgences-allaitement',               url: 'https://www.caroleherve.fr/participant-page/les-urgences-de-allaitement?programId=25245ace-7dd7-4ede-97cc-551262c5ec84&participantId=8a7193aa-6810-4cb1-8ea2-a98cb6f2a2ec' },
  { slug: 'la-diversification-de-mon-bebe-allaite', url: 'https://www.caroleherve.fr/participant-page/la-diversification-de-mon-bebe-allaite?programId=01bbf937-95c4-4b95-86cb-050203171b86&participantId=8db76c45-25b4-424f-8a2e-e4cfd66e6dfd' },
  // Ajoute ici les 2 formations manquantes quand tu as leurs URLs :
  // { slug: 'pack-lessentiel-de-lallaitement', url: 'https://www.caroleherve.fr/participant-page/...' },
  // { slug: 'mon-bebe-ne-fait-pas-ses-nuits',  url: 'https://www.caroleherve.fr/participant-page/...' },
];

// ─── Helper : attendre que la page soit stable après navigation ────────────
async function navigateAndWait(page, url) {
  // Aller sur la page
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

  // Attendre que le réseau soit calme (max 10s)
  try {
    await page.waitForNetworkIdle({ idleTime: 1500, timeout: 10000 });
  } catch (_) { /* pas grave si ça timeout */ }

  // Attendre que le sélecteur Wix principal soit présent
  await page.waitForSelector(
    '[data-hook="sidebar-layout-for-participant__sectionsListTiles__accordion-button"]',
    { timeout: 30000 }
  );

  // Pause supplémentaire pour laisser React hydrater
  await new Promise(r => setTimeout(r, 2000));
}

// ─── Script injecté dans la page (s'exécute dans le contexte du navigateur) 
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
              const w   = info?.imageData?.width  || 1200;
              const h   = info?.imageData?.height || 800;
              images.push({
                src: 'https://static.wixstatic.com/media/' + uri + '/v1/fill/w_' + w + ',h_' + h + ',al_c,q_90,enc_auto/' + uri,
                alt: wi.querySelector('img')?.alt || '',
                uri,
              });
              return;
            }
          } catch(_) {}
          const img = wi.querySelector('img');
          if (img?.src && !img.src.startsWith('data:'))
            images.push({ src: img.src, alt: img.alt || '' });
        });
        el.querySelectorAll('img:not(wow-image img)').forEach(img => {
          if (img.src && !img.src.startsWith('data:'))
            images.push({ src: img.src, alt: img.alt || '' });
        });

        const videos = [];
        el.querySelectorAll('.react-player__preview').forEach(btn => {
          const style = btn.getAttribute('style') || '';
          const m = style.match(/vimeocdn\.com\/video\/(\d+)/);
          if (m) videos.push({
            type:      'vimeo',
            id:        m[1],
            player:    'https://player.vimeo.com/video/' + m[1],
            thumbnail: 'https://i.vimeocdn.com/video/' + m[1] + '_640.jpg',
          });
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

// ─── Main ──────────────────────────────────────────────────────────────────
(async () => {
  console.log('🚀 Lancement du navigateur...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  // Ignorer les erreurs de console de la page (évite le bruit)
  page.on('pageerror', () => {});

  const results = [];

  // ── Connexion manuelle ─────────────────────────────────────────────────
  console.log('🔐 Ouvre caroleherve.fr — connecte-toi si besoin, puis appuie sur Entrée.');
  await page.goto('https://www.caroleherve.fr', { waitUntil: 'domcontentloaded' });
  await new Promise(resolve => process.stdin.once('data', resolve));

  // ── Boucle formations ──────────────────────────────────────────────────
  for (const formation of FORMATIONS) {
    console.log(`\n📚 Scraping : ${formation.slug}`);

    let sections = null;
    let attempts = 0;

    while (attempts < 3 && sections === null) {
      attempts++;
      try {
        // Navigation robuste : attend le vrai rendu Wix
        await navigateAndWait(page, formation.url);

        // Évaluation dans la mainFrame pour éviter "detached frame"
        const raw = await page.mainFrame().evaluate(PAGE_SCRIPT);
        const parsed = JSON.parse(raw);

        if (parsed.length === 0 || (parsed.length === 1 && parsed[0].error)) {
          throw new Error(parsed[0]?.error || 'Résultat vide');
        }
        const hasContent = parsed.some(s => s.steps && s.steps.length > 0);
        if (!hasContent) throw new Error('Aucun step récupéré');

        sections = parsed;
        console.log(`   ✅ Tentative ${attempts} — ${sections.length} sections`);
      } catch (e) {
        console.error(`   ⚠️  Tentative ${attempts}/3 : ${e.message}`);
        if (attempts < 3) {
          console.log('   🔄 Retry dans 6s...');
          await new Promise(r => setTimeout(r, 6000));
        }
      }
    }

    if (sections === null) {
      console.error(`   ❌ Échec définitif pour ${formation.slug}`);
      sections = [{ error: 'Failed after 3 attempts' }];
    }

    // Titre extrait du h1 sidebar
    const formationTitle = sections
      .flatMap(s => s.steps || [])
      .find(st => st.html)
      ?.html?.match(/data-hook="summary__title"[^>]*>([^<]+)/)?.[1]?.trim()
      ?? formation.slug;

    results.push({ slug: formation.slug, title: formationTitle, url: formation.url, sections });

    // Sauvegarde intermédiaire
    fs.writeFileSync('wix-formations-full.json', JSON.stringify(results, null, 2), 'utf8');
    console.log('   💾 Sauvegarde intermédiaire OK');

    await new Promise(r => setTimeout(r, 2500));
  }

  fs.writeFileSync('wix-formations-full.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\n🎉 Terminé ! Fichier : wix-formations-full.json');
  await browser.close();
})();
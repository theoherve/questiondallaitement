const puppeteer = require('puppeteer');
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

// ─── Config ────────────────────────────────────────────────────────────────
const FORMATIONS_URL = 'https://www.caroleherve.fr/formations';
const OUTPUT_JSON    = 'wix-formations-pro.json';
const IMAGES_DIR     = path.join(__dirname, 'formations-images');
const DELAY          = ms => new Promise(r => setTimeout(r, ms));

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// ─── Téléchargement image ──────────────────────────────────────────────────
function downloadImage(imgUrl, destPath) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(imgUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      const file   = fs.createWriteStream(destPath);
      const req    = client.get(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close(); fs.unlink(destPath, () => {});
          return downloadImage(res.headers.location, destPath).then(resolve);
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(true); });
      });
      req.on('error', () => { fs.unlink(destPath, () => {}); resolve(false); });
      req.setTimeout(15000, () => { req.destroy(); resolve(false); });
    } catch(_) { resolve(false); }
  });
}

// ─── Normalisation slug ────────────────────────────────────────────────────
function normalizeSlug(s) {
  return decodeURIComponent(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''`]/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Nettoyage HTML ────────────────────────────────────────────────────────
function cleanHtml(html) {
  return html
    .replace(/\s(class|id|data-[a-z-]+|aria-[a-z-]+|style|dir|tabindex|role)="[^"]*"/g, '')
    .replace(/<\/?wow-image[^>]*>/g, '')
    .replace(/<\/?wix-[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '>\n<')
    .trim();
}

// ─── Script : collecte toutes les cartes de la liste ──────────────────────
const COLLECT_CARDS = () => {
  const cards = [];
  document.querySelectorAll('[data-hook="events-card"]').forEach(card => {
    // Titre
    const title = card.querySelector('[data-hook="title"]')?.innerText?.trim() || '';

    // Date courte affichée
    const shortDate = card.querySelector('[data-hook="short-date"]')?.innerText?.trim() || '';

    // Lieu
    const location = card.querySelector('[data-hook="short-location"]')?.innerText?.trim() || '';

    // Image HD via wow-image
    let image = '';
    const wowImg = card.querySelector('[data-hook="image"] wow-image');
    if (wowImg) {
      try {
        const info = JSON.parse(wowImg.getAttribute('data-image-info') || '{}');
        const uri  = info?.imageData?.uri;
        if (uri) {
          const w = info?.imageData?.width  || 1200;
          const h = info?.imageData?.height || 800;
          image = `https://static.wixstatic.com/media/${uri}/v1/fill/w_${w},h_${h},al_c,q_90,enc_auto/${uri}`;
        }
      } catch(_) {}
    }
    if (!image) {
      const img = card.querySelector('[data-hook="image"] img');
      if (img?.src && !img.src.startsWith('data:')) image = img.src;
    }

    // Lien vers la page détail (more-info-link-*)
    const detailLink = card.querySelector('a[data-hook^="more-info-link-"]')?.href
      || card.querySelector('a[href*="/event-details/"]')?.href
      || card.querySelector('a[href*="/events/"]')?.href
      || '';

    // Bouton RSVP / inscription
    const rsvpBtn  = card.querySelector('[data-hook="ev-rsvp-button"]');
    const rsvpText = rsvpBtn?.innerText?.trim() || '';
    const rsvpLink = rsvpBtn?.closest('a')?.href || rsvpBtn?.querySelector('a')?.href || '';

    // Statut (complet, disponible…)
    const statusEl = card.querySelector('[data-hook*="status"], [class*="status"], [class*="Status"]');
    const status   = statusEl?.innerText?.trim() || '';

    if (title) cards.push({ title, shortDate, location, image, detailLink, rsvpText, rsvpLink, status });
  });
  return cards;
};

// ─── Script : scrape la page détail d'une formation ───────────────────────
const SCRAPE_DETAIL = () => {
  const normalizeSlug = (s) => decodeURIComponent(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[''`]/g, '-')
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  try {
    // ── Métadonnées depuis les balises JSON-LD (Wix Events les injecte) ──
    let jsonLd = {};
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const d = JSON.parse(s.innerText);
        if (d['@type'] === 'Event' || d.startDate) jsonLd = d;
      } catch(_) {}
    });

    // ── Titre ─────────────────────────────────────────────────────────────
    const title = document.querySelector('[data-hook="event-title"]')?.innerText?.trim()
      || document.querySelector('h1')?.innerText?.trim()
      || jsonLd.name || '';

    // ── Dates (ISO depuis JSON-LD en priorité, sinon DOM) ─────────────────
    const startDate = jsonLd.startDate
      || document.querySelector('[data-hook="event-start-date"]')?.getAttribute('datetime')
      || document.querySelector('[data-hook="event-date"] time')?.getAttribute('datetime')
      || document.querySelector('[data-hook="event-full-date"]')?.innerText?.trim()
      || document.querySelector('[data-hook="short-date"]')?.innerText?.trim()
      || '';
    const endDate = jsonLd.endDate
      || document.querySelector('[data-hook="event-end-date"]')?.getAttribute('datetime')
      || '';

    // ── Lieu ──────────────────────────────────────────────────────────────
    const locationEl = document.querySelector('[data-hook="event-location"], [data-hook="location"]');
    const location   = locationEl?.innerText?.trim()
      || (jsonLd.location?.name || jsonLd.location?.address?.streetAddress || '');
    const locationAddress = jsonLd.location?.address
      ? [
          jsonLd.location.address.streetAddress,
          jsonLd.location.address.addressLocality,
          jsonLd.location.address.postalCode,
          jsonLd.location.address.addressCountry,
        ].filter(Boolean).join(', ')
      : document.querySelector('[data-hook="event-location-address"], [data-hook="location-map-address"]')?.innerText?.trim() || '';

    // ── Prix ──────────────────────────────────────────────────────────────
    const priceEl = document.querySelector('[data-hook="event-ticket-price"], [data-hook="ticket-price"], [data-hook="price"]');
    const price   = priceEl?.innerText?.trim()
      || (jsonLd.offers ? (Array.isArray(jsonLd.offers) ? jsonLd.offers[0]?.price : jsonLd.offers?.price) : '')
      || document.querySelector('[class*="price"], [class*="Price"]')?.innerText?.trim()
      || '';
    const currency = jsonLd.offers?.priceCurrency || 'EUR';

    // ── Image principale ──────────────────────────────────────────────────
    let mainImage = jsonLd.image || '';
    if (!mainImage) {
      const wowImg = document.querySelector('[data-hook="event-image"] wow-image, [data-hook="header-image"] wow-image');
      if (wowImg) {
        try {
          const info = JSON.parse(wowImg.getAttribute('data-image-info') || '{}');
          const uri  = info?.imageData?.uri;
          if (uri) {
            const w = info?.imageData?.width  || 1200;
            const h = info?.imageData?.height || 800;
            mainImage = `https://static.wixstatic.com/media/${uri}/v1/fill/w_${w},h_${h},al_c,q_90,enc_auto/${uri}`;
          }
        } catch(_) {}
      }
    }
    if (!mainImage) mainImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

    // ── Description ───────────────────────────────────────────────────────
    const descEl = document.querySelector('[data-hook="event-description"], [data-hook="description"]')
      || document.querySelector('[class*="eventDescription"], [class*="event-description"]');
    const descriptionHtml = descEl?.innerHTML || '';
    const descriptionText = descEl?.innerText?.trim() || jsonLd.description || '';

    // ── Programme / contenu détaillé ──────────────────────────────────────
    // Wix Events peut avoir une section "about" ou "schedule"
    const aboutEl    = document.querySelector('[data-hook="event-about"], [data-hook="about"], [class*="about"], [class*="About"]');
    const scheduleEl = document.querySelector('[data-hook="event-schedule"], [data-hook="schedule"], [class*="schedule"], [class*="Schedule"]');
    const aboutHtml    = aboutEl?.innerHTML || '';
    const scheduleHtml = scheduleEl?.innerHTML || '';

    // Contenu complet de la page détail (fallback)
    const mainEl = document.querySelector('[data-hook="event-details"], main, [class*="eventPage"]');
    const fullHtml = mainEl?.innerHTML || document.body.innerHTML;

    // ── Intervenants / speakers ───────────────────────────────────────────
    const speakers = [];
    document.querySelectorAll('[data-hook*="speaker"], [class*="speaker"], [class*="Speaker"]').forEach(el => {
      const name  = el.querySelector('[class*="name"], [class*="Name"], h3, h4')?.innerText?.trim();
      const role  = el.querySelector('[class*="role"], [class*="Role"], [class*="title"]')?.innerText?.trim();
      const bio   = el.querySelector('[class*="bio"], [class*="Bio"], p')?.innerText?.trim();
      if (name) speakers.push({ name, role: role || '', bio: bio || '' });
    });
    // Fallback depuis JSON-LD performer
    if (speakers.length === 0 && jsonLd.performer) {
      const perf = Array.isArray(jsonLd.performer) ? jsonLd.performer : [jsonLd.performer];
      perf.forEach(p => { if (p.name) speakers.push({ name: p.name, role: '', bio: '' }); });
    }

    // ── Capacité / places ─────────────────────────────────────────────────
    const capacityEl = document.querySelector('[data-hook*="capacity"], [data-hook*="spots"], [class*="capacity"]');
    const capacity   = capacityEl?.innerText?.trim() || '';

    // ── Tags ──────────────────────────────────────────────────────────────
    const tags = [...document.querySelectorAll('[data-hook*="tag"], [class*="tag"]')]
      .map(el => el.innerText?.trim()).filter(t => t && t.length < 50);

    // ── Lien d'inscription ────────────────────────────────────────────────
    const rsvpEl   = document.querySelector('[data-hook="ev-rsvp-button"], [data-hook="rsvp-button"], [data-hook="register-button"]');
    const rsvpLink = rsvpEl?.closest('a')?.href || rsvpEl?.href || '';
    const rsvpText = rsvpEl?.innerText?.trim() || '';

    // ── Statut ────────────────────────────────────────────────────────────
    const statusEl = document.querySelector('[data-hook*="status"], [class*="soldOut"], [class*="full"]');
    const status   = statusEl?.innerText?.trim() || '';

    // ── Images dans le contenu ────────────────────────────────────────────
    const images = [];
    document.querySelectorAll('wow-image').forEach(wi => {
      try {
        const info = JSON.parse(wi.getAttribute('data-image-info') || '{}');
        const uri  = info?.imageData?.uri;
        if (!uri) return;
        const w = info?.imageData?.width  || 1200;
        const h = info?.imageData?.height || 800;
        images.push({
          src: `https://static.wixstatic.com/media/${uri}/v1/fill/w_${w},h_${h},al_c,q_90,enc_auto/${uri}`,
          alt: wi.querySelector('img')?.alt || '',
          uri,
        });
      } catch(_) {}
    });
    [...new Map(images.map(i => [i.uri, i])).values()]; // déduplique

    // ── Slug ──────────────────────────────────────────────────────────────
    const slug = normalizeSlug(
      window.location.pathname.replace('/event-details/', '').replace('/events/', '').replace(/\/$/, '')
    );

    // ── Excerpt depuis meta ───────────────────────────────────────────────
    const excerpt = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || descriptionText.substring(0, 200);

    return JSON.stringify({
      slug, title, startDate, endDate, location, locationAddress,
      price, currency, mainImage, images,
      descriptionText, descriptionHtml, aboutHtml, scheduleHtml, fullHtml,
      speakers, capacity, tags, rsvpLink, rsvpText, status, excerpt,
      error: null,
    });
  } catch(e) {
    return JSON.stringify({ error: e.message });
  }
};

// ─── Main ──────────────────────────────────────────────────────────────────
(async () => {
  console.log('🚀 Lancement...');

  const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  const page = await browser.newPage();
  page.on('pageerror', () => {});

  // ── Connexion si besoin ────────────────────────────────────────────────
  console.log('🔐 Ouverture de /formations — connecte-toi si besoin, puis appuie sur Entrée.');
  await page.goto(FORMATIONS_URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => process.stdin.once('data', r));

  // ── Étape 1 : cliquer "Voir plus" jusqu'à épuisement ──────────────────
  console.log('\n📋 Chargement de toutes les formations...');
  let loadMoreClicks = 0;
  while (true) {
    await page.waitForSelector('[data-hook="events-card"]', { timeout: 10000 }).catch(() => {});
    await DELAY(1500);

    const btn = await page.$('[data-hook="load-more-button"]');
    if (!btn) break;
    const visible = await btn.isIntersectingViewport().catch(() => true);
    if (!visible) await page.evaluate(b => b.scrollIntoView(), btn);
    await btn.click();
    loadMoreClicks++;
    console.log(`   Clic "Voir plus" #${loadMoreClicks}...`);
    await DELAY(2000);
  }
  console.log('   ✅ Toutes les formations chargées.');

  // ── Étape 2 : collecter les cartes ────────────────────────────────────
  await DELAY(1000);
  const cards = await page.mainFrame().evaluate(COLLECT_CARDS);
  console.log(`\n✅ ${cards.length} formations trouvées\n`);

  // Extraire les liens de détail
  const detailLinks = cards
    .map(c => c.detailLink)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // déduplique

  // ── Étape 3 : scraper chaque page détail ──────────────────────────────
  const formations = [];

  for (let idx = 0; idx < detailLinks.length; idx++) {
    const link = detailLinks[idx];
    const card = cards.find(c => c.detailLink === link) || {};
    console.log(`[${idx + 1}/${detailLinks.length}] ${link}`);

    let data = null;
    let attempts = 0;

    while (attempts < 3 && !data) {
      attempts++;
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });
        try { await page.waitForNetworkIdle({ idleTime: 1500, timeout: 8000 }); } catch(_) {}
        await DELAY(2000);

        const raw    = await page.mainFrame().evaluate(SCRAPE_DETAIL);
        const parsed = JSON.parse(raw);
        if (parsed.error && !parsed.title) throw new Error(parsed.error);
        data = parsed;
      } catch(e) {
        console.warn(`   ⚠️  Tentative ${attempts}/3 : ${e.message}`);
        if (attempts < 3) await DELAY(4000);
      }
    }

    if (!data) {
      formations.push({ url: link, ...card, error: 'Failed after 3 attempts' });
      continue;
    }

    // Fusionner avec les données de la carte liste
    data.url = link;
    data.rsvpLink = data.rsvpLink || card.rsvpLink || '';
    data.rsvpText = data.rsvpText || card.rsvpText || '';
    data.status   = data.status   || card.status   || '';

    // ── Téléchargement image principale ───────────────────────────────
    if (data.mainImage) {
      try {
        const imgUrl  = data.mainImage;
        const ext     = path.extname(new URL(imgUrl).pathname) || '.jpg';
        const name    = `${normalizeSlug(data.slug || String(idx + 1))}-cover${ext}`;
        const dest    = path.join(IMAGES_DIR, name);
        const ok      = await downloadImage(imgUrl, dest);
        data.mainImageLocal = ok ? `./formations-images/${name}` : null;
        if (ok) console.log(`   🖼  Cover: ${name}`);
      } catch(_) {}
    }

    // ── Téléchargement autres images ──────────────────────────────────
    const localImages = [];
    const seen = new Set();
    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      if (seen.has(img.uri || img.src)) continue;
      seen.add(img.uri || img.src);
      try {
        const ext  = path.extname(new URL(img.src).pathname) || '.jpg';
        const name = `${normalizeSlug(data.slug || String(idx + 1))}-img-${i + 1}${ext}`;
        const dest = path.join(IMAGES_DIR, name);
        const ok   = await downloadImage(img.src, dest);
        localImages.push({ ...img, local: ok ? `./formations-images/${name}` : null });
      } catch(_) { localImages.push({ ...img, local: null }); }
    }
    data.images = localImages;

    // Remplacer URLs dans le HTML par chemins locaux
    let html = data.fullHtml || '';
    for (const img of localImages) {
      if (img.local && img.src) html = html.split(img.src).join(img.local);
    }
    if (data.mainImage && data.mainImageLocal) html = html.split(data.mainImage).join(data.mainImageLocal);
    data.htmlForApp  = cleanHtml(html);
    data.descHtml    = cleanHtml(data.descriptionHtml || '');
    data.aboutHtml   = cleanHtml(data.aboutHtml || '');
    data.schedHtml   = cleanHtml(data.scheduleHtml || '');
    delete data.fullHtml;
    delete data.descriptionHtml;
    delete data.scheduleHtml;

    formations.push(data);

    // Sauvegarde intermédiaire
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(formations, null, 2), 'utf8');
    console.log(`   💾 ${formations.length} formations sauvegardées`);

    await DELAY(1500);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(formations, null, 2), 'utf8');
  console.log(`\n🎉 Terminé ! ${formations.length} formations → ${OUTPUT_JSON}`);
  console.log(`   Images → ${IMAGES_DIR}`);

  await browser.close();
})();
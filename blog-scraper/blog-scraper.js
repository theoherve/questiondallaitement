const puppeteer = require('puppeteer');
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

// ─── Config ────────────────────────────────────────────────────────────────
const BLOG_URL      = 'https://www.caroleherve.fr/blog';
const DASHBOARD_URL = 'https://manage.wix.com/dashboard/c8e39045-30eb-4cb6-b302-90fd21cf6751/blog/posts?status=%5B%7B%22id%22%3A%22PUBLISHED%22%2C%22name%22%3A%22Publi%C3%A9s%22%7D%5D&selectedColumns=col-thumbnail,col-post,col-published,col-views,col-comments,col-likes,col-categories,col-tags,col-spacer';
const OUTPUT_JSON   = 'wix-blog.json';
const IMAGES_DIR    = path.join(__dirname, 'blog-images');
const DELAY         = ms => new Promise(r => setTimeout(r, ms));

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// ─── Téléchargement d'image ────────────────────────────────────────────────
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

// ─── Normalisation du slug (accents, apostrophes, caractères spéciaux) ────
function normalizeSlug(slug) {
  return decodeURIComponent(slug)   // decode %C3%A9 → é
    .normalize('NFD')               // décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // supprime les diacritiques (é→e, è→e, ç→c…)
    .toLowerCase()
    .replace(/[''`]/g, '-')         // apostrophes → tiret
    .replace(/[^a-z0-9-]/g, '-')    // tout caractère non alphanumérique → tiret
    .replace(/-+/g, '-')            // tirets multiples → un seul
    .replace(/^-|-$/g, '');         // supprimer tirets en début/fin
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

// ─── Collecte liens sur une page de liste ─────────────────────────────────
const GET_LINKS = () => {
  const links = new Set();
  document.querySelectorAll('a[href*="/post/"]').forEach(a => {
    const h = a.href?.split('?')[0];
    if (h) links.add(h);
  });
  return [...links];
};

// ─── Détection bouton page suivante Wix ───────────────────────────────────
const GET_NEXT_PAGE_URL = () => {
  // Wix Blog utilise data-hook="next-page" ou aria-label contenant "next"
  const selectors = [
    '[data-hook="next-page"]',
    '[data-hook="pagination-next"]',
    'a[aria-label*="next" i]',
    'a[aria-label*="suivant" i]',
    'button[aria-label*="next" i]',
    'button[aria-label*="suivant" i]',
    '[class*="nextPage"] a',
    '[class*="next-page"] a',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      // Si c'est un lien, retourner le href
      if (el.tagName === 'A' && el.href) return { type: 'link', href: el.href };
      // Si c'est un bouton ou que le parent est cliquable
      const link = el.closest('a');
      if (link?.href) return { type: 'link', href: link.href };
      return { type: 'click', selector: sel };
    }
  }
  // Chercher le numéro de page courant et le suivant
  const pages = [...document.querySelectorAll('[data-hook="page-number"], [class*="pageNumber"], [class*="page-number"]')];
  if (pages.length > 0) {
    const current = pages.find(p => p.getAttribute('aria-current') === 'page' || p.classList.contains('active'));
    if (current) {
      const next = current.nextElementSibling;
      if (next?.tagName === 'A' && next.href) return { type: 'link', href: next.href };
      if (next) return { type: 'click', selector: null, element: true };
    }
  }
  return null;
};

// ─── Scrape d'un article ───────────────────────────────────────────────────
const SCRAPE_ARTICLE = () => {
  // Normalisation slug (doit être définie dans le contexte navigateur)
  const normalizeSlug = (s) => decodeURIComponent(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''`]/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  try {
    const title = document.querySelector('h1')?.innerText?.trim()
      || document.querySelector('[data-hook="post-title"]')?.innerText?.trim()
      || document.title?.split('|')[0]?.trim() || '';

    const author = document.querySelector('[data-hook="post-author-name"]')?.innerText?.trim()
      || document.querySelector('[class*="authorName"]')?.innerText?.trim() || '';

    const dateEl = document.querySelector('[data-hook="post-publish-date"]')
      || document.querySelector('time')
      || document.querySelector('[class*="publishDate"]');
    const publishedAt = dateEl?.getAttribute('datetime') || dateEl?.innerText?.trim() || '';

    // Catégories — sélecteur précis sur les liens /blog/categories/
    const categories = [...document.querySelectorAll('a[href*="/blog/categories/"]')]
      .map(el => el.innerText?.trim())
      .filter(Boolean);
    // Fallback data-hook si le sélecteur href ne donne rien
    if (categories.length === 0) {
      [...document.querySelectorAll('[data-hook="post-category"], [data-hook="category"]')]
        .forEach(el => { const t = el.innerText?.trim(); if (t) categories.push(t); });
    }

    const slug = normalizeSlug(window.location.pathname.replace('/post/', '').replace(/\/$/, ''));
    const excerpt = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()
      || document.querySelector('[data-hook="post-excerpt"]')?.innerText?.trim() || '';

    // Cover image
    let coverImage = '';
    const coverWow = document.querySelector(
      '[data-hook="post-cover-image"] wow-image, [class*="coverImage"] wow-image, [class*="heroImage"] wow-image, [class*="postImage"] wow-image'
    );
    if (coverWow) {
      try {
        const info = JSON.parse(coverWow.getAttribute('data-image-info') || '{}');
        const uri  = info?.imageData?.uri;
        if (uri) {
          const w = info?.imageData?.width || 1200;
          const h = info?.imageData?.height || 800;
          coverImage = `https://static.wixstatic.com/media/${uri}/v1/fill/w_${w},h_${h},al_c,q_90,enc_auto/${uri}`;
        }
      } catch(_) {}
    }
    if (!coverImage) {
      coverImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    }

    // Contenu
    const contentEl = document.querySelector('[data-hook="post-content"]')
      || document.querySelector('[class*="postContent"]')
      || document.querySelector('[class*="post-content"]')
      || document.querySelector('article')
      || document.querySelector('main');

    if (!contentEl) return JSON.stringify({ error: 'Contenu introuvable', title, slug });

    // Remplacer wow-image par img HD
    contentEl.querySelectorAll('wow-image').forEach(wi => {
      try {
        const info = JSON.parse(wi.getAttribute('data-image-info') || '{}');
        const uri  = info?.imageData?.uri;
        if (!uri) return;
        const w = info?.imageData?.width || 1200;
        const h = info?.imageData?.height || 800;
        const img = document.createElement('img');
        img.src = `https://static.wixstatic.com/media/${uri}/v1/fill/w_${w},h_${h},al_c,q_90,enc_auto/${uri}`;
        img.alt = wi.querySelector('img')?.alt || '';
        img.setAttribute('data-wix-uri', uri);
        wi.replaceWith(img);
      } catch(_) {}
    });

    // Images dans le contenu
    const images = [];
    contentEl.querySelectorAll('img').forEach(img => {
      if (img.src && !img.src.startsWith('data:'))
        images.push({ src: img.src, alt: img.alt || '', uri: img.getAttribute('data-wix-uri') || '' });
    });

    // Vidéos
    const videos = [];
    contentEl.querySelectorAll('.react-player__preview').forEach(btn => {
      const m = (btn.getAttribute('style') || '').match(/vimeocdn\.com\/video\/(\d+)/);
      if (m) videos.push({ type: 'vimeo', id: m[1], player: `https://player.vimeo.com/video/${m[1]}` });
    });
    contentEl.querySelectorAll('iframe').forEach(iframe => {
      const src = iframe.src || '';
      if (/vimeo/i.test(src)) { const m = src.match(/vimeo\.com\/(?:video\/)?(\d+)/); videos.push({ type: 'vimeo', id: m?.[1] || '', player: src }); }
      else if (/youtube|youtu\.be/i.test(src)) videos.push({ type: 'youtube', player: src });
    });

    return JSON.stringify({ title, slug, author, publishedAt, views: null, categories, excerpt, coverImage, images, videos, rawHtml: contentEl.innerHTML, error: null });
  } catch(e) {
    return JSON.stringify({ error: e.message });
  }
};

// ─── Scrape des vues depuis le dashboard Wix ───────────────────────────────
const SCRAPE_VIEWS = () => {
  // Le dashboard liste les articles avec titre + vues dans un tableau
  const rows = [];
  document.querySelectorAll('[data-hook="post-list-item"], tr, [class*="tableRow"], [class*="postRow"]').forEach(row => {
    const title = row.querySelector('[data-hook="post-title"], [class*="postTitle"], [class*="title"]')?.innerText?.trim();
    const views = row.querySelector('[data-hook="post-views"], [class*="views"], [data-hook="views"]')?.innerText?.trim();
    if (title && views) rows.push({ title, views });
  });
  return rows;
};

// ─── Main ──────────────────────────────────────────────────────────────────
(async () => {
  console.log('🚀 Lancement...');

  const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  const page = await browser.newPage();
  page.on('pageerror', () => {});

  // ── Étape 1 : connexion + collecte des liens ───────────────────────────
  console.log('🔐 Ouverture du blog — connecte-toi si besoin, puis appuie sur Entrée.');
  await page.goto(BLOG_URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => process.stdin.once('data', r));

  console.log('\n📋 Collecte des liens d\'articles...');
  const allLinks = new Set();
  let pageNum = 1;
  let stuckCount = 0;

  while (true) {
    // Attendre que les articles soient chargés (lazy loading Wix)
    await page.waitForSelector('a[href*="/post/"]', { timeout: 15000 }).catch(() => {});
    await DELAY(2500); // laisser le lazy loading finir

    const prevCount = allLinks.size;
    const links = await page.mainFrame().evaluate(GET_LINKS);
    links.forEach(l => allLinks.add(l));

    console.log(`   Page ${pageNum} — ${allLinks.size} liens (${allLinks.size - prevCount} nouveaux)`);

    // Si aucun nouveau lien depuis 2 pages → on arrête
    if (allLinks.size === prevCount) {
      stuckCount++;
      if (stuckCount >= 2) { console.log('   ✅ Fin de pagination détectée.'); break; }
    } else {
      stuckCount = 0;
    }

    // Chercher la page suivante
    const next = await page.mainFrame().evaluate(GET_NEXT_PAGE_URL);

    if (!next) {
      console.log('   ✅ Aucun bouton suivant trouvé — fin.');
      break;
    }

    if (next.type === 'link') {
      await page.goto(next.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } else if (next.type === 'click') {
      const btn = await page.$(next.selector);
      if (!btn) { console.log('   ✅ Bouton suivant introuvable — fin.'); break; }
      await btn.click();
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => DELAY(3000));
    }

    pageNum++;
    await DELAY(1500);
  }

  const articleLinks = [...allLinks];
  console.log(`\n✅ ${articleLinks.length} articles trouvés\n`);

  // ── Étape 2 : scraping de chaque article ──────────────────────────────
  const articles = [];

  for (let idx = 0; idx < articleLinks.length; idx++) {
    const link = articleLinks[idx];
    console.log(`[${idx + 1}/${articleLinks.length}] ${link}`);

    let data = null;
    let attempts = 0;

    while (attempts < 3 && !data) {
      attempts++;
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });
        try { await page.waitForNetworkIdle({ idleTime: 1500, timeout: 8000 }); } catch(_) {}
        await DELAY(2000);

        const raw    = await page.mainFrame().evaluate(SCRAPE_ARTICLE);
        const parsed = JSON.parse(raw);
        if (parsed.error && !parsed.title) throw new Error(parsed.error);
        data = parsed;
      } catch(e) {
        console.warn(`   ⚠️  Tentative ${attempts}/3 : ${e.message}`);
        if (attempts < 3) await DELAY(4000);
      }
    }

    if (!data) { articles.push({ url: link, error: 'Failed after 3 attempts' }); continue; }
    data.url = link;

    // Téléchargement cover
    if (data.coverImage) {
      try {
        const ext  = path.extname(new URL(data.coverImage).pathname) || '.jpg';
        const name = `${normalizeSlug(data.slug)}-cover${ext}`;
        const dest = path.join(IMAGES_DIR, name);
        const ok   = await downloadImage(data.coverImage, dest);
        data.coverImageLocal = ok ? `./blog-images/${name}` : null;
        if (ok) console.log(`   🖼  Cover: ${name}`);
      } catch(_) {}
    }

    // Téléchargement images contenu
    const localImages = [];
    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      try {
        const ext  = path.extname(new URL(img.src).pathname) || '.jpg';
        const name = `${normalizeSlug(data.slug)}-img-${i + 1}${ext}`;
        const dest = path.join(IMAGES_DIR, name);
        const ok   = await downloadImage(img.src, dest);
        localImages.push({ ...img, local: ok ? `./blog-images/${name}` : null });
      } catch(_) { localImages.push({ ...img, local: null }); }
    }
    data.images = localImages;

    // Remplacer URLs par chemins locaux dans le HTML
    let html = data.rawHtml || '';
    for (const img of localImages) {
      if (img.local && img.src) html = html.split(img.src).join(img.local);
    }
    if (data.coverImage && data.coverImageLocal) html = html.split(data.coverImage).join(data.coverImageLocal);
    data.htmlForNovel = cleanHtml(html);
    delete data.rawHtml;

    articles.push(data);
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(articles, null, 2), 'utf8');
    console.log(`   💾 ${articles.length} articles sauvegardés`);

    await DELAY(1200);
  }

  // ── Étape 3 : récupération des vues depuis le dashboard ───────────────
  console.log('\n\n📊 Scraping terminé !');
  console.log('➡️  Ouverture du dashboard Wix pour récupérer les vues...');
  console.log('   Laisse la page charger complètement, puis appuie sur Entrée.');

  await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => process.stdin.once('data', r));

  // Attendre que le tableau soit chargé
  await DELAY(3000);
  await page.waitForSelector('[data-hook="post-list-item"], tr, [class*="tableRow"]', { timeout: 20000 }).catch(() => {});
  await DELAY(2000);

  // Faire défiler pour charger tous les articles
  await page.evaluate(async () => {
    await new Promise(r => {
      let total = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, 400);
        total += 400;
        if (total > document.body.scrollHeight) { clearInterval(timer); r(); }
      }, 300);
    });
  });
  await DELAY(1500);

  const viewsData = await page.mainFrame().evaluate(SCRAPE_VIEWS);
  console.log(`   📈 ${viewsData.length} entrées de vues récupérées`);

  // Associer les vues aux articles par titre
  let matched = 0;
  for (const article of articles) {
    const found = viewsData.find(v =>
      v.title?.toLowerCase().trim() === article.title?.toLowerCase().trim()
    );
    if (found) { article.views = found.views; matched++; }
  }
  console.log(`   ✅ ${matched}/${articles.length} articles associés`);

  // Sauvegarde finale
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(articles, null, 2), 'utf8');
  console.log(`\n🎉 Terminé ! ${articles.length} articles → ${OUTPUT_JSON}`);
  console.log(`   Images → ${IMAGES_DIR}`);

  await browser.close();
})();
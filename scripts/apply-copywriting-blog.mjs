/**
 * Applique la refonte copywriting du blog (voir scripts/data/copywriting-blog.mjs).
 *
 * Pour chaque article : titre, chapô (excerpt), meta description, catégorie si
 * elle était mal rattachée, réécriture du premier paragraphe, et remplacement
 * du bloc CTA de fin (les anciens pointent vers caroleherve.fr / Wooskill).
 *
 *   node scripts/apply-copywriting-blog.mjs            # dry-run, rapport seul
 *   node scripts/apply-copywriting-blog.mjs --apply    # écrit en base
 *   node scripts/apply-copywriting-blog.mjs --apply --drop-promo   # + retire les lignes de code promo BLOG10
 */

import { createClient } from "@supabase/supabase-js";
import { ARTICLES, CTA_TARGETS } from "./data/copywriting-blog.mjs";

const APPLY = process.argv.includes("--apply");
const DROP_PROMO = process.argv.includes("--drop-promo");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CTA_MARKER = "<!-- cta-accompagnement -->";
const BRAND = "#a0283e";

/** Bloc CTA : responsive sans media query (flex-wrap + min-width), image optionnelle. */
const buildCta = ({ href, text, label }, imageUrl) => {
  const image = imageUrl
    ? `<img src="${imageUrl}" alt="" style="flex: 0 0 200px; width: 200px; max-width: 100%; height: 180px; object-fit: cover;" />`
    : "";
  return `${CTA_MARKER}
<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 20px; border: 1px solid ${BRAND}; margin: 32px 0; overflow: hidden;">
  ${image}
  <div style="flex: 1 1 240px; min-width: 240px; padding: 20px 0; color: ${BRAND}; font-family: Georgia, serif; font-size: 18px; line-height: 1.4;">${text}</div>
  <div style="flex: 0 0 auto; padding: 20px 24px 20px 0;">
    <a href="${href}" style="display: inline-block; background: ${BRAND}; color: #fff; font-family: 'Montserrat', sans-serif; font-size: 17px; border-radius: 2px; padding: 14px 28px; text-decoration: none;">${label}</a>
  </div>
</div>`;
};

/**
 * Réécrit les liens de l'ancien site Wix (caroleherve.fr, hors ligne) et de
 * l'outil de réservation externe vers les pages équivalentes du site actuel.
 * Les liens éditoriaux (podcasts, YouTube, partenaires, Wooskill, sondages
 * Jotform) sont laissés intacts : ce ne sont pas des liens morts.
 */
const LINK_REWRITES = [
  [/https:\/\/www\.caroleherve\.fr\/page-d-accompagnement\/les-urgences-de-allaitement/g, "/accompagnements/les-urgences-allaitement"],
  [/https:\/\/www\.caroleherve\.fr\/page-d-accompagnement\//g, "/accompagnements/"],
  [/https:\/\/www\.caroleherve\.fr\/pack-essentiel-allaitement/g, "/accompagnements/pack-mon-allaitement-sur-mesure"],
  [/https:\/\/www\.caroleherve\.fr\/blog-newsletter/g, "/newsletter"],
  [/https:\/\/www\.gorendezvous\.com\/fr\/questiondallaitement\/?/g, "/reserver"],
  [/https:\/\/www\.gorendezvous\.com\/questiondallaitement\/?/g, "/reserver"],
];

const rewriteLegacyLinks = (html) => {
  let out = html;
  const applied = [];
  for (const [pattern, replacement] of LINK_REWRITES) {
    const hits = out.match(pattern);
    if (hits) {
      applied.push(`${hits.length}× → ${replacement}`);
      out = out.replace(pattern, replacement);
    }
  }
  return { html: out, applied };
};

const MAX_BLOCK = 3000;

/** Bornes du bloc CTA (div coloré marque) contenant l'index donné, ou null. */
const ctaRangeAt = (html, hit) => {
  const starts = [];
  for (let i = html.indexOf("<div"); i !== -1 && i < hit; i = html.indexOf("<div", i + 1)) starts.push(i);
  for (const start of starts) {
    const end = matchDiv(html, start);
    if (end === -1 || end <= hit || end - start > MAX_BLOCK) continue;
    return [start, end];
  }
  return null;
};

/** Tous les blocs CTA de l'article, dans l'ordre du document. */
const findCtaBlocks = (html) => {
  const blocks = [];
  let from = 0;
  while (true) {
    const hit = html.indexOf(BRAND, from);
    if (hit === -1) break;
    const range = ctaRangeAt(html, hit);
    if (!range) { from = hit + BRAND.length; continue; }
    blocks.push(range);
    from = range[1];
  }
  return blocks;
};

/**
 * Retire uniquement les blocs devenus inutiles : le CTA de fin d'article (il
 * est remplacé par celui du document de refonte) et les renvois vers le freebie
 * de l'ancien site, qui n'existe plus. Les autres bannières restent en place.
 */
const cleanCtaBlocks = (html) => {
  const removed = [];
  // Marqueurs d'un passage précédent : le script doit rester rejouable.
  let out = html.replace(/<!-- cta-accompagnement -->\s*/g, "");

  // Freebie disparu : suppression pure.
  for (let guard = 0; guard < 12; guard += 1) {
    const blocks = findCtaBlocks(out).filter(([s, e]) => out.slice(s, e).includes("freebie-conservation"));
    if (!blocks.length) break;
    const [s, e] = blocks[0];
    removed.push({ reason: "freebie hors ligne", html: out.slice(s, e) });
    out = out.slice(0, s) + out.slice(e);
  }

  // CTA de fin d'article : seul le dernier bloc, et seulement s'il est vraiment
  // en fin de corps (moins de 400 caractères de contenu après lui).
  const blocks = findCtaBlocks(out);
  if (blocks.length) {
    const [s, e] = blocks[blocks.length - 1];
    const tail = textOf(out.slice(e));
    if (tail.length < 400) {
      removed.push({ reason: "CTA de fin remplacé", html: out.slice(s, e) });
      out = out.slice(0, s) + out.slice(e);
    }
  }

  if (DROP_PROMO) {
    out = out.replace(/<p\b[^>]*>(?:(?!<\/p>)[\s\S])*BLOG10(?:(?!<\/p>)[\s\S])*<\/p>\s*/g, "");
  }
  return { html: out, removed };
};

/** Index de fin (exclusif) du </div> fermant le <div> ouvert à `start`. */
const matchDiv = (html, start) => {
  const tag = /<\/?div\b/gi;
  tag.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = tag.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.indexOf(">", m.index) + 1;
  }
  return -1;
};

/** Remplace le premier paragraphe (ancien chapô) par l'introduction réécrite. */
const replaceIntro = (html, intro) => {
  const m = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/);
  const paragraph = `<p>${intro}</p>`;
  if (!m) return { html: `${paragraph}\n${html}`, replaced: null };
  return {
    html: html.slice(0, m.index) + paragraph + html.slice(m.index + m[0].length),
    replaced: m[0],
  };
};

const textOf = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const clampMeta = (s) => (s.length <= 158 ? s : `${s.slice(0, 155).replace(/[\s,;:]+$/, "")}…`);

// ─── Chargement ──────────────────────────────────────────────────────────────
const [{ data: posts, error: e1 }, { data: cats, error: e2 }, { data: formations, error: e3 }] =
  await Promise.all([
    db.from("blog_posts").select("id, slug, title, excerpt, body_html, meta_description, category_id"),
    db.from("blog_categories").select("id, slug, name"),
    db.from("accompagnements").select("slug, thumbnail_url"),
  ]);
for (const e of [e1, e2, e3]) if (e) { console.error("❌", e.message); process.exit(1); }

const bySlug = new Map(posts.map((p) => [p.slug, p]));
const catBySlug = new Map(cats.map((c) => [c.slug, c]));
const catById = new Map(cats.map((c) => [c.id, c]));
const thumbBySlug = new Map(formations.map((f) => [f.slug, f.thumbnail_url]));

// ─── Vérifications avant toute écriture ──────────────────────────────────────
const problems = [];
const seen = new Set();
for (const a of ARTICLES) {
  if (seen.has(a.slug)) problems.push(`doublon dans le mapping : ${a.slug}`);
  seen.add(a.slug);
  if (!bySlug.has(a.slug)) problems.push(`slug absent en base : ${a.slug}`);
  if (!CTA_TARGETS[a.cta]) problems.push(`cible CTA inconnue (${a.cta}) : ${a.slug}`);
  if (a.category && !catBySlug.has(a.category)) problems.push(`catégorie inconnue (${a.category}) : ${a.slug}`);
}
for (const p of posts) if (!seen.has(p.slug)) problems.push(`article en base non couvert par le mapping : ${p.slug}`);
if (problems.length) {
  console.error("❌ Mapping incohérent, rien n'a été écrit :");
  problems.forEach((p) => console.error("   -", p));
  process.exit(1);
}

// ─── Application ─────────────────────────────────────────────────────────────
const report = [];
for (const a of ARTICLES) {
  const post = bySlug.get(a.slug);
  const target = CTA_TARGETS[a.cta];
  const thumb = target.formation ? thumbBySlug.get(target.formation) ?? null : null;

  const rewritten = rewriteLegacyLinks(post.body_html);
  const stripped = cleanCtaBlocks(rewritten.html);
  const withIntro = replaceIntro(stripped.html, a.intro);
  const body = `${withIntro.html.trimEnd()}\n\n${buildCta(target, thumb)}\n`;

  const patch = {
    title: a.title,
    excerpt: a.hook,
    meta_description: clampMeta(a.hook),
    body_html: body,
  };
  if (a.category) patch.category_id = catBySlug.get(a.category).id;

  report.push({
    slug: a.slug,
    oldTitle: post.title.trim(),
    newTitle: a.title,
    categoryChange: a.category
      ? `${catById.get(post.category_id)?.name ?? "—"} → ${catBySlug.get(a.category).name}`
      : null,
    linksRewritten: rewritten.applied,
    ctaRemoved: stripped.removed.length,
    ctaRemovedTargets: stripped.removed.map(
      (b) => `${b.reason} (${(b.html.match(/href="([^"]+)"/) || [])[1] ?? "?"})`,
    ),
    ctaAdded: target.href,
    introReplaced: withIntro.replaced ? textOf(withIntro.replaced).slice(0, 90) : "(aucun <p> trouvé — intro ajoutée en tête)",
    promoLeft: /BLOG10/.test(body),
    sizeDelta: body.length - post.body_html.length,
  });

  if (APPLY) {
    const { error } = await db.from("blog_posts").update(patch).eq("id", post.id);
    if (error) {
      console.error(`❌ ${a.slug} : ${error.message}`);
      process.exit(1);
    }
  }
}

// ─── Rapport ─────────────────────────────────────────────────────────────────
console.log(APPLY ? "✅ APPLIQUÉ EN BASE\n" : "🔍 DRY-RUN (aucune écriture)\n");
for (const r of report) {
  console.log(`── ${r.slug}`);
  console.log(`   titre    : ${r.oldTitle}\n              → ${r.newTitle}`);
  if (r.categoryChange) console.log(`   catégorie: ${r.categoryChange}`);
  console.log(`   intro    : remplace « ${r.introReplaced}… »`);
  if (r.linksRewritten.length) console.log(`   liens    : ${r.linksRewritten.join(" · ")}`);
  console.log(`   CTA      : ${r.ctaRemoved} retiré(s)${r.ctaRemovedTargets.length ? ` [${r.ctaRemovedTargets.join(" | ")}]` : ""} → ${r.ctaAdded}`);
  if (r.promoLeft) console.log("   ⚠ code promo BLOG10 encore présent dans le corps");
  console.log(`   taille   : ${r.sizeDelta > 0 ? "+" : ""}${r.sizeDelta} caractères`);
}
const promo = report.filter((r) => r.promoLeft).length;
const noCta = report.filter((r) => r.ctaRemoved === 0).length;
console.log(`\nRésumé : ${report.length} articles · ${report.reduce((n, r) => n + r.ctaRemoved, 0)} anciens CTA retirés · ${noCta} sans CTA préexistant · ${report.filter((r) => r.categoryChange).length} catégories corrigées · ${promo} mentions BLOG10 restantes`);

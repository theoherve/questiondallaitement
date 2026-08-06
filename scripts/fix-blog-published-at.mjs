#!/usr/bin/env node
/**
 * Recale la date de publication des articles repris de Wix.
 *
 * L'import initial posait `published_at = now()` : les 54 articles scrapes
 * portent donc tous la date du backfill au lieu de leur date d'origine, encore
 * presente dans blog-scraper/wix-blog.json (`publishedAt`).
 *
 * Le rapprochement se fait par slug, avec la meme fonction de slugification que
 * scripts/import-wix-blog.mjs.
 *
 * Usage:
 *   source .env.local && node scripts/fix-blog-published-at.mjs            # dry-run
 *   source .env.local && node scripts/fix-blog-published-at.mjs --apply    # ecrit
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "blog-scraper/wix-blog.json");
const APPLY = process.argv.includes("--apply");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Run: source .env.local && node scripts/fix-blog-published-at.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function resolveSlug(rawSlug) {
  try {
    return slugify(decodeURIComponent(rawSlug));
  } catch {
    return slugify(rawSlug);
  }
}

const wixPosts = JSON.parse(readFileSync(SOURCE, "utf8"));
const wanted = new Map();
for (const post of wixPosts) {
  if (!post.slug || !post.publishedAt) continue;
  wanted.set(resolveSlug(post.slug), new Date(post.publishedAt).toISOString());
}

console.log(
  `\n📅 ${wanted.size} dates d'origine trouvees dans wix-blog.json${APPLY ? "" : " (dry-run)"}\n`,
);

const { data: posts, error } = await supabase
  .from("blog_posts")
  .select("id, slug, title, published_at")
  .in("slug", [...wanted.keys()]);

if (error) {
  console.error("❌ Lecture blog_posts:", error.message);
  process.exit(1);
}

const missing = [...wanted.keys()].filter(
  (slug) => !posts.some((p) => p.slug === slug),
);

let updated = 0;
let unchanged = 0;

for (const post of posts) {
  const target = wanted.get(post.slug);
  const current = post.published_at ? new Date(post.published_at).toISOString() : null;

  if (current === target) {
    unchanged += 1;
    continue;
  }

  console.log(
    `   ${post.slug}\n      ${current ?? "(vide)"} → ${target}`,
  );

  if (APPLY) {
    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ published_at: target })
      .eq("id", post.id);

    if (updateError) {
      console.error(`   ❌ ${post.slug}: ${updateError.message}`);
      continue;
    }
  }

  updated += 1;
}

console.log(
  `\n${APPLY ? "✅" : "🔍"} ${updated} article(s) ${APPLY ? "recale(s)" : "a recaler"}, ${unchanged} deja a jour`,
);

if (missing.length) {
  console.log(`\n⚠️  ${missing.length} slug(s) absent(s) en base :`);
  for (const slug of missing) console.log(`   - ${slug}`);
}

if (!APPLY) {
  console.log("\nRelancer avec --apply pour ecrire les dates.");
}

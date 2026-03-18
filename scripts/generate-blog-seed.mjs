#!/usr/bin/env node
/**
 * Generates supabase/seed_blog.sql from blog-scraper/wix-blog.json
 *
 * Usage: node scripts/generate-blog-seed.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const posts = JSON.parse(
  readFileSync(join(ROOT, "blog-scraper/wix-blog.json"), "utf-8")
);

// Main categories (the structured ones from Wix sidebar)
const MAIN_CATEGORIES = [
  "Accueillir bébé",
  "Douleurs",
  "Augmenter la lactation",
  "Équilibre allaitement - vie active",
  "Diversification",
  "Sevrage",
  "Sommeil du tout petit",
  "Consultante en lactation",
  "Allaitement bambin",
  "Formation",
];

function escapeSQL(str) {
  if (!str) return "";
  return str.replace(/'/g, "''");
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let sql = `-- Generated from blog-scraper/wix-blog.json
-- Source: scripts/generate-blog-seed.mjs
-- Run via: pnpm db:seed (included from seed.sql)

BEGIN;

-- ─── Blog categories ──────────────────────────────────────────
`;

// Insert main categories
MAIN_CATEGORIES.forEach((cat, i) => {
  const slug = slugify(cat);
  sql += `INSERT INTO blog_categories (name, slug, position)
VALUES ('${escapeSQL(cat)}', '${slug}', ${i + 1})
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position;\n`;
});

sql += `\n-- ─── Blog posts ────────────────────────────────────────────────\n`;

// Consultant ID (same as seed.sql)
const CID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

for (const post of posts) {
  if (post.error) continue;

  const title = escapeSQL(post.title);
  // Decode the URL-encoded slug from Wix
  let slug;
  try {
    slug = decodeURIComponent(post.slug);
  } catch {
    slug = post.slug;
  }
  slug = escapeSQL(slug);

  const excerpt = escapeSQL(post.excerpt || "");
  const bodyHtml = escapeSQL(post.htmlForNovel || "");
  const thumbnailUrl = escapeSQL(post.coverImage || "");

  // Determine primary category (first main category found)
  const postCategories = post.categories || [];
  const primaryCategory = postCategories.find((c) =>
    MAIN_CATEGORIES.includes(c)
  );
  const primaryCategorySlug = primaryCategory ? slugify(primaryCategory) : null;

  // All categories as tags
  const tags = postCategories
    .filter((c) => !c.startsWith("#")) // skip numeric tags like #1, #2
    .map((c) => escapeSQL(c));

  const tagsArray =
    tags.length > 0
      ? `ARRAY[${tags.map((t) => `'${t}'`).join(", ")}]`
      : "'{}'";

  const categorySubquery = primaryCategorySlug
    ? `(SELECT id FROM blog_categories WHERE slug = '${primaryCategorySlug}')`
    : "NULL";

  sql += `
INSERT INTO blog_posts (
  title, slug, excerpt, body_html, thumbnail_url,
  category_id, author_id, consultant_id,
  status, tags, published_at, meta_description
)
VALUES (
  '${title}',
  '${slug}',
  '${excerpt}',
  '${bodyHtml}',
  '${thumbnailUrl}',
  ${categorySubquery},
  '${CID}',
  '${CID}',
  'published',
  ${tagsArray},
  now(),
  '${excerpt}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body_html = EXCLUDED.body_html,
  thumbnail_url = EXCLUDED.thumbnail_url,
  category_id = EXCLUDED.category_id,
  tags = EXCLUDED.tags,
  meta_description = EXCLUDED.meta_description,
  updated_at = now();
`;
}

sql += `\nCOMMIT;\n`;

const outPath = join(ROOT, "supabase/seed_blog.sql");
writeFileSync(outPath, sql, "utf-8");
console.log(`✅ Written ${outPath} (${posts.length} posts)`);

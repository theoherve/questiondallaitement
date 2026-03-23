#!/usr/bin/env node
/**
 * Import Wix blog posts into Supabase
 *
 * 1. Uploads images from blog-scraper/blog-images/ to Supabase Storage (bucket: blog)
 * 2. Replaces local image paths in HTML with Supabase public URLs
 * 3. Creates blog categories
 * 4. Inserts blog posts
 *
 * Usage: node scripts/import-wix-blog.mjs [--dry-run]
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "blog-scraper/blog-images");
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Supabase client (service role) ─────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Run: source .env.local && node scripts/import-wix-blog.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Constants ──────────────────────────────────────────────────────────────
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

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getPublicUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/blog/${storagePath}`;
}

// ─── Step 1: Upload images to Supabase Storage ─────────────────────────────
async function uploadImages(posts) {
  console.log("\n📸 Uploading images to Supabase Storage...\n");

  // Collect all unique local image paths
  const localToRemote = new Map();

  for (const post of posts) {
    if (post.error) continue;

    // Cover image
    if (post.coverImageLocal) {
      localToRemote.set(post.coverImageLocal, null);
    }

    // Content images
    for (const img of post.images || []) {
      if (img.local) {
        localToRemote.set(img.local, null);
      }
    }
  }

  console.log(`   ${localToRemote.size} unique images to upload\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [localPath] of localToRemote) {
    // localPath is like ./blog-images/slug-cover.jpg
    const filename = localPath.replace("./blog-images/", "");
    const fullPath = join(IMAGES_DIR, filename);
    const storagePath = `wix-import/${filename}`;

    if (!existsSync(fullPath)) {
      console.warn(`   ⚠️  File not found: ${fullPath}`);
      failed++;
      continue;
    }

    const ext = extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || "image/jpeg";

    if (DRY_RUN) {
      localToRemote.set(localPath, getPublicUrl(storagePath));
      skipped++;
      continue;
    }

    const fileBuffer = readFileSync(fullPath);

    const { error } = await supabase.storage
      .from("blog")
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.warn(`   ❌ Upload failed: ${filename} — ${error.message}`);
      failed++;
    } else {
      uploaded++;
      if (uploaded % 10 === 0) console.log(`   ✅ ${uploaded} images uploaded...`);
    }

    localToRemote.set(localPath, getPublicUrl(storagePath));
  }

  console.log(`\n   📊 Images: ${uploaded} uploaded, ${skipped} skipped (dry-run), ${failed} failed`);
  return localToRemote;
}

// ─── Step 2: Create categories ──────────────────────────────────────────────
async function createCategories() {
  console.log("\n📁 Creating categories...\n");

  const categoryMap = new Map();

  for (let i = 0; i < MAIN_CATEGORIES.length; i++) {
    const name = MAIN_CATEGORIES[i];
    const slug = slugify(name);

    if (DRY_RUN) {
      console.log(`   [dry-run] Category: ${name} (${slug})`);
      categoryMap.set(name, `dry-run-${slug}`);
      continue;
    }

    const { data, error } = await supabase
      .from("blog_categories")
      .upsert({ name, slug, position: i + 1 }, { onConflict: "slug" })
      .select("id")
      .single();

    if (error) {
      console.warn(`   ❌ Category "${name}": ${error.message}`);
    } else {
      categoryMap.set(name, data.id);
      console.log(`   ✅ ${name} → ${data.id}`);
    }
  }

  return categoryMap;
}

// ─── Step 3: Import posts ───────────────────────────────────────────────────
async function importPosts(posts, imageMap, categoryMap) {
  console.log("\n📝 Importing blog posts...\n");

  // Get an admin user to use as author_id
  const { data: adminUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .single();

  if (!adminUser && !DRY_RUN) {
    console.error("❌ No admin user found in profiles table. Cannot set author_id.");
    process.exit(1);
  }

  const authorId = adminUser?.id || "dry-run-author";

  // Check for consultant
  const { data: consultant } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "consultant")
    .limit(1)
    .single();

  const consultantId = consultant?.id || null;

  let imported = 0;
  let errors = 0;

  for (const post of posts) {
    if (post.error) {
      console.warn(`   ⏭️  Skipping post with error: ${post.url}`);
      continue;
    }

    // Replace local image paths with Supabase URLs in HTML
    let bodyHtml = post.htmlForNovel || "";
    for (const [localPath, remoteUrl] of imageMap) {
      if (remoteUrl) {
        bodyHtml = bodyHtml.split(localPath).join(remoteUrl);
      }
    }

    // Also replace any remaining Wix CDN URLs for images we have locally
    for (const img of post.images || []) {
      if (img.src && img.local && imageMap.has(img.local)) {
        const remoteUrl = imageMap.get(img.local);
        if (remoteUrl) {
          bodyHtml = bodyHtml.split(img.src).join(remoteUrl);
        }
      }
    }

    // Resolve cover image URL
    let thumbnailUrl = null;
    if (post.coverImageLocal && imageMap.has(post.coverImageLocal)) {
      thumbnailUrl = imageMap.get(post.coverImageLocal);
    } else if (post.coverImage) {
      thumbnailUrl = post.coverImage; // fallback to Wix CDN
    }

    // Resolve category (first matching main category)
    const postCategories = post.categories || [];
    const primaryCategory = postCategories.find((c) => MAIN_CATEGORIES.includes(c)) || null;
    const categoryId = primaryCategory ? categoryMap.get(primaryCategory) || null : null;

    // Tags
    const tags = postCategories.filter((c) => !c.startsWith("#"));

    // Slug
    let slug;
    try {
      slug = slugify(decodeURIComponent(post.slug));
    } catch {
      slug = slugify(post.slug);
    }

    const postData = {
      title: post.title,
      slug,
      excerpt: (post.excerpt || "").substring(0, 300) || null,
      body_html: bodyHtml,
      thumbnail_url: thumbnailUrl,
      category_id: categoryId,
      author_id: authorId,
      consultant_id: consultantId,
      status: "published",
      tags,
      published_at: new Date().toISOString(),
      meta_description: (post.excerpt || "").substring(0, 160) || null,
    };

    if (DRY_RUN) {
      console.log(`   [dry-run] "${post.title}" → slug: ${slug}, category: ${primaryCategory || "none"}`);
      imported++;
      continue;
    }

    const { error } = await supabase
      .from("blog_posts")
      .upsert(postData, { onConflict: "slug" });

    if (error) {
      console.error(`   ❌ "${post.title}": ${error.message}`);
      errors++;
    } else {
      imported++;
      console.log(`   ✅ [${imported}] ${post.title}`);
    }
  }

  console.log(`\n   📊 Posts: ${imported} imported, ${errors} errors`);
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Wix Blog → Supabase Import");
  if (DRY_RUN) console.log("   ⚡ DRY RUN — no changes will be made\n");

  const posts = JSON.parse(
    readFileSync(join(ROOT, "blog-scraper/wix-blog.json"), "utf-8")
  );
  console.log(`   📄 ${posts.length} posts found in wix-blog.json`);

  const imageMap = await uploadImages(posts);
  const categoryMap = await createCategories();
  await importPosts(posts, imageMap, categoryMap);

  console.log("\n🎉 Import terminé !");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});

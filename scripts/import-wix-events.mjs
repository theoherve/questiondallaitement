#!/usr/bin/env node
/**
 * Import Wix events into Supabase
 *
 * 1. Uploads main images to Supabase Storage (bucket: formations)
 * 2. Replaces local image paths with Supabase public URLs
 * 3. Inserts events into the events table
 *
 * Usage:
 *   source .env.local && node scripts/import-wix-events.mjs
 *   source .env.local && node scripts/import-wix-events.mjs --dry-run
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "formations-scraper/formations-images");
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Supabase client ────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getPublicUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/formations/${storagePath}`;
}

function determineEventType(locationType, locationName) {
  if (locationType === "ONLINE") return "online";
  const loc = (locationName || "").toLowerCase();
  if (loc.includes("visio") || loc.includes("zoom") || loc.includes("en ligne")) return "online";
  if (loc.includes("hybride")) return "hybrid";
  return "in_person";
}

// ─── Upload images ──────────────────────────────────────────────────────────
async function uploadImages(events) {
  console.log("\n📸 Uploading images to Supabase Storage...\n");

  const imageMap = new Map();

  for (const evt of events) {
    if (evt.mainImageLocal) {
      imageMap.set(evt.mainImageLocal, null);
    }
  }

  console.log(`   ${imageMap.size} unique images to upload\n`);

  let uploaded = 0;
  let failed = 0;

  for (const [localPath] of imageMap) {
    const filename = localPath.replace("./formations-images/", "");
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
      imageMap.set(localPath, getPublicUrl(storagePath));
      continue;
    }

    const fileBuffer = readFileSync(fullPath);
    const { error } = await supabase.storage
      .from("accompagnements")
      .upload(storagePath, fileBuffer, { contentType, upsert: true });

    if (error) {
      console.warn(`   ❌ Upload failed: ${filename} — ${error.message}`);
      failed++;
    } else {
      uploaded++;
      if (uploaded % 20 === 0) console.log(`   ✅ ${uploaded} images uploaded...`);
    }

    imageMap.set(localPath, getPublicUrl(storagePath));
  }

  console.log(`\n   📊 Images: ${uploaded} uploaded, ${failed} failed`);
  return imageMap;
}

// ─── Import events ──────────────────────────────────────────────────────────
async function importEvents(events, imageMap) {
  console.log("\n📝 Importing events...\n");

  // Get consultant to use as consultant_id
  const { data: consultant } = await supabase
    .from("consultants")
    .select("id")
    .eq("slug", "carole-herve")
    .single();

  if (!consultant && !DRY_RUN) {
    console.error("❌ No consultant 'carole-herve' found.");
    process.exit(1);
  }

  const consultantId = consultant?.id || "dry-run-consultant";

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const evt of events) {
    if (evt.error) {
      console.warn(`   ⏭️  Skipping event with error: ${evt.url}`);
      skipped++;
      continue;
    }

    // Skip canceled events
    if (evt.status === "canceled") {
      skipped++;
      continue;
    }

    // Skip events without dates
    if (!evt.startDate || !evt.endDate) {
      console.warn(`   ⏭️  Skipping "${evt.title}" — no dates`);
      skipped++;
      continue;
    }

    const slug = slugify(evt.slug || evt.title);

    // Resolve thumbnail
    let thumbnailUrl = null;
    if (evt.mainImageLocal && imageMap.has(evt.mainImageLocal)) {
      thumbnailUrl = imageMap.get(evt.mainImageLocal);
    } else if (evt.mainImage?.url) {
      thumbnailUrl = evt.mainImage.url;
    }

    // Long description from HTML
    const longDescription = evt.htmlForApp || evt.descriptionHtml || null;

    const eventType = determineEventType(evt.locationType, evt.location);

    // Determine if published: UPCOMING → published, ENDED → published
    const isPublished = evt.status !== "canceled";

    const eventData = {
      consultant_id: consultantId,
      title: evt.title?.trim(),
      slug,
      description: (evt.descriptionText || evt.excerpt || "").substring(0, 500) || null,
      long_description: longDescription,
      type: eventType,
      starts_at: new Date(evt.startDate).toISOString(),
      ends_at: new Date(evt.endDate).toISOString(),
      location: evt.location || null,
      price_cents: 0,
      currency: "eur",
      max_participants: evt.capacity ? parseInt(evt.capacity, 10) || null : null,
      thumbnail_url: thumbnailUrl,
      is_published: isPublished,
    };

    if (DRY_RUN) {
      const emoji = evt.status === "upcoming" ? "🟢" : "⚪";
      console.log(`   ${emoji} [dry-run] "${evt.title?.substring(0, 50)}" → ${slug} (${evt.status})`);
      imported++;
      continue;
    }

    const { error } = await supabase
      .from("formations")
      .upsert(eventData, { onConflict: "slug" });

    if (error) {
      console.error(`   ❌ "${evt.title}": ${error.message}`);
      errors++;
    } else {
      imported++;
      const emoji = evt.status === "upcoming" ? "🟢" : "⚪";
      console.log(`   ${emoji} [${imported}] ${evt.title?.substring(0, 60)}`);
    }
  }

  console.log(`\n   📊 Events: ${imported} imported, ${skipped} skipped, ${errors} errors`);
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Wix Events → Supabase Import");
  if (DRY_RUN) console.log("   ⚡ DRY RUN — no changes will be made\n");

  const events = JSON.parse(
    readFileSync(join(ROOT, "formations-scraper/wix-formations-pro.json"), "utf-8")
  );
  console.log(`   📄 ${events.length} events found in wix-formations-pro.json`);

  const imageMap = await uploadImages(events);
  await importEvents(events, imageMap);

  console.log("\n🎉 Import terminé !");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});

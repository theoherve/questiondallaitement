#!/usr/bin/env node
/**
 * Fetch all blog posts from Wix REST API and save to blog-scraper/wix-blog.json
 *
 * - Fetches all posts with richContent via the Wix Blog API
 * - Fetches categories
 * - Converts Ricos JSON → HTML
 * - Downloads images to blog-scraper/blog-images/
 * - Outputs wix-blog.json in the same format the import script expects
 *
 * Usage:
 *   source .env.local && node scripts/fetch-wix-blog.mjs
 *   source .env.local && node scripts/fetch-wix-blog.mjs --dry-run
 */

import { writeFileSync, mkdirSync, createWriteStream, existsSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "blog-scraper/blog-images");
const OUTPUT_JSON = join(ROOT, "blog-scraper/wix-blog.json");
const DRY_RUN = process.argv.includes("--dry-run");

mkdirSync(IMAGES_DIR, { recursive: true });

// ─── Config ─────────────────────────────────────────────────────────────────
const WIX_API_KEY = process.env.WIX;
const WIX_SITE_ID = "c8e39045-30eb-4cb6-b302-90fd21cf6751";
const WIX_API_BASE = "https://www.wixapis.com";

if (!WIX_API_KEY) {
  console.error("❌ Missing WIX env var. Run: source .env.local && node scripts/fetch-wix-blog.mjs");
  process.exit(1);
}

const HEADERS = {
  Authorization: WIX_API_KEY,
  "wix-site-id": WIX_SITE_ID,
  "Content-Type": "application/json",
};

// ─── HTTP helpers ───────────────────────────────────────────────────────────
async function wixGet(path) {
  const url = `${WIX_API_BASE}${path}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

function downloadImage(imgUrl, destPath) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(imgUrl);
      const client = parsed.protocol === "https:" ? https : http;
      const file = createWriteStream(destPath);
      const req = client.get(imgUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          try { require("fs").unlinkSync(destPath); } catch {}
          return downloadImage(res.headers.location, destPath).then(resolve);
        }
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(true); });
      });
      req.on("error", () => resolve(false));
      req.setTimeout(15000, () => { req.destroy(); resolve(false); });
    } catch { resolve(false); }
  });
}

// ─── Slugify ────────────────────────────────────────────────────────────────
function slugify(text) {
  return decodeURIComponent(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[''`]/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Ricos → HTML converter ────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wixImageUrl(mediaId, width, height) {
  if (!mediaId) return "";
  if (mediaId.startsWith("http")) return mediaId;
  const w = width || 1200;
  const h = height || 800;
  return `https://static.wixstatic.com/media/${mediaId}/v1/fill/w_${w},h_${h},al_c,q_90,enc_auto/${mediaId}`;
}

function applyDecorations(text, decorations) {
  let html = escapeHtml(text);
  if (!decorations?.length) return html;

  for (const dec of decorations) {
    switch (dec.type) {
      case "BOLD":
        html = `<strong>${html}</strong>`;
        break;
      case "ITALIC":
        html = `<em>${html}</em>`;
        break;
      case "UNDERLINE":
        html = `<u>${html}</u>`;
        break;
      case "LINK":
        html = `<a href="${escapeHtml(dec.linkData?.link?.url || "")}">${html}</a>`;
        break;
      case "ANCHOR":
        html = `<a href="#${escapeHtml(dec.anchorData?.anchor || "")}">${html}</a>`;
        break;
      case "SUPERSCRIPT":
        html = `<sup>${html}</sup>`;
        break;
      // COLOR and FONT_SIZE: skip inline styles for cleaner HTML
    }
  }
  return html;
}

function processInlineNodes(nodes) {
  return (nodes || [])
    .map((n) => {
      if (n.type === "TEXT") {
        return applyDecorations(n.textData?.text || "", n.textData?.decorations);
      }
      return "";
    })
    .join("");
}

function ricosToHtml(nodes, imageCollector) {
  return (nodes || [])
    .map((node) => {
      switch (node.type) {
        case "PARAGRAPH": {
          const inner = processInlineNodes(node.nodes);
          return inner ? `<p>${inner}</p>` : "";
        }
        case "HEADING": {
          const level = node.headingData?.level || 2;
          const inner = processInlineNodes(node.nodes);
          return `<h${level}>${inner}</h${level}>`;
        }
        case "BLOCKQUOTE":
          return `<blockquote>${ricosToHtml(node.nodes, imageCollector)}</blockquote>`;
        case "BULLETED_LIST":
          return `<ul>${ricosToHtml(node.nodes, imageCollector)}</ul>`;
        case "ORDERED_LIST":
          return `<ol>${ricosToHtml(node.nodes, imageCollector)}</ol>`;
        case "LIST_ITEM":
          return `<li>${ricosToHtml(node.nodes, imageCollector)}</li>`;
        case "IMAGE": {
          const imgData = node.imageData;
          const mediaId = imgData?.image?.src?.id || imgData?.image?.src?.url || "";
          const w = imgData?.image?.width;
          const h = imgData?.image?.height;
          const alt = imgData?.altText || "";
          const src = wixImageUrl(mediaId, w, h);
          if (src && imageCollector) {
            imageCollector.push({ src, alt, uri: mediaId });
          }
          // Caption
          const captionNode = (node.nodes || []).find((n) => n.type === "CAPTION");
          const caption = captionNode ? processInlineNodes(captionNode.nodes) : "";
          if (caption) {
            return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" /><figcaption>${caption}</figcaption></figure>`;
          }
          return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`;
        }
        case "VIDEO": {
          const videoData = node.videoData;
          const videoSrc = videoData?.video?.src?.url || "";
          if (videoSrc) {
            return `<div class="video-embed"><iframe src="${escapeHtml(videoSrc)}" frameborder="0" allowfullscreen></iframe></div>`;
          }
          return "";
        }
        case "HTML":
          return node.htmlData?.html || "";
        case "TABLE": {
          const rows = (node.nodes || [])
            .map((row) => {
              if (row.type !== "TABLE_ROW") return "";
              const cells = (row.nodes || [])
                .map((cell) => {
                  if (cell.type !== "TABLE_CELL") return "";
                  const inner = ricosToHtml(cell.nodes, imageCollector);
                  return `<td>${inner}</td>`;
                })
                .join("");
              return `<tr>${cells}</tr>`;
            })
            .join("");
          return `<table>${rows}</table>`;
        }
        case "BUTTON": {
          const btnData = node.buttonData;
          const text = btnData?.text || "Lien";
          const url = btnData?.link?.url || "#";
          return `<a href="${escapeHtml(url)}" class="button">${escapeHtml(text)}</a>`;
        }
        case "GALLERY": {
          // Render gallery images inline
          const items = node.galleryData?.items || [];
          const imgs = items
            .map((item) => {
              const src = item.image?.media?.src?.url || wixImageUrl(item.image?.media?.src?.id);
              const alt = item.altText || "";
              if (src && imageCollector) imageCollector.push({ src, alt, uri: "" });
              return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`;
            })
            .join("");
          return `<div class="gallery">${imgs}</div>`;
        }
        case "CAPTION":
          // Handled inside IMAGE
          return "";
        case "TEXT":
          // Should be handled by processInlineNodes, but just in case
          return applyDecorations(node.textData?.text || "", node.textData?.decorations);
        default:
          // Recurse for unknown container nodes
          if (node.nodes?.length) return ricosToHtml(node.nodes, imageCollector);
          return "";
      }
    })
    .join("\n");
}

// ─── Fetch all posts ────────────────────────────────────────────────────────
async function fetchAllPosts() {
  console.log("📡 Fetching posts from Wix API...\n");

  const allPosts = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const params = new URLSearchParams({
      "paging.limit": limit.toString(),
      "paging.offset": offset.toString(),
    });
    // Add fieldsets individually
    const url = `/v3/posts?${params}&fieldsToInclude=RICH_CONTENT&fieldsToInclude=URL&fieldsToInclude=METRICS&fieldsToInclude=SEO`;

    const data = await wixGet(url);
    const posts = data.posts || [];
    allPosts.push(...posts);

    console.log(`   Fetched ${allPosts.length}/${data.metaData?.total || "?"} posts`);

    if (posts.length < limit || allPosts.length >= (data.metaData?.total || 0)) break;
    offset += limit;
  }

  return allPosts;
}

// ─── Fetch categories ───────────────────────────────────────────────────────
async function fetchCategories() {
  console.log("\n📁 Fetching categories...\n");
  const data = await wixGet("/blog/v3/categories");
  const cats = data.categories || [];

  const catMap = new Map();
  for (const cat of cats) {
    catMap.set(cat.id, cat.label);
    console.log(`   ${cat.label} (${cat.postCount} posts)`);
  }
  return catMap;
}

// ─── Process posts ──────────────────────────────────────────────────────────
async function processPosts(wixPosts, categoryMap) {
  console.log("\n🔄 Processing posts...\n");

  const articles = [];
  let totalImages = 0;

  for (let i = 0; i < wixPosts.length; i++) {
    const post = wixPosts[i];
    const slug = slugify(post.slug);

    // Convert Ricos → HTML
    const imageCollector = [];
    const bodyHtml = ricosToHtml(post.richContent?.nodes || [], imageCollector);

    // Cover image
    const coverMedia = post.media?.wixMedia?.image;
    let coverImage = "";
    if (coverMedia) {
      coverImage = coverMedia.url || wixImageUrl(coverMedia.id, coverMedia.width, coverMedia.height);
    }

    // Resolve category names from IDs
    const categories = (post.categoryIds || [])
      .map((id) => categoryMap.get(id))
      .filter(Boolean);

    // Download images
    let coverImageLocal = null;
    const localImages = [];

    if (!DRY_RUN) {
      // Download cover
      if (coverImage) {
        const ext = safeExt(coverImage) || ".jpg";
        const name = `${slug}-cover${ext}`;
        const dest = join(IMAGES_DIR, name);
        const ok = await downloadImage(coverImage, dest);
        if (ok) {
          coverImageLocal = `./blog-images/${name}`;
          totalImages++;
        }
      }

      // Download content images
      for (let j = 0; j < imageCollector.length; j++) {
        const img = imageCollector[j];
        const ext = safeExt(img.src) || ".jpg";
        const name = `${slug}-img-${j + 1}${ext}`;
        const dest = join(IMAGES_DIR, name);
        const ok = await downloadImage(img.src, dest);
        const localPath = ok ? `./blog-images/${name}` : null;
        localImages.push({ ...img, local: localPath });
        if (ok) totalImages++;
      }
    } else {
      for (const img of imageCollector) {
        localImages.push({ ...img, local: null });
      }
    }

    // Replace image URLs with local paths in HTML
    let htmlForNovel = bodyHtml;
    for (const img of localImages) {
      if (img.local && img.src) {
        htmlForNovel = htmlForNovel.split(escapeHtml(img.src)).join(img.local);
        htmlForNovel = htmlForNovel.split(img.src).join(img.local);
      }
    }
    if (coverImage && coverImageLocal) {
      htmlForNovel = htmlForNovel.split(coverImage).join(coverImageLocal);
    }

    const article = {
      title: post.title,
      slug,
      author: "",
      publishedAt: post.firstPublishedDate || "",
      views: post.metrics?.views || null,
      categories,
      excerpt: post.excerpt || "",
      coverImage,
      images: localImages,
      videos: [],
      error: null,
      url: post.url ? `${post.url.base}${post.url.path}` : "",
      coverImageLocal,
      htmlForNovel,
      // Extra API-only fields
      wixId: post.id,
      seoData: post.seoData || null,
      minutesToRead: post.minutesToRead || null,
      hashtags: post.hashtags || [],
      tagIds: post.tagIds || [],
    };

    articles.push(article);
    console.log(`   [${i + 1}/${wixPosts.length}] ${post.title.substring(0, 60)}... (${imageCollector.length} images, cat: ${categories[0] || "none"})`);
  }

  console.log(`\n   📸 ${totalImages} images downloaded`);
  return articles;
}

function safeExt(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = extname(pathname.split("/")[pathname.split("/").length - 1] || "");
    return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext.toLowerCase()) ? ext : ".jpg";
  } catch {
    return ".jpg";
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Wix Blog API → wix-blog.json");
  if (DRY_RUN) console.log("   ⚡ DRY RUN — images won't be downloaded\n");

  const wixPosts = await fetchAllPosts();
  const categoryMap = await fetchCategories();
  const articles = await processPosts(wixPosts, categoryMap);

  // Save
  writeFileSync(OUTPUT_JSON, JSON.stringify(articles, null, 2), "utf-8");
  console.log(`\n🎉 Done! ${articles.length} articles → ${OUTPUT_JSON}`);
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});

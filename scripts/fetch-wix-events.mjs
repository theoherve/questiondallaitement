#!/usr/bin/env node
/**
 * Fetch all events from Wix REST API and save to formations-scraper/wix-formations-pro.json
 *
 * - Fetches all formations (UPCOMING, ENDED, CANCELED) via Wix Events V3 API
 * - Converts Ricos description → HTML
 * - Downloads main images to formations-scraper/formations-images/
 * - Outputs wix-formations-pro.json
 *
 * Usage:
 *   source .env.local && node scripts/fetch-wix-events.mjs
 *   source .env.local && node scripts/fetch-wix-events.mjs --dry-run
 */

import { writeFileSync, mkdirSync, createWriteStream, existsSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "formations-scraper/formations-images");
const OUTPUT_JSON = join(ROOT, "formations-scraper/wix-formations-pro.json");
const DRY_RUN = process.argv.includes("--dry-run");

mkdirSync(IMAGES_DIR, { recursive: true });

// ─── Config ─────────────────────────────────────────────────────────────────
const WIX_API_KEY = process.env.WIX;
const WIX_SITE_ID = "c8e39045-30eb-4cb6-b302-90fd21cf6751";
const WIX_API_BASE = "https://www.wixapis.com";

if (!WIX_API_KEY) {
  console.error("❌ Missing WIX env var. Run: source .env.local && node scripts/fetch-wix-events.mjs");
  process.exit(1);
}

const HEADERS = {
  Authorization: WIX_API_KEY,
  "wix-site-id": WIX_SITE_ID,
  "Content-Type": "application/json",
};

// ─── HTTP helpers ───────────────────────────────────────────────────────────
async function wixPost(path, body) {
  const url = `${WIX_API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
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

// ─── Ricos → HTML converter (reused from fetch-wix-blog.mjs) ───────────────
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
      case "BOLD": html = `<strong>${html}</strong>`; break;
      case "ITALIC": html = `<em>${html}</em>`; break;
      case "UNDERLINE": html = `<u>${html}</u>`; break;
      case "LINK": html = `<a href="${escapeHtml(dec.linkData?.link?.url || "")}">${html}</a>`; break;
      case "ANCHOR": html = `<a href="#${escapeHtml(dec.anchorData?.anchor || "")}">${html}</a>`; break;
      case "SUPERSCRIPT": html = `<sup>${html}</sup>`; break;
    }
  }
  return html;
}

function processInlineNodes(nodes) {
  return (nodes || [])
    .map((n) => {
      if (n.type === "TEXT") return applyDecorations(n.textData?.text || "", n.textData?.decorations);
      return "";
    })
    .join("");
}

function ricosToHtml(nodes) {
  return (nodes || [])
    .map((node) => {
      switch (node.type) {
        case "PARAGRAPH": {
          const inner = processInlineNodes(node.nodes);
          return inner ? `<p>${inner}</p>` : "";
        }
        case "HEADING": {
          const level = node.headingData?.level || 2;
          return `<h${level}>${processInlineNodes(node.nodes)}</h${level}>`;
        }
        case "BLOCKQUOTE":
          return `<blockquote>${ricosToHtml(node.nodes)}</blockquote>`;
        case "BULLETED_LIST":
          return `<ul>${ricosToHtml(node.nodes)}</ul>`;
        case "ORDERED_LIST":
          return `<ol>${ricosToHtml(node.nodes)}</ol>`;
        case "LIST_ITEM":
          return `<li>${ricosToHtml(node.nodes)}</li>`;
        case "IMAGE": {
          const mediaId = node.imageData?.image?.src?.id || "";
          const w = node.imageData?.image?.width;
          const h = node.imageData?.image?.height;
          const alt = node.imageData?.altText || "";
          const src = wixImageUrl(mediaId, w, h);
          return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`;
        }
        case "HTML":
          return node.htmlData?.html || "";
        case "TABLE": {
          const rows = (node.nodes || []).map((row) => {
            if (row.type !== "TABLE_ROW") return "";
            const cells = (row.nodes || []).map((cell) => {
              if (cell.type !== "TABLE_CELL") return "";
              return `<td>${ricosToHtml(cell.nodes)}</td>`;
            }).join("");
            return `<tr>${cells}</tr>`;
          }).join("");
          return `<table>${rows}</table>`;
        }
        case "CAPTION": return "";
        case "TEXT":
          return applyDecorations(node.textData?.text || "", node.textData?.decorations);
        default:
          if (node.nodes?.length) return ricosToHtml(node.nodes);
          return "";
      }
    })
    .join("\n");
}

// ─── Fetch all events ───────────────────────────────────────────────────────
async function fetchAllEvents() {
  console.log("📡 Fetching events from Wix API...\n");

  const allEvents = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await wixPost("/events/v3/events/query", {
      query: {
        paging: { limit, offset },
      },
      fieldsets: ["DETAILS", "URLS", "REGISTRATION"],
    });

    const events = data.events || [];
    allEvents.push(...events);

    const total = data.pagingMetadata?.total || "?";
    console.log(`   Fetched ${allEvents.length}/${total} events`);

    if (events.length < limit) break;
    offset += limit;
  }

  return allEvents;
}

// ─── Map Wix status to app status ───────────────────────────────────────────
function mapStatus(wixStatus) {
  switch (wixStatus) {
    case "UPCOMING": return "upcoming";
    case "ENDED": return "ended";
    case "CANCELED": return "canceled";
    default: return wixStatus?.toLowerCase() || "unknown";
  }
}

// ─── Process events ─────────────────────────────────────────────────────────
async function processEvents(wixEvents) {
  console.log("\n🔄 Processing events...\n");

  const articles = [];
  let totalImages = 0;

  for (let i = 0; i < wixEvents.length; i++) {
    const evt = wixEvents[i];
    const slug = slugify(evt.slug || evt.title);

    // Description: try Ricos first, fallback to shortDescription/detailedDescription
    let descriptionHtml = "";
    let descriptionText = "";
    if (evt.description?.nodes?.length) {
      descriptionHtml = ricosToHtml(evt.description.nodes);
    }
    descriptionText = evt.shortDescription || evt.detailedDescription || "";

    // Main image
    let mainImage = null;
    let mainImageLocal = null;
    if (evt.mainImage?.url) {
      mainImage = {
        "@type": "ImageObject",
        url: evt.mainImage.url,
        width: evt.mainImage.width,
        height: evt.mainImage.height,
      };

      if (!DRY_RUN) {
        const ext = safeExt(evt.mainImage.url);
        const name = `${slug}-main${ext}`;
        const dest = join(IMAGES_DIR, name);
        const ok = await downloadImage(evt.mainImage.url, dest);
        if (ok) {
          mainImageLocal = `./formations-images/${name}`;
          totalImages++;
        }
      }
    }

    // Location
    const locName = evt.location?.name || "";
    const locType = evt.location?.type || "ONLINE";

    // Price — extract from registration/tickets if available
    let price = "";
    let priceCents = 0;
    // Wix doesn't expose price directly in event query; keep empty for external events

    // Categories from Wix
    const categories = (evt.categories?.categories || []).map((c) => c.name);

    // Registration info
    const regType = evt.registration?.type || "";
    const regStatus = evt.registration?.status || "";
    let rsvpLink = "";
    if (regType === "EXTERNAL" && evt.registration?.external?.url) {
      rsvpLink = evt.registration.external.url;
    } else if (evt.eventPageUrl) {
      rsvpLink = `${evt.eventPageUrl.base}${evt.eventPageUrl.path}`;
    }

    const article = {
      slug,
      title: evt.title?.trim() || "",
      startDate: evt.dateAndTimeSettings?.startDate || "",
      endDate: evt.dateAndTimeSettings?.endDate || "",
      location: locName,
      locationAddress: evt.location?.address?.formatted || "",
      locationType: locType,
      price,
      currency: "EUR",
      mainImage,
      mainImageLocal,
      images: [],
      descriptionText,
      descriptionHtml,
      aboutHtml: descriptionHtml,
      speakers: [],
      capacity: null,
      tags: [],
      rsvpLink,
      rsvpText: "",
      status: mapStatus(evt.status),
      excerpt: descriptionText.substring(0, 300),
      error: null,
      url: evt.eventPageUrl ? `${evt.eventPageUrl.base}${evt.eventPageUrl.path}` : "",
      htmlForApp: descriptionHtml,
      // Extra API-only fields
      wixId: evt.id,
      wixCategories: categories,
      registrationType: regType,
      registrationStatus: regStatus,
      timeZoneId: evt.dateAndTimeSettings?.timeZoneId || "Europe/Paris",
      formattedDate: evt.dateAndTimeSettings?.formatted || null,
      calendarUrls: evt.calendarUrls || null,
    };

    articles.push(article);

    const statusEmoji = evt.status === "UPCOMING" ? "🟢" : evt.status === "ENDED" ? "⚪" : "🔴";
    console.log(`   ${statusEmoji} [${i + 1}/${wixEvents.length}] ${evt.title?.substring(0, 55)}... (${evt.status}, cat: ${categories[0] || "none"})`);
  }

  console.log(`\n   📸 ${totalImages} images downloaded`);
  return articles;
}

function safeExt(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/");
    const ext = extname(parts[parts.length - 1] || "");
    return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext.toLowerCase()) ? ext : ".jpg";
  } catch {
    return ".jpg";
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Wix Events API → wix-formations-pro.json");
  if (DRY_RUN) console.log("   ⚡ DRY RUN — images won't be downloaded\n");

  const wixEvents = await fetchAllEvents();
  const articles = await processEvents(wixEvents);

  writeFileSync(OUTPUT_JSON, JSON.stringify(articles, null, 2), "utf-8");
  console.log(`\n🎉 Done! ${articles.length} events → ${OUTPUT_JSON}`);
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});

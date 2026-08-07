#!/usr/bin/env node
/**
 * Audit accompagnement_blocks content — no writes.
 *
 * Goal: understand the variety of block types currently in DB, detect Ricos
 * markers inside `text` blocks that should become `video`/`image`/`download`,
 * and sample representative HTML for the Ricos parser design.
 *
 * Output:
 *   - stdout summary (counts + markers)
 *   - scripts/audit-output/formation-blocks-audit.json (full samples)
 *
 * Usage: source .env.local && node scripts/audit-formation-blocks.mjs
 */

import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "audit-output");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Run: source .env.local && node scripts/audit-formation-blocks.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Ricos marker detectors ─────────────────────────────────────────────────

const RICOS_MARKERS = {
  video: /data-hook="figure-VIDEO"/,
  image: /data-hook="figure-IMAGE"/,
  file: /data-hook="figure-FILE"/,
  gallery: /data-hook="figure-GALLERY"/,
  divider: /data-hook="figure-DIVIDER"/,
  button: /data-hook="figure-BUTTON"/,
  poll: /data-hook="figure-POLL"/,
  embed: /data-hook="figure-EMBED"/,
  map: /data-hook="figure-MAP"/,
  collapsibleList: /data-hook="figure-COLLAPSIBLE_LIST"/,
  table: /<table/,
  quiz: /data-hook="form-quiz__main"/,
  wixFileDl: /static\.wixstatic\.com\/(?:media|archives|ugd)\/[^"']+\.(?:pdf|docx?|xlsx?|pptx?|zip|mp3|mp4)/i,
  externalDl: /<a[^>]+href="[^"]+\.(?:pdf|docx?|xlsx?|pptx?|zip)"/i,
  fileDownload: /data-hook="file-download"|data-hook="wix-file-upload"/,
};

const detectMarkers = (html) => {
  const found = [];
  for (const [name, re] of Object.entries(RICOS_MARKERS)) {
    if (re.test(html)) found.push(name);
  }
  return found;
};

const extractVimeoId = (html) => {
  const m = html.match(/i\.vimeocdn\.com\/video\/(\d+)/);
  return m ? m[1] : null;
};
const extractYoutubeId = (html) =>
  html.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/)?.[1] ?? null;
const extractWixImageSrc = (html) =>
  html.match(/src="(https:\/\/static\.wixstatic\.com\/media\/[^"]+)"/)?.[1] ?? null;
const extractFileHref = (html) =>
  html.match(/<a[^>]+href="(https?:\/\/[^"]+\.(?:pdf|docx?|xlsx?|pptx?|zip))"/i)?.[1] ?? null;

// ─── Main ───────────────────────────────────────────────────────────────────

const main = async () => {
  console.log("→ Fetching formations + sections + blocks…");

  const { data: formations, error: fErr } = await supabase
    .from("accompagnements")
    .select("id, title, slug")
    .is("deleted_at", null);
  if (fErr) throw fErr;

  const { data: blocks, error: bErr } = await supabase
    .from("accompagnement_blocks")
    .select("id, section_id, type, content, position");
  if (bErr) throw bErr;

  const { data: sections, error: sErr } = await supabase
    .from("accompagnement_sections")
    .select("id, accompagnement_id, title, position");
  if (sErr) throw sErr;

  console.log(
    `  formations=${formations.length} sections=${sections.length} blocks=${blocks.length}`
  );

  // ─── Type distribution ────────────────────────────────────────────────────
  const byType = {};
  for (const b of blocks) {
    byType[b.type] = (byType[b.type] ?? 0) + 1;
  }

  console.log("\n→ Blocks by type:");
  for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t.padEnd(12)} ${n}`);
  }

  // ─── Marker detection on text blocks ──────────────────────────────────────
  const markerStats = {};
  const samplesByMarkerCombo = new Map();
  const textBlocksWithMarkers = [];

  for (const b of blocks) {
    if (b.type !== "text") continue;
    const html = b.content?.html ?? "";
    if (!html) continue;

    const markers = detectMarkers(html);
    if (markers.length === 0) continue;

    for (const m of markers) {
      markerStats[m] = (markerStats[m] ?? 0) + 1;
    }
    textBlocksWithMarkers.push({ id: b.id, markers });

    const comboKey = markers.sort().join("+");
    if (!samplesByMarkerCombo.has(comboKey)) {
      samplesByMarkerCombo.set(comboKey, {
        blockId: b.id,
        markers,
        htmlLength: html.length,
        html,
        vimeoId: extractVimeoId(html),
        youtubeId: extractYoutubeId(html),
        wixImage: extractWixImageSrc(html),
        fileHref: extractFileHref(html),
      });
    }
  }

  console.log(
    `\n→ text-typed blocks with Ricos markers: ${textBlocksWithMarkers.length}/${byType.text ?? 0}`
  );
  for (const [m, n] of Object.entries(markerStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${m.padEnd(18)} ${n}`);
  }

  // ─── Sample 1 block per non-text type ─────────────────────────────────────
  const typedSamples = {};
  for (const b of blocks) {
    if (b.type === "text") continue;
    if (typedSamples[b.type]) continue;
    typedSamples[b.type] = {
      blockId: b.id,
      type: b.type,
      content: b.content,
    };
  }

  // ─── Sample 1 clean text block (no markers) ───────────────────────────────
  let cleanTextSample = null;
  for (const b of blocks) {
    if (b.type !== "text") continue;
    const html = b.content?.html ?? "";
    if (!html || detectMarkers(html).length > 0) continue;
    cleanTextSample = { blockId: b.id, htmlLength: html.length, html };
    break;
  }

  // ─── Write report ─────────────────────────────────────────────────────────
  mkdirSync(OUT_DIR, { recursive: true });

  const report = {
    counts: {
      accompagnements: formations.length,
      sections: sections.length,
      blocks: blocks.length,
      byType,
      textBlocksWithMarkers: textBlocksWithMarkers.length,
      markerStats,
    },
    typedSamples,
    cleanTextSample,
    markerComboSamples: Object.fromEntries(samplesByMarkerCombo),
  };

  const outPath = join(OUT_DIR, "formation-blocks-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n✓ Report written to ${outPath}`);
  console.log("\nNext: share this JSON so we can design the Ricos parser.");
};

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});

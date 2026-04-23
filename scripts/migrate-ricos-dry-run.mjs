#!/usr/bin/env node
/**
 * Dry-run Ricos migration — no DB writes.
 *
 * Reads all formations/sections/blocks, applies the Ricos parser to every
 * text block, and emits:
 *   - audit-output/migration-preview.json  — full before/after JSON
 *   - audit-output/missing-downloads.csv   — PDFs we can't migrate (Option A)
 *   - stdout summary stats
 *
 * Usage: source .env.local && node scripts/migrate-ricos-dry-run.mjs
 */

import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { parseRicosBlock } from "./parse-ricos.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "audit-output");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing env vars. Run: source .env.local && node scripts/migrate-ricos-dry-run.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── CSV helper ──────────────────────────────────────────────────────────────
const csvEscape = (v) => {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

// ─── Main ────────────────────────────────────────────────────────────────────
const main = async () => {
  console.log("→ Fetching formations, sections, blocks…");

  const { data: formations } = await supabase
    .from("formations")
    .select("id, title, slug")
    .is("deleted_at", null)
    .order("title");
  const { data: sections } = await supabase
    .from("formation_sections")
    .select("id, formation_id, title, position");
  const { data: blocks } = await supabase
    .from("formation_blocks")
    .select("id, section_id, type, content, position");

  console.log(`  formations=${formations.length} sections=${sections.length} blocks=${blocks.length}`);

  // Index sections and blocks
  const sectionsByFormation = new Map();
  for (const sec of sections) {
    const arr = sectionsByFormation.get(sec.formation_id) ?? [];
    arr.push(sec);
    sectionsByFormation.set(sec.formation_id, arr);
  }
  const blocksBySection = new Map();
  for (const b of blocks) {
    const arr = blocksBySection.get(b.section_id) ?? [];
    arr.push(b);
    blocksBySection.set(b.section_id, arr);
  }

  // ─── Transform ─────────────────────────────────────────────────────────────
  const preview = [];
  const missingDownloadsRows = [];
  let stats = {
    inputBlocks: blocks.length,
    outputBlocks: 0,
    textInput: 0,
    textOutput: 0,
    videoKept: 0,
    videoExtracted: 0,
    imageKept: 0,
    imageExtracted: 0,
    quizExtracted: 0,
    downloadsMissing: 0,
    emptyVideoWrappersStripped: 0,
    parseErrors: [],
  };

  for (const formation of formations) {
    const secs = (sectionsByFormation.get(formation.id) ?? []).sort(
      (a, b) => a.position - b.position
    );

    const formationPreview = {
      formationId: formation.id,
      formationTitle: formation.title,
      sections: [],
    };

    for (const sec of secs) {
      const secBlocks = (blocksBySection.get(sec.id) ?? []).sort(
        (a, b) => a.position - b.position
      );

      const sectionPreview = {
        sectionId: sec.id,
        sectionTitle: sec.title,
        sourceBlocks: secBlocks.length,
        outputBlocks: [],
      };

      for (const b of secBlocks) {
        if (b.type === "video") {
          sectionPreview.outputBlocks.push({
            type: "video",
            content: b.content,
            _source: { id: b.id, origType: "video" },
          });
          stats.videoKept++;
          continue;
        }
        if (b.type === "image") {
          sectionPreview.outputBlocks.push({
            type: "image",
            content: b.content,
            _source: { id: b.id, origType: "image" },
          });
          stats.imageKept++;
          continue;
        }
        if (b.type === "quiz") {
          sectionPreview.outputBlocks.push({
            type: "quiz",
            content: b.content,
            _source: { id: b.id, origType: "quiz" },
          });
          continue;
        }
        if (b.type === "download") {
          sectionPreview.outputBlocks.push({
            type: "download",
            content: b.content,
            _source: { id: b.id, origType: "download" },
          });
          continue;
        }

        if (b.type === "text") {
          stats.textInput++;
          try {
            const { blocks: emitted, missingDownloads } = parseRicosBlock({
              id: b.id,
              sectionId: b.section_id,
              position: b.position,
              content: b.content,
            });

            for (const e of emitted) {
              sectionPreview.outputBlocks.push({
                ...e,
                _source: { id: b.id, origType: "text" },
              });
              if (e.type === "text") stats.textOutput++;
              if (e.type === "video") stats.videoExtracted++;
              if (e.type === "image") stats.imageExtracted++;
              if (e.type === "quiz") stats.quizExtracted++;
            }

            for (const dl of missingDownloads) {
              stats.downloadsMissing++;
              missingDownloadsRows.push({
                formation: formation.title,
                section: sec.title,
                stepTitle: b.content?.title ?? "",
                filename: dl.filename,
                sizeBytes: dl.size_bytes,
                sourceBlockId: b.id,
              });
            }

            // Count empty video wrappers stripped
            const origHtml = b.content?.html ?? "";
            const videoMarkers = (origHtml.match(/data-hook="figure-VIDEO"/g) ?? []).length;
            const extractedVideoCount = emitted.filter((e) => e.type === "video").length;
            stats.emptyVideoWrappersStripped += Math.max(0, videoMarkers - extractedVideoCount);
          } catch (err) {
            stats.parseErrors.push({ blockId: b.id, error: String(err) });
          }
        }
      }

      formationPreview.sections.push(sectionPreview);
    }

    preview.push(formationPreview);
  }

  stats.outputBlocks = preview.reduce(
    (acc, f) => acc + f.sections.reduce((a, s) => a + s.outputBlocks.length, 0),
    0
  );

  // ─── Write outputs ─────────────────────────────────────────────────────────
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "migration-preview.json"),
    JSON.stringify({ stats, preview }, null, 2)
  );

  const csvHeader = "formation,section,stepTitle,filename,sizeBytes,sourceBlockId\n";
  const csvRows = missingDownloadsRows
    .map((r) =>
      [r.formation, r.section, r.stepTitle, r.filename, r.sizeBytes, r.sourceBlockId]
        .map(csvEscape)
        .join(",")
    )
    .join("\n");
  writeFileSync(
    join(OUT_DIR, "missing-downloads.csv"),
    csvHeader + csvRows + (csvRows ? "\n" : "")
  );

  // ─── Stdout summary ────────────────────────────────────────────────────────
  console.log("\n═══ Dry-run summary ═══");
  console.log(`Input blocks   : ${stats.inputBlocks}`);
  console.log(`Output blocks  : ${stats.outputBlocks}`);
  console.log(`  text in→out  : ${stats.textInput} → ${stats.textOutput}`);
  console.log(`  video kept   : ${stats.videoKept}`);
  console.log(`  video extracted from text : ${stats.videoExtracted}`);
  console.log(`  image kept   : ${stats.imageKept}`);
  console.log(`  image extracted from text : ${stats.imageExtracted}`);
  console.log(`  quiz extracted from text  : ${stats.quizExtracted}`);
  console.log(`Empty video wrappers stripped: ${stats.emptyVideoWrappersStripped}`);
  console.log(`Missing PDFs (to re-upload manually): ${stats.downloadsMissing}`);
  if (stats.parseErrors.length) {
    console.log(`⚠️  Parse errors: ${stats.parseErrors.length}`);
    for (const e of stats.parseErrors.slice(0, 5)) console.log("  ", e);
  }
  console.log(`\n✓ Preview:   ${join(OUT_DIR, "migration-preview.json")}`);
  console.log(`✓ Missing DLs: ${join(OUT_DIR, "missing-downloads.csv")}`);
};

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});

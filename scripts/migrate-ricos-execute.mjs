#!/usr/bin/env node
/**
 * Execute the Ricos migration — DESTRUCTIVE.
 *
 * Steps:
 *   1. Dump full backup JSON to backups/ricos-migration-<ts>.json (includes
 *      formations / sections / blocks / progress / bookmarks / enrollments).
 *   2. Wipe formation_bookmarks, formation_progress (clean slate on progression).
 *   3. For each section: delete existing blocks, insert parsed replacements.
 *   4. Export missing-downloads.csv (same as dry-run) for manual re-upload.
 *
 * Sections, formations, enrollments are untouched (IDs stable, clients keep
 * access but lose progression).
 *
 * Usage:
 *   source .env.local && node scripts/migrate-ricos-execute.mjs --confirm
 *
 * Without --confirm, the script refuses to run.
 */

import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { parseRicosBlock } from "./parse-ricos.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BACKUPS_DIR = join(ROOT, "backups");
const OUT_DIR = join(__dirname, "audit-output");

const CONFIRM = process.argv.includes("--confirm");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing env. Run: source .env.local && node scripts/migrate-ricos-execute.mjs --confirm");
  process.exit(1);
}

if (!CONFIRM) {
  console.error("❌ Refusing to run without --confirm flag.");
  console.error("   This script will TRUNCATE formation_bookmarks + formation_progress,");
  console.error("   DELETE all formation_blocks, and INSERT new parsed blocks.");
  console.error("   A full JSON backup is written first but verify before proceeding.");
  console.error("   Re-run with: node scripts/migrate-ricos-execute.mjs --confirm");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ts = () => new Date().toISOString().replace(/[:.]/g, "-");

const csvEscape = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ─── Step 1: fetch everything + write backup ────────────────────────────────
const fetchAll = async () => {
  const tables = [
    "formations",
    "formation_sections",
    "formation_blocks",
    "formation_enrollments",
    "formation_progress",
  ];
  const optionalTables = ["formation_bookmarks"];
  const dump = {};
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) throw new Error(`Fetch ${t}: ${error.message}`);
    dump[t] = data ?? [];
    console.log(`  ${t}: ${dump[t].length} rows`);
  }
  for (const t of optionalTables) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) {
      console.log(`  ${t}: SKIP (not in DB — ${error.code ?? ""})`);
      dump[t] = null;
      continue;
    }
    dump[t] = data ?? [];
    console.log(`  ${t}: ${dump[t].length} rows`);
  }
  return dump;
};

const writeBackup = (dump) => {
  mkdirSync(BACKUPS_DIR, { recursive: true });
  const path = join(BACKUPS_DIR, `ricos-migration-${ts()}.json`);
  writeFileSync(path, JSON.stringify(dump, null, 2));
  console.log(`✓ Backup written: ${path}`);
  return path;
};

// ─── Step 2: wipe progression tables ────────────────────────────────────────
const wipeProgression = async (dump) => {
  if (dump.formation_bookmarks !== null) {
    const { error: e1 } = await supabase
      .from("formation_bookmarks")
      .delete()
      .not("id", "is", null);
    if (e1) throw new Error(`wipe bookmarks: ${e1.message}`);
    console.log("✓ Wiped formation_bookmarks");
  } else {
    console.log("  (formation_bookmarks not in DB — skip wipe)");
  }

  const { error: e2 } = await supabase
    .from("formation_progress")
    .delete()
    .not("enrollment_id", "is", null);
  if (e2) throw new Error(`wipe progress: ${e2.message}`);
  console.log("✓ Wiped formation_progress");
};

// ─── Step 3: per-section delete + insert ────────────────────────────────────
const buildEmittedForSection = (section, sourceBlocks) => {
  const emitted = [];
  const missingDownloads = [];
  for (const src of sourceBlocks) {
    if (src.type === "video" || src.type === "image" || src.type === "quiz" || src.type === "download") {
      emitted.push({ type: src.type, content: src.content });
      continue;
    }
    if (src.type === "text") {
      const out = parseRicosBlock({
        id: src.id,
        sectionId: section.id,
        position: src.position,
        content: src.content,
      });
      emitted.push(...out.blocks);
      for (const dl of out.missingDownloads) {
        missingDownloads.push({
          formationId: section.formation_id,
          sectionTitle: section.title,
          stepTitle: src.content?.title ?? "",
          filename: dl.filename,
          sizeBytes: dl.size_bytes,
          sourceBlockId: src.id,
        });
      }
    }
  }
  return { emitted, missingDownloads };
};

const replaceSectionBlocks = async (section, sourceBlocks) => {
  const { emitted, missingDownloads } = buildEmittedForSection(section, sourceBlocks);

  // Delete existing blocks for this section
  const { error: delErr } = await supabase
    .from("formation_blocks")
    .delete()
    .eq("section_id", section.id);
  if (delErr) throw new Error(`delete blocks for ${section.id}: ${delErr.message}`);

  if (emitted.length === 0) return { inserted: 0, missingDownloads };

  // Build insert rows
  const rows = emitted.map((b, idx) => ({
    id: randomUUID(),
    section_id: section.id,
    type: b.type,
    content: b.content,
    position: idx,
  }));

  const { error: insErr } = await supabase.from("formation_blocks").insert(rows);
  if (insErr) throw new Error(`insert blocks for ${section.id}: ${insErr.message}`);

  return { inserted: rows.length, missingDownloads };
};

// ─── Main ────────────────────────────────────────────────────────────────────
const main = async () => {
  console.log("⚠️  DESTRUCTIVE MIGRATION — --confirm flag detected\n");

  console.log("→ Step 1/4: fetching + writing backup…");
  const dump = await fetchAll();
  writeBackup(dump);

  console.log("\n→ Step 2/4: wiping progression tables…");
  await wipeProgression(dump);

  console.log("\n→ Step 3/4: replacing blocks per section…");
  const sections = dump.formation_sections.sort(
    (a, b) => a.position - b.position
  );
  const blocksBySection = new Map();
  for (const b of dump.formation_blocks) {
    const arr = blocksBySection.get(b.section_id) ?? [];
    arr.push(b);
    blocksBySection.set(b.section_id, arr);
  }

  let totalInserted = 0;
  const allMissingDownloads = [];

  for (const section of sections) {
    const sourceBlocks = (blocksBySection.get(section.id) ?? []).sort(
      (a, b) => a.position - b.position
    );
    try {
      const { inserted, missingDownloads } = await replaceSectionBlocks(
        section,
        sourceBlocks
      );
      totalInserted += inserted;
      allMissingDownloads.push(...missingDownloads);
      console.log(`  [${section.title}] source=${sourceBlocks.length} → inserted=${inserted}`);
    } catch (err) {
      console.error(`  ❌ ${section.title}: ${err.message}`);
      throw err;
    }
  }

  console.log("\n→ Step 4/4: writing missing-downloads.csv…");
  mkdirSync(OUT_DIR, { recursive: true });
  const formationsById = new Map(dump.formations.map((f) => [f.id, f.title]));
  const csvHeader = "formation,section,stepTitle,filename,sizeBytes,sourceBlockId\n";
  const csvRows = allMissingDownloads
    .map((r) =>
      [
        formationsById.get(r.formationId) ?? r.formationId,
        r.sectionTitle,
        r.stepTitle,
        r.filename,
        r.sizeBytes,
        r.sourceBlockId,
      ]
        .map(csvEscape)
        .join(",")
    )
    .join("\n");
  writeFileSync(
    join(OUT_DIR, "missing-downloads.csv"),
    csvHeader + csvRows + (csvRows ? "\n" : "")
  );

  console.log(`\n✓ Migration complete.`);
  console.log(`  Total blocks inserted: ${totalInserted}`);
  console.log(`  Missing PDFs logged:   ${allMissingDownloads.length}`);
  console.log(`  Backup: ${BACKUPS_DIR}/`);
};

main().catch((e) => {
  console.error("\n❌ Migration aborted:", e);
  console.error("   Use the backup JSON to restore if needed.");
  process.exit(1);
});

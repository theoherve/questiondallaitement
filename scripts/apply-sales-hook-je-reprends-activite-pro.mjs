/**
 * Applique les accroches de bénéfice par chapitre de l'accompagnement
 * « Je reprends une activité professionnelle » (accompagnement_sections.sales_hook),
 * et signale les blocs vidéo dupliqués (titre identique) dans ce module —
 * le brief signale une « double duplication des épisodes bonus ».
 *
 * Ne remplit que les chapitres dont le titre correspond EXACTEMENT
 * (insensible casse/espaces) à un des `searchTitles` déclarés dans
 * data/sales-hook-je-reprends-activite-pro.mjs. Un chapitre sans
 * correspondance est signalé, jamais deviné.
 *
 *   node --env-file=.env.local scripts/apply-sales-hook-je-reprends-activite-pro.mjs          # dry-run
 *   node --env-file=.env.local scripts/apply-sales-hook-je-reprends-activite-pro.mjs --apply
 */

import { createClient } from "@supabase/supabase-js";
import { SALES_HOOKS_JE_REPRENDS_ACTIVITE_PRO } from "./data/sales-hook-je-reprends-activite-pro.mjs";

const APPLY = process.argv.includes("--apply");
const SLUG = "je-reprends-une-activite-professionnelle";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");

const { data: acc, error: accErr } = await db
  .from("accompagnements")
  .select("id, slug, title")
  .eq("slug", SLUG)
  .single();
if (accErr) {
  console.error("❌", accErr.message);
  process.exit(1);
}

const { data: sections, error: secErr } = await db
  .from("accompagnement_sections")
  .select("id, title, position, sales_hook")
  .eq("accompagnement_id", acc.id)
  .order("position");
if (secErr) {
  console.error("❌", secErr.message);
  process.exit(1);
}

const { data: blocks, error: blockErr } = await db
  .from("accompagnement_blocks")
  .select("id, section_id, type, content, position");
if (blockErr) {
  console.error("❌", blockErr.message);
  process.exit(1);
}
const sectionIds = new Set(sections.map((s) => s.id));
const moduleBlocks = blocks.filter((b) => sectionIds.has(b.section_id));
// Seuls les blocs `video` portent un titre (voir videoBlockSchema).
const blockTitle = (b) =>
  b.type === "video" && b.content && typeof b.content.title === "string"
    ? b.content.title
    : null;

console.log(`── ${acc.title} (${SLUG})\n`);

// --- Doublons de blocs vidéo, à l'intérieur de ce module -------------------
const byTitle = new Map();
for (const b of moduleBlocks) {
  const title = blockTitle(b);
  if (!title) continue;
  const key = norm(title);
  if (!byTitle.has(key)) byTitle.set(key, []);
  byTitle.get(key).push(b);
}
const duplicates = [...byTitle.values()].filter((group) => group.length > 1);
if (duplicates.length > 0) {
  console.log(`⚠️  ${duplicates.length} titre(s) vidéo dupliqué(s) dans ce module :`);
  for (const group of duplicates) {
    console.log(`   - "${blockTitle(group[0])}" (${group.length} occurrences) :`);
    for (const b of group) {
      const sec = sections.find((s) => s.id === b.section_id);
      console.log(`       section "${sec?.title}" · bloc [${b.position}]`);
    }
  }
  console.log("   → à corriger manuellement dans l'admin avant --apply du reste.\n");
} else {
  console.log("✓ aucun titre vidéo dupliqué dans ce module.\n");
}

// --- Sales hooks par chapitre ----------------------------------------------
const remainingSections = [...sections];
const matched = [];
const unmatched = [];

for (const entry of SALES_HOOKS_JE_REPRENDS_ACTIVITE_PRO) {
  const idx = remainingSections.findIndex((s) =>
    entry.searchTitles.some((t) => norm(t) === norm(s.title))
  );
  if (idx === -1) {
    unmatched.push({ entry, reason: `aucun titre en base ne correspond à [${entry.searchTitles.join(" | ")}]` });
    continue;
  }
  const [section] = remainingSections.splice(idx, 1);
  matched.push({ entry, section });
}

console.log(`Correspondances trouvées : ${matched.length}/${SALES_HOOKS_JE_REPRENDS_ACTIVITE_PRO.length}\n`);

for (const { entry, section } of matched) {
  console.log(`✓ "${section.title}"`);
  console.log(`   sales_hook actuel : ${section.sales_hook ?? "(vide)"}`);
  console.log(`   sales_hook cible  : ${entry.hook}`);

  if (APPLY) {
    const { error } = await db
      .from("accompagnement_sections")
      .update({ sales_hook: entry.hook })
      .eq("id", section.id);
    if (error) {
      console.error(`❌ ${section.id} : ${error.message}`);
      process.exit(1);
    }
  }
}

if (unmatched.length) {
  console.log(`\n⚠️  ${unmatched.length} entrée(s) non appliquée(s) automatiquement :`);
  for (const { entry, reason } of unmatched) {
    console.log(`   - "${entry.newTitle}" : ${reason}`);
  }
}

if (remainingSections.length) {
  console.log(`\nℹ️  ${remainingSections.length} chapitre(s) en base sans correspondance dans la liste fournie :`);
  for (const s of remainingSections) console.log(`   - "${s.title}"`);
}

console.log(
  APPLY
    ? `\n✅ ${matched.length} chapitre(s) mis à jour`
    : `\n🔍 DRY-RUN — relancez avec --apply pour appliquer ces ${matched.length} chapitre(s)`
);

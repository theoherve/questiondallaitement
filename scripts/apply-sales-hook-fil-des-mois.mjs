/**
 * Applique les accroches de bénéfice par chapitre du module « Mon allaitement
 * au fil des mois » (accompagnement_sections.sales_hook), et signale un
 * éventuel doublon du bloc bonus « Ai-je tort d'endormir mon bébé au sein ? »
 * à l'intérieur de ce module (hors pack, qui réagrège tous les modules).
 *
 * Ne renomme/ne remplit que les chapitres dont le titre correspond
 * EXACTEMENT (insensible casse/espaces) à un des `searchTitles` déclarés
 * dans data/sales-hook-fil-des-mois.mjs. Un chapitre sans correspondance est
 * signalé, jamais deviné.
 *
 *   node scripts/apply-sales-hook-fil-des-mois.mjs          # dry-run
 *   node scripts/apply-sales-hook-fil-des-mois.mjs --apply
 */

import { createClient } from "@supabase/supabase-js";
import { SALES_HOOKS_FIL_DES_MOIS } from "./data/sales-hook-fil-des-mois.mjs";

const APPLY = process.argv.includes("--apply");
const SLUG = "mon-allaitement-au-fil-des-mois";

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

// --- Doublon éventuel du bloc bonus, à l'intérieur de ce module -----------
const endormirBlocks = moduleBlocks.filter((b) =>
  (blockTitle(b) ?? "").toLowerCase().includes("endormir")
);
if (endormirBlocks.length > 1) {
  console.log(`⚠️  ${endormirBlocks.length} blocs "endormir" dans ce module :`);
  for (const b of endormirBlocks) {
    const sec = sections.find((s) => s.id === b.section_id);
    console.log(`   - section "${sec?.title}" · bloc [${b.position}] ${b.type} · "${blockTitle(b)}"`);
  }
  console.log("   → doublon réel, à corriger manuellement dans l'admin avant --apply du reste.\n");
} else if (endormirBlocks.length === 1) {
  console.log(`✓ un seul bloc "endormir" dans ce module (pas de doublon interne).\n`);
} else {
  console.log(`ℹ️  aucun bloc "endormir" trouvé dans ce module.\n`);
}

// --- Sales hooks par chapitre ----------------------------------------------
const remainingSections = [...sections];
const matched = [];
const unmatched = [];

for (const entry of SALES_HOOKS_FIL_DES_MOIS) {
  if (entry.searchTitles.length === 0) {
    unmatched.push({ entry, reason: "chapitre absent en base — à créer dans l'admin" });
    continue;
  }
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

console.log(`Correspondances trouvées : ${matched.length}/${SALES_HOOKS_FIL_DES_MOIS.length}\n`);

for (const { entry, section } of matched) {
  const renaming = norm(section.title) !== norm(entry.newTitle);
  console.log(`✓ "${section.title}"${renaming ? ` → renommé en "${entry.newTitle}"` : ""}`);
  console.log(`   sales_hook actuel : ${section.sales_hook ?? "(vide)"}`);
  console.log(`   sales_hook cible  : ${entry.hook}`);

  if (APPLY) {
    const { error } = await db
      .from("accompagnement_sections")
      .update({ title: entry.newTitle, sales_hook: entry.hook })
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

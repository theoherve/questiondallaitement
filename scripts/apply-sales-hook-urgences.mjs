/**
 * Applique les accroches de bénéfice par chapitre de l'accompagnement
 * « Les urgences de l'allaitement » (accompagnement_sections.sales_hook).
 *
 * Ne remplit que les chapitres dont le titre correspond EXACTEMENT
 * (insensible casse/espaces) à un des `searchTitles` déclarés dans
 * data/sales-hook-urgences.mjs. Un chapitre sans correspondance est signalé,
 * jamais deviné.
 *
 *   node --env-file=.env.local scripts/apply-sales-hook-urgences.mjs          # dry-run
 *   node --env-file=.env.local scripts/apply-sales-hook-urgences.mjs --apply
 */

import { createClient } from "@supabase/supabase-js";
import { SALES_HOOKS_URGENCES } from "./data/sales-hook-urgences.mjs";

const APPLY = process.argv.includes("--apply");
const SLUG = "les-urgences-de-l-allaitement";

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

console.log(`── ${acc.title} (${SLUG})\n`);

const remainingSections = [...sections];
const matched = [];
const unmatched = [];

for (const entry of SALES_HOOKS_URGENCES) {
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

console.log(`Correspondances trouvées : ${matched.length}/${SALES_HOOKS_URGENCES.length}\n`);

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

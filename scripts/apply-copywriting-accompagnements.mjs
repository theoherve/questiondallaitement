/**
 * Applique la refonte copywriting des 8 pages d'accompagnement.
 *
 *   node scripts/apply-copywriting-accompagnements.mjs          # dry-run
 *   node scripts/apply-copywriting-accompagnements.mjs --apply
 */

import { createClient } from "@supabase/supabase-js";
import { ACCOMPAGNEMENTS } from "./data/copywriting-accompagnements.mjs";

const APPLY = process.argv.includes("--apply");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildLongDescription = (a) => `<p><strong>${esc(a.lead)}</strong></p>
<h2>Ce que vous vivez peut-être en ce moment</h2>
<ul>
${a.problems.map((p) => `  <li>${esc(p)}</li>`).join("\n")}
</ul>
<h2>${esc(a.whyTitle)}</h2>
<p>${esc(a.why)}</p>
<p><em>${esc(a.bridge)}</em></p>`;

const { data: rows, error } = await db.from("accompagnements").select("id, slug, title, short_description");
if (error) {
  console.error("❌", error.message);
  process.exit(1);
}
const bySlug = new Map(rows.map((r) => [r.slug, r]));

const missing = ACCOMPAGNEMENTS.filter((a) => !bySlug.has(a.slug)).map((a) => a.slug);
if (missing.length) {
  console.error("❌ slugs absents en base :", missing.join(", "));
  process.exit(1);
}

for (const a of ACCOMPAGNEMENTS) {
  const row = bySlug.get(a.slug);
  const html = buildLongDescription(a);
  console.log(`── ${a.slug}`);
  console.log(`   sous-titre : ${(row.short_description ?? "—").slice(0, 70)}…\n                → ${a.subtitle.slice(0, 70)}…`);
  console.log(`   corps      : ${a.problems.length} situations · ${html.length} caractères`);

  if (APPLY) {
    const { error: e } = await db
      .from("accompagnements")
      .update({ short_description: a.subtitle, long_description_html: html })
      .eq("id", row.id);
    if (e) {
      console.error(`❌ ${a.slug} : ${e.message}`);
      process.exit(1);
    }
  }
}

console.log(APPLY ? `\n✅ ${ACCOMPAGNEMENTS.length} accompagnements mis à jour` : `\n🔍 DRY-RUN — ${ACCOMPAGNEMENTS.length} accompagnements prêts`);

#!/usr/bin/env node
/**
 * Passe typographique sur les contenus stockés en base.
 *
 * Supprime les tirets cadratins des textes publiés (formations, fiches,
 * accompagnements, blog, emails, sondages) en réécrivant la ponctuation :
 * deux-points quand le tiret introduisait un complément de titre, virgule
 * partout ailleurs.
 *
 * Les guillemets français ne sont pas touchés : ils encadrent le plus souvent
 * une vraie citation ou un terme repris, les retirer en masse abîmerait le
 * sens. Le rapport les compte pour permettre une relecture ciblée.
 *
 * Usage (le `set -a` est nécessaire : sous zsh, `source` déclare les variables
 * sans les exporter, et le processus node ne les voit donc pas) :
 *
 *   set -a && . ./.env.local && set +a && node scripts/typo-cleanup-db.mjs
 *   set -a && . ./.env.local && set +a && node scripts/typo-cleanup-db.mjs --write
 */

import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const WRITE = process.argv.includes("--write");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * Colonnes passées en revue, table par table.
 * `title` regroupe les colonnes traitées comme des titres : le tiret y devient
 * deux-points, parce qu'il y introduit un complément et non une incise.
 */
const TARGETS = [
  { table: "formations", title: ["title"], text: ["description", "summary_html", "objectives_html", "program_html", "audience_html"] },
  { table: "formation_templates", title: ["title"], text: ["summary_html", "objectives_html", "program_html", "audience_html"] },
  { table: "accompagnements", title: ["title"], text: ["description"] },
  { table: "accompagnement_sections", title: ["title"], text: [] },
  // `content` est du JSONB : le texte est enfoui dans la structure du bloc,
  // d'où la marche récursive plus bas.
  { table: "accompagnement_blocks", title: [], text: ["content"] },
  {
    table: "blog_posts",
    title: ["title", "meta_title", "conclusion_title"],
    text: ["excerpt", "body_html", "meta_description", "conclusion_text", "references_html"],
  },
  { table: "email_templates", title: ["subject"], text: ["body_html"] },
  { table: "surveys", title: ["title"], text: ["intro", "thank_you_message"] },
  { table: "survey_questions", title: [], text: ["label", "explanation_html"] },
  { table: "consultation_types", title: ["title"], text: ["description"] },
];

const clean = (value, asTitle) => {
  if (typeof value !== "string" || !value.includes("—")) return null;

  // Deux-points seulement s'ils ne font pas doublon : « Allaiter en vacances :
  // voiture, train — mon plan » deviendrait sinon un titre à deux
  // deux-points. Idem après un point d'interrogation, où la virgule enchaîne
  // mieux.
  const alreadyPunctuated = /:/.test(value) || /[?!]\s*»?\s*—/.test(value);
  const replacement = asTitle && !alreadyPunctuated ? " : " : ", ";

  const next = value
    .replace(/\s*—\s*/g, replacement)
    // Un tiret en fin de phrase ne séparait rien : le remplacer laisserait une
    // virgule suspendue.
    .replace(/,\s*([.!?])/g, "$1")
    .replace(/,\s*$/, "");
  return next === value ? null : next;
};

/**
 * Nettoie récursivement les chaînes d'une valeur JSONB.
 *
 * Renvoie `null` si rien n'a changé, pour que l'appelant n'écrive pas une
 * ligne identique.
 */
const cleanDeep = (value) => {
  if (typeof value === "string") return clean(value, false);
  if (Array.isArray(value)) {
    let touched = false;
    const next = value.map((entry) => {
      const cleaned = cleanDeep(entry);
      if (cleaned === null) return entry;
      touched = true;
      return cleaned;
    });
    return touched ? next : null;
  }
  if (value && typeof value === "object") {
    let touched = false;
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      const cleaned = cleanDeep(entry);
      if (cleaned === null) next[key] = entry;
      else {
        next[key] = cleaned;
        touched = true;
      }
    }
    return touched ? next : null;
  }
  return null;
};

const report = [];
let updates = 0;
let quotes = 0;

for (const { table, title, text } of TARGETS) {
  const columns = [...title, ...text];
  const { data, error } = await supabase.from(table).select(["id", ...columns].join(","));

  if (error) {
    console.error(`[${table}] lecture impossible : ${error.message}`);
    continue;
  }

  for (const row of data ?? []) {
    const patch = {};
    for (const column of columns) {
      const value = row[column];
      if (typeof value === "string" && /[«»]/.test(value)) quotes++;

      const next =
        typeof value === "string" || value === null
          ? clean(value, title.includes(column))
          : cleanDeep(value);

      if (next !== null) {
        patch[column] = next;
        const before = typeof value === "string" ? value : JSON.stringify(value);
        const after = typeof next === "string" ? next : JSON.stringify(next);
        report.push(
          `\n${table}#${row.id} · ${column}\n  - ${before.slice(0, 300)}\n  + ${after.slice(0, 300)}`,
        );
      }
    }

    if (Object.keys(patch).length === 0) continue;
    updates++;

    if (WRITE) {
      const { error: updateError } = await supabase.from(table).update(patch).eq("id", row.id);
      if (updateError) console.error(`[${table}#${row.id}] ${updateError.message}`);
    }
  }
}

const header = `# Passe typographique en base\n\n${updates} ligne(s) ${WRITE ? "réécrites" : "à réécrire"}.\n${quotes} champ(s) contiennent des guillemets français, laissés en l'état pour relecture.\n`;
writeFileSync("docs/typo-cleanup-db.md", header + report.join("\n") + "\n");
console.log(header);
console.log("Rapport détaillé : docs/typo-cleanup-db.md");

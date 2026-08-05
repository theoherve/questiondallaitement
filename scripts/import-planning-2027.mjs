#!/usr/bin/env node
/**
 * Import du planning de formations 2027 dans la table events.
 *
 * Source : scripts/data/planning-2027.csv (transcription du Planning_2027_v5.csv
 * fourni par Carole, dates ISO resolues via la colonne Jour, lignes OFF /
 * feries / mercredis preserves / formations suivies par Carole exclues).
 *
 * Les evenements sont crees NON PUBLIES, sans tarif affiche : Carole repasse
 * ensuite pour completer description, prix, lieu, lien externe et publier.
 *
 * Usage :
 *   source .env.local && node scripts/import-planning-2027.mjs            # dry-run
 *   source .env.local && node scripts/import-planning-2027.mjs --apply    # ecrit en base
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "data/planning-2027.csv");
const APPLY = process.argv.includes("--apply");
const CONSULTANT_SLUG = process.env.PLANNING_CONSULTANT_SLUG ?? "carole-herve";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Horaires par defaut ────────────────────────────────────────────────────
// Le planning ne donne pas d'heures : journee 9h-17h, demi-journee 9h-12h30.
// Les creneaux explicites du commentaire (ex. "12h-14h30") ont la priorite.

const FULL_DAY = { start: "09:00", end: "17:00" };
const HALF_DAY = { start: "09:00", end: "12:30" };
const EVENING = { start: "20:00", end: "21:00" };

const parseSlotFromComment = (comment) => {
  const match = comment.match(/(\d{1,2})h(\d{2})?\s*[-a]\s*(\d{1,2})h(\d{2})?/i);
  if (!match) return null;
  const pad = (h, m) => `${String(h).padStart(2, "0")}:${m ?? "00"}`;
  return { start: pad(match[1], match[2]), end: pad(match[3], match[4]) };
};

const slotFor = (row) => {
  const explicit = parseSlotFromComment(row.commentaire);
  if (explicit) return explicit;
  if (row.duree === "0,25") return EVENING;
  if (row.duree === "0,5") return HALF_DAY;
  return FULL_DAY;
};

// ─── Organismes ─────────────────────────────────────────────────────────────

const providerSlugFor = (row) => {
  if (row.pole === "EDBN") return "edbn";
  if (row.pole === "CLINIC HALAV") return "clinic-halav";
  if (row.pole === "EXTERNE") {
    if (/CFPCO/i.test(row.intitule)) return "cfpco";
    if (/DYSKATE/i.test(row.intitule)) return "dyskate";
  }
  return "moi-en-direct";
};

// WEBINAIRE et RENCONTRE EN APARTE sont distanciels, le reste est presentiel.
// A verifier au cas par cas par Carole.
const typeFor = (row) =>
  /WEBINAIRE|RENCONTRE EN APARTE/i.test(row.intitule) ? "online" : "in_person";

// Europe/Paris : CET (+01) l'hiver, CEST (+02) du dernier dimanche de mars au
// dernier dimanche d'octobre. Un offset fixe decalerait tout l'ete d'une heure.
const parisOffset = (dateIso) => {
  const lastSunday = (month) => {
    const d = new Date(Date.UTC(2027, month + 1, 0));
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d.toISOString().slice(0, 10);
  };
  const summer = dateIso >= lastSunday(2) && dateIso < lastSunday(9);
  return summer ? "+02:00" : "+01:00";
};

const parisInstant = (dateIso, time) =>
  new Date(`${dateIso}T${time}:00${parisOffset(dateIso)}`).toISOString();

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ─── Lecture CSV ────────────────────────────────────────────────────────────

const readRows = () => {
  const lines = readFileSync(CSV_PATH, "utf8").trim().split("\n");
  const header = lines[0].split(";");
  return lines.slice(1).map((line) => {
    const cells = line.split(";");
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]));
  });
};

// Deux lignes consecutives (jours calendaires qui se suivent) de meme intitule
// et meme pole forment une seule session multi-jours.
const groupRows = (rows) => {
  const nextDay = (iso) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const groups = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    const continues =
      last &&
      last.intitule === row.intitule &&
      last.pole === row.pole &&
      nextDay(last.rows[last.rows.length - 1].date_iso) === row.date_iso;

    if (continues) last.rows.push(row);
    else groups.push({ intitule: row.intitule, pole: row.pole, rows: [row] });
  }
  return groups;
};

const buildEvent = (group, consultantId, providerIds) => {
  const first = group.rows[0];
  const last = group.rows[group.rows.length - 1];
  const startSlot = slotFor(first);
  const endSlot = slotFor(last);

  const comments = group.rows
    .map((r) => r.commentaire)
    .filter(Boolean)
    .join(" | ");

  const providerSlug = providerSlugFor(first);

  return {
    consultant_id: consultantId,
    title: first.intitule,
    slug: `${slugify(first.intitule)}-${first.date_iso}`,
    description: comments ? `Planning 2027 — ${comments}` : null,
    type: typeFor(first),
    starts_at: parisInstant(first.date_iso, startSlot.start),
    ends_at: parisInstant(last.date_iso, endSlot.end),
    location: null,
    max_participants: null,
    price_cents: 0,
    currency: "eur",
    show_price: false,
    provider_id: providerIds[providerSlug] ?? null,
    external_url: null,
    is_published: false,
  };
};

// ─── Main ───────────────────────────────────────────────────────────────────

const main = async () => {
  const { data: consultant, error: consultantError } = await supabase
    .from("consultants")
    .select("id")
    .eq("slug", CONSULTANT_SLUG)
    .single();

  if (consultantError || !consultant) {
    console.error(`Consultante introuvable pour le slug "${CONSULTANT_SLUG}"`);
    process.exit(1);
  }

  const { data: providers } = await supabase
    .from("training_providers")
    .select("id, slug");
  const providerIds = Object.fromEntries(
    (providers ?? []).map((p) => [p.slug, p.id]),
  );

  const groups = groupRows(readRows());
  const events = groups.map((g) => buildEvent(g, consultant.id, providerIds));

  const missingProvider = groups
    .map((g, i) => [providerSlugFor(g.rows[0]), events[i]])
    .filter(([slug]) => !providerIds[slug]);
  if (missingProvider.length > 0) {
    console.error(
      "Organismes absents de training_providers :",
      [...new Set(missingProvider.map(([slug]) => slug))].join(", "),
    );
    console.error("Applique la migration 00061 avant de relancer.");
    process.exit(1);
  }

  const { data: existing } = await supabase
    .from("events")
    .select("slug")
    .in("slug", events.map((e) => e.slug));
  const existingSlugs = new Set((existing ?? []).map((e) => e.slug));

  const toInsert = events.filter((e) => !existingSlugs.has(e.slug));

  console.log(`${groups.length} sessions dans le planning`);
  console.log(`${existingSlugs.size} deja en base (ignorees)`);
  console.log(`${toInsert.length} a inserer`);
  for (const e of toInsert) {
    console.log(
      `  ${e.starts_at.slice(0, 10)} → ${e.ends_at.slice(0, 10)}  ${e.title}`,
    );
  }

  if (!APPLY) {
    console.log("\nDry-run. Relance avec --apply pour ecrire en base.");
    return;
  }
  if (toInsert.length === 0) return;

  const { error } = await supabase.from("events").insert(toInsert);
  if (error) {
    console.error("Insertion echouee :", error.message);
    process.exit(1);
  }
  console.log(`\n${toInsert.length} evenements crees (non publies).`);
};

main();

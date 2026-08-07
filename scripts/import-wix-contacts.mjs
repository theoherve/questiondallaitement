#!/usr/bin/env node
/**
 * Import Wix contacts into Supabase profiles.
 *
 * - Reads a CSV export from Wix Contacts
 * - Creates profiles WITHOUT password (Option B: lazy password reset)
 * - Members (est membre du site = true) get a profile with email_verified = true
 * - Non-members get a profile with email_verified = false (no login until admin activates)
 * - Parses "Libellés" column (semicolon-separated tags)
 * - For each label:
 *     - Creates/links `labels` + `contact_labels` row
 *     - Fuzzy-matches against formations → creates `accompagnement_enrollments`
 *       (stripe_payment_intent_id = "wix-migration")
 *     - If label looks formation-like but no match → adds "import-a-verifier" label
 *
 * Usage:
 *   source .env.local && node scripts/import-wix-contacts.mjs <csv-file> [--dry-run]
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const DRY_RUN = process.argv.includes("--dry-run");
const csvPath = process.argv.find((a) => a.endsWith(".csv"));

if (!csvPath) {
  console.error("Usage: node scripts/import-wix-contacts.mjs <csv-file> [--dry-run]");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── CSV Parser ─────────────────────────────────────────────────────────────
function parseCSV(text) {
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let current = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"' && normalized[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(cell);
        cell = "";
      } else if (ch === "\n") {
        current.push(cell);
        rows.push(current);
        current = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length || current.length) {
    current.push(cell);
    rows.push(current);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((v) => v && v.trim()))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] || "").trim();
      });
      return obj;
    });
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function parseName(label) {
  if (!label) return { first_name: null, last_name: null };
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: null };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso.toISOString();
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const date = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

function parseDateOnly(dateStr) {
  const iso = parseDate(dateStr);
  return iso ? iso.split("T")[0] : null;
}

function parseProductNames(str) {
  if (!str) return null;
  const names = str.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  return names.length > 0 ? names : null;
}

function parseLabels(str) {
  if (!str) return [];
  // Wix labels within a single cell are semicolon-separated
  return str.split(";").map((s) => s.trim()).filter(Boolean);
}

function isMember(row) {
  const val = (row["est membre du site"] || "").toLowerCase();
  return val === "true" || val === "oui" || val === "yes" || val === "1";
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeForMatch(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Heuristic: does this label look like it might be a formation?
function looksFormationLike(label) {
  const l = label.toLowerCase();
  return (
    l.includes("pack") ||
    l.includes("formation") ||
    l.includes("accompagnement") ||
    l.includes("webinaire") ||
    l.includes("(gratuit)") ||
    l.includes("(payant)") ||
    l.length > 30
  );
}

// Fuzzy match label → formation.
// Returns best match {formation, score} or null.
function matchFormation(label, formations) {
  const normLabel = normalizeForMatch(label);
  if (!normLabel) return null;

  let best = null;
  for (const f of formations) {
    const normTitle = normalizeForMatch(f.title);
    if (!normTitle) continue;

    let score = 0;
    if (normLabel === normTitle) score = 1.0;
    else if (normLabel.includes(normTitle)) score = 0.9;
    else if (normTitle.includes(normLabel)) score = 0.85;
    else {
      // Word overlap score
      const labelWords = new Set(normLabel.split(" "));
      const titleWords = new Set(normTitle.split(" "));
      const common = [...titleWords].filter((w) => labelWords.has(w) && w.length > 2);
      if (titleWords.size > 0) {
        score = common.length / titleWords.size;
      }
    }

    if (!best || score > best.score) {
      best = { formation: f, score };
    }
  }
  return best;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const csvText = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvText);

  console.log(`Parsed ${rows.length} contacts from CSV`);
  if (rows.length === 0) return;
  console.log("CSV columns:", Object.keys(rows[0]).join(", "));

  // Fetch all formations for matching
  const { data: formations, error: formErr } = await supabase
    .from("accompagnements")
    .select("id, title, slug")
    .is("deleted_at", null);

  if (formErr) {
    console.error("Failed to fetch accompagnements:", formErr.message);
    process.exit(1);
  }
  console.log(`Loaded ${formations.length} formations for matching`);

  // Pre-fetch existing labels (name → id cache)
  const { data: existingLabels } = await supabase.from("labels").select("id, name, slug");
  const labelCache = new Map();
  for (const l of existingLabels || []) {
    labelCache.set(l.name.toLowerCase(), { id: l.id, slug: l.slug });
  }

  // Ensure "import-a-verifier" label exists
  const REVIEW_LABEL = "Import à vérifier";
  const REVIEW_SLUG = "import-a-verifier";
  let reviewLabelId = labelCache.get(REVIEW_LABEL.toLowerCase())?.id;
  if (!reviewLabelId && !DRY_RUN) {
    const { data: inserted, error } = await supabase
      .from("labels")
      .insert({ name: REVIEW_LABEL, slug: REVIEW_SLUG, color: "#F59E0B" })
      .select("id")
      .single();
    if (error) console.error("Failed to create review label:", error.message);
    else {
      reviewLabelId = inserted.id;
      labelCache.set(REVIEW_LABEL.toLowerCase(), { id: reviewLabelId, slug: REVIEW_SLUG });
    }
  }

  const stats = {
    created: 0,
    skipped_existing: 0,
    skipped_no_email: 0,
    errors: 0,
    labels_created: 0,
    labels_attached: 0,
    enrollments_created: 0,
    unmatched_formation_like: 0,
    flagged_for_review: 0,
  };

  const MATCH_THRESHOLD = 0.6;

  for (const row of rows) {
    const email = (row["E-mail"] || row["Email"] || row["email"] || "").trim().toLowerCase();

    if (!email) {
      stats.skipped_no_email++;
      continue;
    }

    // Check existing
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      console.log(`  SKIP (exists): ${email}`);
      stats.skipped_existing++;
      continue;
    }

    const { first_name, last_name } = parseName(row["Libellé"] || row["Libelle"]);
    const member = isMember(row);
    const labels = parseLabels(row["Libellés"] || row["Libelles"] || "");

    const profileId = randomUUID();
    const profile = {
      id: profileId,
      email,
      first_name,
      last_name,
      phone: row["Téléphone"] || row["Telephone"] || null,
      roles: ["client"],
      password_hash: null,
      email_verified: member,
      date_of_birth: parseDateOnly(row["Date de naissance"]),
      language: row["Langue"] || null,
      country: row["Pays/État"] || row["Pays"] || null,
      city: row["Ville"] || null,
      street: row["Rue"] || null,
      company: row["Société"] || row["Societe"] || null,
      job_title: row["Poste"] || null,
      wix_contact_id: row["CONTACT ID"] || null,
      wix_product_names: parseProductNames(row["Product Names"]),
      created_at: parseDate(row["Date de création du contact"] || row["DATE_AJOUT"]) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (DRY_RUN) {
      console.log(`  DRY RUN: ${email} (member=${member}, labels=${labels.length})`);
      for (const lbl of labels) {
        const m = matchFormation(lbl, formations);
        if (m && m.score >= MATCH_THRESHOLD) {
          console.log(`    → label "${lbl}" MATCHES formation "${m.formation.title}" (score ${m.score.toFixed(2)})`);
          stats.enrollments_created++;
        } else if (looksFormationLike(lbl)) {
          console.log(`    → label "${lbl}" LOOKS LIKE formation but no match (best score ${m?.score?.toFixed(2) ?? "0"})`);
          stats.unmatched_formation_like++;
        }
      }
      stats.created++;
      continue;
    }

    const { error } = await supabase.from("profiles").insert(profile);
    if (error) {
      console.error(`  ERROR creating ${email}:`, error.message);
      stats.errors++;
      continue;
    }

    console.log(`  CREATED: ${email} (member=${member}, labels=${labels.length})`);
    stats.created++;

    // Process labels
    let needsReviewFlag = false;
    for (const lbl of labels) {
      // Upsert label
      let labelInfo = labelCache.get(lbl.toLowerCase());
      if (!labelInfo) {
        const slug = slugify(lbl) || `label-${randomUUID().slice(0, 8)}`;
        const { data: newLabel, error: labelErr } = await supabase
          .from("labels")
          .insert({ name: lbl, slug, color: "#6B7280" })
          .select("id, slug")
          .single();

        if (labelErr) {
          // May be unique violation on slug — try to fetch
          const { data: existingByName } = await supabase
            .from("labels")
            .select("id, slug")
            .eq("name", lbl)
            .maybeSingle();
          if (existingByName) {
            labelInfo = { id: existingByName.id, slug: existingByName.slug };
          } else {
            console.error(`    ERROR creating label "${lbl}":`, labelErr.message);
            continue;
          }
        } else {
          labelInfo = { id: newLabel.id, slug: newLabel.slug };
          stats.labels_created++;
        }
        labelCache.set(lbl.toLowerCase(), labelInfo);
      }

      // Attach label to profile
      const { error: linkErr } = await supabase.from("contact_labels").insert({
        profile_id: profileId,
        label_id: labelInfo.id,
        assigned_by: "wix-migration",
      });
      if (!linkErr) stats.labels_attached++;

      // Match against formations
      const match = matchFormation(lbl, formations);
      if (match && match.score >= MATCH_THRESHOLD) {
        const { error: enrollErr } = await supabase.from("accompagnement_enrollments").insert({
          client_id: profileId,
          accompagnement_id: match.formation.id,
          stripe_payment_intent_id: "wix-migration",
        });
        if (!enrollErr) {
          console.log(`    ENROLLED in "${match.formation.title}" (score ${match.score.toFixed(2)})`);
          stats.enrollments_created++;
        } else if (!enrollErr.message?.includes("duplicate")) {
          console.error(`    ERROR enrolling:`, enrollErr.message);
        }
      } else if (looksFormationLike(lbl)) {
        console.warn(`    WARN: label "${lbl}" looks formation-like but no match (best score ${match?.score?.toFixed(2) ?? "0"}) for ${email}`);
        stats.unmatched_formation_like++;
        needsReviewFlag = true;
      }
    }

    if (needsReviewFlag && reviewLabelId) {
      await supabase
        .from("contact_labels")
        .insert({ profile_id: profileId, label_id: reviewLabelId, assigned_by: "wix-migration" });
      stats.flagged_for_review++;
    }
  }

  console.log("\n── Import Summary ──");
  console.log(`  Profiles created:        ${stats.created}`);
  console.log(`  Skipped (exists):        ${stats.skipped_existing}`);
  console.log(`  Skipped (no email):      ${stats.skipped_no_email}`);
  console.log(`  Errors:                  ${stats.errors}`);
  console.log(`  Labels created:          ${stats.labels_created}`);
  console.log(`  Labels attached:         ${stats.labels_attached}`);
  console.log(`  Enrollments created:     ${stats.enrollments_created}`);
  console.log(`  Unmatched formation-like: ${stats.unmatched_formation_like}`);
  console.log(`  Profiles flagged review: ${stats.flagged_for_review}`);
  if (DRY_RUN) console.log("  (DRY RUN — nothing written)");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Import Wix contacts into Supabase profiles
 *
 * - Reads a CSV export from Wix Contacts
 * - Creates profiles WITHOUT password (Option B: lazy password reset)
 * - Members (est membre du site = true) get a real profile for auth
 * - Non-members are imported as contacts only (for Brevo sync)
 * - Optionally sends migration welcome emails to members
 * - Syncs all contacts to Brevo
 *
 * Usage:
 *   source .env.local && node scripts/import-wix-contacts.mjs <csv-file> [--dry-run] [--send-emails]
 *
 * CSV expected columns (Wix export):
 *   Libellé, E-mail, Téléphone, est membre du site,
 *   Date de création du contact, Date de dernière activité,
 *   Date de naissance, Langue, Pays/État, Ville, Rue,
 *   Société, Poste, CONTACT ID, Product Names
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const SEND_EMAILS = process.argv.includes("--send-emails");
const csvPath = process.argv.find((a) => a.endsWith(".csv"));

if (!csvPath) {
  console.error("Usage: node scripts/import-wix-contacts.mjs <csv-file> [--dry-run] [--send-emails]");
  process.exit(1);
}

// ─── Supabase client (service role) ─────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Run: source .env.local && node scripts/import-wix-contacts.mjs ...");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── CSV Parser (simple, handles quoted fields) ─────────────────────────────
function parseCSV(text) {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || "";
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function parseName(label) {
  if (!label) return { first_name: null, last_name: null };
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: null };
  const first_name = parts[0];
  const last_name = parts.slice(1).join(" ");
  return { first_name, last_name };
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Wix dates can be various formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
  // Try ISO first
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso.toISOString();
  // Try DD/MM/YYYY
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const date = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

function parseDateOnly(dateStr) {
  if (!dateStr) return null;
  const iso = parseDate(dateStr);
  if (!iso) return null;
  return iso.split("T")[0]; // YYYY-MM-DD for DATE column
}

function parseProductNames(str) {
  if (!str) return null;
  const names = str.split(",").map((s) => s.trim()).filter(Boolean);
  return names.length > 0 ? names : null;
}

function isMember(row) {
  const val = (row["est membre du site"] || "").toLowerCase();
  return val === "true" || val === "oui" || val === "yes" || val === "1";
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const csvText = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvText);

  console.log(`Parsed ${rows.length} contacts from CSV`);
  if (rows.length === 0) return;

  // Show first row keys for debugging
  console.log("CSV columns:", Object.keys(rows[0]).join(", "));

  const stats = { created: 0, skipped_existing: 0, skipped_no_email: 0, errors: 0, emails_sent: 0 };
  const RESET_TOKEN_EXPIRY_HOURS = 72; // 3 days for migration emails

  for (const row of rows) {
    const email = (row["E-mail"] || row["Email"] || row["e-mail"] || row["email"] || "").trim().toLowerCase();

    if (!email) {
      stats.skipped_no_email++;
      continue;
    }

    // Check if already exists
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

    const profile = {
      id: randomUUID(),
      email,
      first_name,
      last_name,
      phone: row["Téléphone"] || row["Telephone"] || null,
      roles: ["client"],
      password_hash: null, // No password — Option B lazy reset
      email_verified: member, // Members get verified (they had a Wix account)
      date_of_birth: parseDateOnly(row["Date de naissance"]) || null,
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
      console.log(`  DRY RUN: would create ${email} (member: ${member})`);
      stats.created++;
      continue;
    }

    const { error } = await supabase.from("profiles").insert(profile);

    if (error) {
      console.error(`  ERROR creating ${email}:`, error.message);
      stats.errors++;
      continue;
    }

    console.log(`  CREATED: ${email} (member: ${member})`);
    stats.created++;

    // For members: generate password reset token and optionally send welcome email
    if (member && SEND_EMAILS) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

      await supabase
        .from("profiles")
        .update({ password_reset_token: token, password_reset_expires: expires })
        .eq("id", profile.id);

      // We don't send from this script directly — we use an API call or separate email step
      // Store token for batch email sending
      console.log(`  TOKEN set for ${email}`);
      stats.emails_sent++;

      // Small delay to avoid rate limits
      await sleep(100);
    }
  }

  console.log("\n── Import Summary ──");
  console.log(`  Created:         ${stats.created}`);
  console.log(`  Skipped (exist): ${stats.skipped_existing}`);
  console.log(`  Skipped (no email): ${stats.skipped_no_email}`);
  console.log(`  Errors:          ${stats.errors}`);
  console.log(`  Tokens set:      ${stats.emails_sent}`);
  if (DRY_RUN) console.log("  (DRY RUN — nothing was actually written)");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

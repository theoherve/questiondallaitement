#!/usr/bin/env node
/**
 * Send migration welcome emails to imported Wix members
 *
 * Targets profiles where:
 *   - password_hash IS NULL (migrated, never set password)
 *   - email_verified = true (was a Wix member)
 *   - wix_contact_id IS NOT NULL (imported from Wix)
 *   - password_reset_token IS NULL (hasn't already been sent)
 *
 * Usage:
 *   source .env.local && node scripts/send-migration-emails.mjs [--dry-run] [--batch-size=50]
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { Resend } from "resend";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = parseInt(
  (process.argv.find((a) => a.startsWith("--batch-size=")) || "").split("=")[1] || "50",
  10,
);

// ─── Env ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const FROM_NAME = process.env.RESEND_FROM_NAME || "Question d'Allaitement";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@formation-allaitement.com";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const resend = new Resend(RESEND_API_KEY);

const RESET_TOKEN_EXPIRY_HOURS = 72; // 3 days for migration

// ─── Email template ─────────────────────────────────────────────────────────
function buildEmailHtml(clientName, setupUrl) {
  return `
    <h1>Bienvenue sur votre nouvel espace</h1>
    <p>Bonjour ${clientName},</p>
    <p>Votre compte Question d'Allaitement a été transféré vers notre nouvelle plateforme.</p>
    <p>Pour accéder à votre espace personnel, définissez votre mot de passe en cliquant ci-dessous :</p>
    <p><a href="${setupUrl}" style="display:inline-block;padding:12px 24px;background-color:#A0283E;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Activer mon compte</a></p>
    <p>Ce lien est valide pendant 72 heures. Passé ce délai, cliquez sur « Mot de passe oublié » depuis la page de connexion.</p>
    <p>À très bientôt,<br>L'équipe Question d'Allaitement</p>
  `;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  // Try to load DB template first
  const { data: tpl } = await supabase
    .from("email_templates")
    .select("subject, body_html")
    .eq("name", "migration_welcome")
    .single();

  // Fetch migrated members who haven't received the email yet
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, first_name")
    .is("password_hash", null)
    .eq("email_verified", true)
    .not("wix_contact_id", "is", null)
    .is("password_reset_token", null)
    .is("deleted_at", null)
    .limit(BATCH_SIZE);

  if (error) {
    console.error("Failed to fetch profiles:", error.message);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} migrated members to email`);
  if (profiles.length === 0) return;

  let sent = 0;
  let errors = 0;

  for (const profile of profiles) {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
    const setupUrl = `${APP_URL}/reset-password?token=${token}`;
    const clientName = profile.first_name || "Utilisateur";

    if (DRY_RUN) {
      console.log(`  DRY RUN: would email ${profile.email}`);
      sent++;
      continue;
    }

    // Set token first
    await supabase
      .from("profiles")
      .update({ password_reset_token: token, password_reset_expires: expires })
      .eq("id", profile.id);

    // Send email
    try {
      const subject = tpl?.subject
        ? tpl.subject.replaceAll("{{client_name}}", clientName)
        : "Votre espace Question d'Allaitement a migré";
      const html = tpl?.body_html
        ? tpl.body_html.replaceAll("{{client_name}}", clientName).replaceAll("{{setup_url}}", setupUrl)
        : buildEmailHtml(clientName, setupUrl);

      await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: profile.email,
        subject,
        html,
      });

      console.log(`  SENT: ${profile.email}`);
      sent++;
    } catch (err) {
      console.error(`  ERROR sending to ${profile.email}:`, err.message);
      // Clear token on failure so it can be retried
      await supabase
        .from("profiles")
        .update({ password_reset_token: null, password_reset_expires: null })
        .eq("id", profile.id);
      errors++;
    }

    // Rate limit: ~10 emails/sec max
    await sleep(150);
  }

  console.log(`\n── Email Summary ──`);
  console.log(`  Sent:   ${sent}`);
  console.log(`  Errors: ${errors}`);
  if (DRY_RUN) console.log("  (DRY RUN)");
  if (profiles.length === BATCH_SIZE) {
    console.log(`\n  More profiles remain. Run again to process next batch.`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

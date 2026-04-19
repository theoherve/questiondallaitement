#!/usr/bin/env node
/**
 * Sync all Supabase profiles to Brevo
 *
 * Standalone version of syncAllContactsToBrevo — usable from CLI
 * without importing TS modules.
 *
 * Usage:
 *   source .env.local && node scripts/sync-brevo-contacts.mjs [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const DEFAULT_LIST_ID = process.env.BREVO_DEFAULT_LIST_ID
  ? parseInt(process.env.BREVO_DEFAULT_LIST_ID)
  : undefined;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!BREVO_API_KEY) {
  console.error("Missing BREVO_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BREVO_BASE = "https://api.brevo.com/v3";
const brevoHeaders = {
  "api-key": BREVO_API_KEY,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function createBrevoContact(email, attributes, listIds) {
  const body = { email, attributes, updateEnabled: true };
  if (listIds?.length) body.listIds = listIds;

  const res = await fetch(`${BREVO_BASE}/contacts`, {
    method: "POST",
    headers: brevoHeaders,
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo ${res.status}: ${JSON.stringify(err)}`);
  }
}

async function main() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("email, first_name, last_name, phone, roles")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error || !profiles) {
    console.error("Failed to fetch profiles:", error?.message);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} profiles to sync`);

  let synced = 0;
  let errors = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const attrs = {
          PRENOM: p.first_name || "",
          NOM: p.last_name || "",
          TELEPHONE: p.phone || "",
          ROLE: (p.roles || []).join(","),
        };

        if (DRY_RUN) {
          console.log(`  DRY RUN: ${p.email}`);
          return;
        }

        await createBrevoContact(p.email, attrs, DEFAULT_LIST_ID ? [DEFAULT_LIST_ID] : undefined);
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled") synced++;
      else {
        errors++;
        console.error(`  ERROR:`, r.reason?.message);
      }
    }

    // Rate limit
    if (i + BATCH_SIZE < profiles.length) {
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`  Progress: ${Math.min(i + BATCH_SIZE, profiles.length)}/${profiles.length}`);
  }

  console.log(`\n── Brevo Sync Summary ──`);
  console.log(`  Synced: ${synced}`);
  console.log(`  Errors: ${errors}`);
  if (DRY_RUN) console.log("  (DRY RUN)");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

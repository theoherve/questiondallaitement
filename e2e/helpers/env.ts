import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(__dirname, "../..");

/**
 * Minimal .env parser — the project has no dotenv dependency.
 *
 * This duplicates scripts/e2e/lib/env.mjs on purpose: Playwright transpiles
 * spec imports to CJS, which blows up on that file's ESM-only `import.meta`.
 * Keep the two in sync if the loading rules ever change.
 */
const loadEnvFile = (filename: string) => {
  const path = resolve(ROOT, filename);
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

loadEnvFile(".env.local");
loadEnvFile(".env.development.local");

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${key} (attendue dans .env.local)`,
    );
  }
  return value;
};

export const db = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export const appUrl = process.env.E2E_APP_URL ?? "http://localhost:3000";

/** Refuse to drive a live Stripe account: these specs create real charges. */
export const guardTestMode = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (secretKey.startsWith("sk_live_")) {
    throw new Error(
      "STRIPE_SECRET_KEY est une cle LIVE. La suite E2E refuse de tourner hors mode test.",
    );
  }
};

/**
 * Polls until `query` returns a row, or throws after `timeoutMs`.
 *
 * Fulfillment happens in the Stripe webhook, which lands *after* the browser is
 * already back on the confirmation page — asserting immediately is flaky by
 * construction, so every post-checkout DB check goes through this.
 */
export const waitForRow = async <T>(
  label: string,
  query: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  { timeoutMs = 30_000, intervalMs = 500 } = {},
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let lastError = "aucune ligne";

  while (Date.now() < deadline) {
    const { data, error } = await query();
    if (data) return data;
    if (error) lastError = error.message;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `${label} : rien en base apres ${timeoutMs}ms (${lastError}). ` +
      `Verifier que 'stripe listen --forward-to localhost:3000/api/webhooks/stripe' tourne.`,
  );
};

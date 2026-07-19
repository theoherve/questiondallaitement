import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(import.meta.dirname, "../../..");

/**
 * Minimal .env parser — the project has no dotenv dependency.
 * Later files do not override values already loaded.
 */
const loadEnvFile = (filename) => {
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

export const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${key} (attendue dans .env.local)`,
    );
  }
  return value;
};

export const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export const WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");

export const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:3000";

/**
 * Guard against running the E2E suite against a live Stripe account.
 * The suite writes fixtures directly to the database it points at.
 */
export const assertTestMode = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (secretKey.startsWith("sk_live_")) {
    throw new Error(
      "STRIPE_SECRET_KEY est une cle LIVE. La suite E2E refuse de tourner hors mode test.",
    );
  }
};

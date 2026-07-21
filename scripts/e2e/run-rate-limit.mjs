/**
 * 5-1 — Verification du limiteur de debit contre la vraie base.
 *
 * Les tests unitaires de `rate-limit.ts` mockent l'appel RPC : ils prouvent que
 * le code passe les bons parametres, pas que la fonction SQL compte juste. Or
 * tout l'interet de 5-1 est dans le SQL — l'atomicite du compteur en
 * particulier, qu'aucun mock ne peut mettre en defaut.
 *
 *   pnpm test:rate-limit
 *
 * Exige que la migration 00050 soit appliquee (`pnpm db:push`). Sans elle, les
 * scenarios echouent en disant explicitement quoi faire, plutot que de laisser
 * croire a une regression.
 *
 * Nettoie ses propres cles a la fin ; ne touche a aucune autre donnee.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const PREFIX = `e2e-rl-${Date.now()}`;
const results = [];

const test = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`  ✗ ${name}\n      ${error.message}`);
  }
};

const assertEqual = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label} : attendu ${expected}, recu ${actual}`);
  }
};

const call = async (key, limit, windowSeconds) => {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    throw new Error(
      `check_rate_limit indisponible (${error.message}) — ` +
        `la migration 00050 est-elle appliquee ? « pnpm db:push »`,
    );
  }
  return Array.isArray(data) ? data[0] : data;
};

const scenarioLimitEnforced = async () => {
  const key = `${PREFIX}:limite`;

  for (let i = 1; i <= 3; i++) {
    const row = await call(key, 3, 60);
    assertEqual(row.allowed, true, `tentative ${i} autorisee`);
    assertEqual(row.remaining, 3 - i, `restant apres tentative ${i}`);
  }

  const blocked = await call(key, 3, 60);
  assertEqual(blocked.allowed, false, "quatrieme tentative refusee");
  assertEqual(blocked.remaining, 0, "restant une fois bloque");
};

const scenarioWindowResets = async () => {
  // Fenetre d'une seconde : la limite doit se rouvrir apres expiration, sinon
  // une adresse resterait bloquee indefiniment.
  const key = `${PREFIX}:fenetre`;

  await call(key, 1, 1);
  const blocked = await call(key, 1, 1);
  assertEqual(blocked.allowed, false, "bloque dans la fenetre");

  await new Promise((r) => setTimeout(r, 1500));

  const reopened = await call(key, 1, 1);
  assertEqual(reopened.allowed, true, "autorise apres expiration");
};

const scenarioConcurrentCallsCannotBothPass = async () => {
  // Le coeur de 5-1. Un SELECT puis UPDATE separes laisseraient deux requetes
  // simultanees lire le meme compteur et se croire toutes deux sous la limite.
  // Aucun mock ne peut reveler ca : il faut de vraies requetes concurrentes.
  const key = `${PREFIX}:concurrence`;
  const LIMIT = 5;
  const ATTEMPTS = 20;

  const rows = await Promise.all(
    Array.from({ length: ATTEMPTS }, () => call(key, LIMIT, 60)),
  );

  const allowed = rows.filter((r) => r.allowed).length;
  assertEqual(allowed, LIMIT, "tentatives autorisees en parallele");
};

const scenarioKeysAreIndependent = async () => {
  const a = `${PREFIX}:cle-a`;
  const b = `${PREFIX}:cle-b`;

  await call(a, 1, 60);
  const blockedA = await call(a, 1, 60);
  assertEqual(blockedA.allowed, false, "cle A bloquee");

  const freshB = await call(b, 1, 60);
  assertEqual(freshB.allowed, true, "cle B intacte");
};

const cleanup = async () => {
  await supabase.from("rate_limits").delete().like("key", `${PREFIX}%`);
};

const main = async () => {
  console.log("\nLimitation de debit — contre la base reelle\n");

  await test("la limite est appliquee", scenarioLimitEnforced);
  await test("la fenetre se rouvre a expiration", scenarioWindowResets);
  await test(
    "des requetes simultanees ne passent pas toutes",
    scenarioConcurrentCallsCannotBothPass,
  );
  await test("les cles sont independantes", scenarioKeysAreIndependent);

  await cleanup();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} scenarios passes.`);

  if (failed.length) {
    console.log("\nEchecs :");
    for (const f of failed) console.log(`  - ${f.name} : ${f.error}`);
    process.exit(1);
  }
};

main().catch(async (error) => {
  await cleanup().catch(() => {});
  console.error(`\nEchec : ${error.message}`);
  process.exit(1);
});

/**
 * Verifie que chaque compte Connect enregistre existe bien dans le mode Stripe
 * courant.
 *
 * Les comptes Connect sont cloisonnes par environnement : un `acct_…` cree en
 * mode test n'existe pas en live, et rien dans l'identifiant ne permet de les
 * distinguer. La colonne `consultants.stripe_account_id` ne stocke qu'une
 * valeur : au moment de la bascule, les identifiants de test y restent et
 * l'application les envoie a Stripe en live, qui les refuse.
 *
 *   pnpm check:connect
 *
 * A lancer apres la bascule des cles (etape 6 de GO_LIVE.md) et avant
 * d'annoncer le service ouvert. Lecture seule : ne modifie rien.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";
if (!SECRET) {
  console.error("STRIPE_SECRET_KEY absent.");
  process.exit(1);
}

const mode = SECRET.startsWith("sk_live_") ? "LIVE" : "TEST";
const stripe = new Stripe(SECRET);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const main = async () => {
  console.log(`\nComptes Connect — verification en mode ${mode}\n`);

  const { data: consultants, error } = await supabase
    .from("consultants")
    .select("id, stripe_account_id, stripe_account_status, is_active");

  if (error) {
    console.error(`Lecture des consultantes impossible : ${error.message}`);
    process.exit(1);
  }

  let problems = 0;

  for (const consultant of consultants ?? []) {
    const label = consultant.id.slice(0, 8);

    if (!consultant.stripe_account_id) {
      const note = consultant.is_active
        ? "active mais sans compte — aucune reservation payante ne peut aboutir"
        : "pas de compte (consultante inactive)";
      console.log(`  ${consultant.is_active ? "✗" : "·"} ${label}  ${note}`);
      if (consultant.is_active) problems++;
      continue;
    }

    try {
      const account = await stripe.accounts.retrieve(
        consultant.stripe_account_id,
      );

      if (!account.charges_enabled) {
        console.log(
          `  ✗ ${label}  ${account.id} existe mais n'encaisse pas ` +
            `(charges_enabled=false, details_submitted=${account.details_submitted})`,
        );
        problems++;
        continue;
      }

      const mismatch = consultant.stripe_account_status !== "active";
      console.log(
        `  ${mismatch ? "✗" : "✓"} ${label}  ${account.id}  encaisse` +
          (mismatch
            ? ` — mais la base dit « ${consultant.stripe_account_status} », ` +
              `le webhook account.updated n'est peut-etre pas branche`
            : ""),
      );
      if (mismatch) problems++;
    } catch (err) {
      // Le cas qui motive ce script : identifiant herite de l'autre mode.
      console.log(
        `  ✗ ${label}  ${consultant.stripe_account_id} INTROUVABLE en ${mode} — ` +
          `probablement un compte de l'autre mode. ${err.message}`,
      );
      problems++;
    }
  }

  console.log(
    problems === 0
      ? "\nTous les comptes sont coherents.\n"
      : `\n${problems} probleme(s) — voir l'etape 6 de docs/GO_LIVE.md.\n`,
  );

  process.exit(problems === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error(`\nEchec : ${error.message}`);
  process.exit(1);
});

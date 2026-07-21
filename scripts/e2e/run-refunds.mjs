/**
 * 4-2 / 4-3 — Verification des remboursements cote API Stripe.
 *
 * Les tests unitaires verifient ce qu'on *passe* a Stripe. Ce n'est pas la
 * meme chose que constater ce que Stripe *fait* : la version precedente de
 * `createRefund` passait des parametres parfaitement valides et laissait
 * pourtant la consultante avec l'integralite d'une reservation remboursee.
 * Seule une charge reelle le revele.
 *
 * Cette suite cree donc de vrais PaymentIntents en mode test sur le compte
 * connecte de la fixture, appelle le `createRefund` de l'application, puis
 * relit les objets Stripe pour verifier la repartition de chaque centime.
 *
 *   pnpm test:e2e:refunds
 *
 * N'ecrit rien en base : ni reservation, ni paiement. Seuls des objets Stripe
 * en mode test sont crees, et ils ne sont pas supprimables par l'API — c'est
 * sans consequence, le mode test n'a pas de valeur.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { createJiti } from "jiti";

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

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";
if (SECRET.startsWith("sk_live_")) {
  console.error(
    "STRIPE_SECRET_KEY est une cle LIVE — cette suite encaisse et rembourse reellement.",
  );
  process.exit(1);
}
if (!SECRET) {
  console.error("STRIPE_SECRET_KEY absent.");
  process.exit(1);
}

const ACCOUNT = process.env.E2E_CONNECT_ACCOUNT;
if (!ACCOUNT || !ACCOUNT.startsWith("acct_")) {
  console.error(
    "E2E_CONNECT_ACCOUNT doit designer un vrai compte connecte onboarde :\n" +
      "Stripe refuse une charge destination vers un compte fictif.",
  );
  process.exit(1);
}

const stripe = new Stripe(SECRET);

// Le vrai `createRefund` de l'application, pas une reproduction : c'est lui
// que ces scenarios doivent mettre en defaut s'il regresse.
const jiti = createJiti(import.meta.url, { alias: { "@": resolve(ROOT, "src") } });
const { createRefund } = await jiti.import("@/lib/stripe/connect");
const { siteConfig } = await jiti.import("@/config/site");

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

/** Laisse Stripe materialiser transfert et commission, crees en differe. */
const settle = () => new Promise((r) => setTimeout(r, 2500));

const chargeWithDestination = async (amountCents, feeCents) => {
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "eur",
    payment_method: "pm_card_visa",
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    application_fee_amount: feeCents,
    transfer_data: { destination: ACCOUNT },
    metadata: { suite: "e2e-refunds" },
  });
  await settle();
  return intent;
};

/** Repartition reelle des fonds, lue chez Stripe apres remboursement. */
const split = async (intentId) => {
  const intent = await stripe.paymentIntents.retrieve(intentId, {
    expand: ["latest_charge.transfer", "latest_charge.application_fee"],
  });
  const charge = intent.latest_charge;
  const transfer = charge.transfer;
  const fee = charge.application_fee;

  const refunded = charge.amount_refunded;
  const reversed = transfer?.amount_reversed ?? 0;
  const feeAmount = fee?.amount ?? 0;
  const feeRefunded = fee?.amount_refunded ?? 0;

  return {
    client: refunded,
    platform: feeAmount - feeRefunded - refunded + reversed,
    consultant: (transfer?.amount ?? 0) - reversed - feeAmount + feeRefunded,
  };
};

const AMOUNT = 8000;
const COMMISSION_RATE = 15;
const FEE = Math.round(AMOUNT * (COMMISSION_RATE / 100));

const scenarioFullRefund = async () => {
  // 4-2 — annulation au-dela du seuil : la cliente recupere tout, et personne
  // ne conserve un centime d'une consultation qui n'aura pas lieu.
  const intent = await chargeWithDestination(AMOUNT, FEE);

  await createRefund(intent.id);
  await settle();

  const s = await split(intent.id);
  assertEqual(s.client, AMOUNT, "rembourse a la cliente");
  assertEqual(s.consultant, 0, "reste chez la consultante");
  assertEqual(s.platform, 0, "reste chez la plateforme");
};

const scenarioPenaltyRefund = async () => {
  // 4-3 — annulation tardive : la penalite revient integralement a la
  // consultante, la plateforme ne preleve rien.
  const penalty = Math.round(AMOUNT * siteConfig.cancellationPenaltyRate);
  const refundAmount = AMOUNT - penalty;

  const intent = await chargeWithDestination(AMOUNT, FEE);

  await createRefund(intent.id, refundAmount);
  await settle();

  const s = await split(intent.id);
  assertEqual(s.client, refundAmount, "rembourse a la cliente");
  assertEqual(s.consultant, penalty, "penalite revenant a la consultante");
  assertEqual(s.platform, 0, "prelevement plateforme sur la penalite");
};

const scenarioNothingLost = async () => {
  // Garde-fou comptable : quelle que soit la regle, la somme des trois parts
  // doit egaler le montant encaisse. Une repartition qui ne boucle pas
  // signifie que de l'argent a ete cree ou detruit quelque part.
  const intent = await chargeWithDestination(AMOUNT, FEE);

  await createRefund(intent.id, 3000);
  await settle();

  const s = await split(intent.id);
  assertEqual(
    s.client + s.consultant + s.platform,
    AMOUNT,
    "somme des parts",
  );
};

const main = async () => {
  console.log(
    `\nRemboursements — charges reelles en mode test sur ${ACCOUNT}\n`,
  );

  await test("annulation ≥ seuil → remboursement integral, personne ne garde rien", scenarioFullRefund);
  await test("annulation < seuil → penalite entierement pour la consultante", scenarioPenaltyRefund);
  await test("la repartition boucle toujours sur le montant encaisse", scenarioNothingLost);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} scenarios passes.`);

  if (failed.length) {
    console.log("\nEchecs :");
    for (const f of failed) console.log(`  - ${f.name} : ${f.error}`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`\nEchec : ${error.message}`);
  process.exit(1);
});

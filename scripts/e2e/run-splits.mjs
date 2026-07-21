/**
 * 4-6 — Repartition d'une vente entre plusieurs comptes, verifiee chez Stripe.
 *
 * Le modele precedent versait tout a la proprietaire par charge destination,
 * puis virait la part des collaboratrices depuis le solde de la plateforme.
 * Mesure en mode test : `balance_insufficient` — la plateforme n'a pas ces
 * fonds, ils sont partis avec la charge. L'echec etait avale dans
 * `audit_logs`, et la collaboratrice n'etait jamais payee.
 *
 * Cette suite verifie le nouveau modele sur de vraies charges : encaissement
 * par la plateforme, puis un virement par part citant la charge source.
 *
 *   pnpm test:e2e:splits
 *
 * N'ecrit rien en base : le calcul des parts et les virements passent par les
 * vraies fonctions de l'application, mais les collaboratrices sont decrites en
 * memoire plutot que seedees. Le cablage base est couvert a l'unite.
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
  console.error("STRIPE_SECRET_KEY est une cle LIVE — cette suite encaisse reellement.");
  process.exit(1);
}
if (!SECRET) {
  console.error("STRIPE_SECRET_KEY absent.");
  process.exit(1);
}

const ACCOUNT = process.env.E2E_CONNECT_ACCOUNT;
if (!ACCOUNT || !ACCOUNT.startsWith("acct_")) {
  console.error("E2E_CONNECT_ACCOUNT doit designer un vrai compte connecte onboarde.");
  process.exit(1);
}

const stripe = new Stripe(SECRET);

const jiti = createJiti(import.meta.url, { alias: { "@": resolve(ROOT, "src") } });
const { splitFormationRevenue } = await jiti.import("@/lib/stripe/revenue-split");
const { createTransfer } = await jiti.import("@/lib/stripe/connect");

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

const settle = () => new Promise((r) => setTimeout(r, 2500));

/** Charge encaissee par la plateforme : ni commission ni destinataire. */
const platformCharge = async (amountCents, transferGroup) => {
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "eur",
    payment_method: "pm_card_visa",
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    transfer_group: transferGroup,
    metadata: { suite: "e2e-splits" },
  });
  await settle();
  return intent;
};

const AMOUNT = 9900;
const FEE = 1485; // 15 %

const scenarioSplitReachesBothAccounts = async () => {
  const group = `split-${Date.now()}`;
  const intent = await platformCharge(AMOUNT, group);

  const parts = splitFormationRevenue({
    amountCents: AMOUNT,
    platformFeeCents: FEE,
    ownerId: "proprietaire",
    collaborators: [{ consultantId: "collaboratrice", revenueShare: 30 }],
  });

  for (const part of parts) {
    await createTransfer(
      part.amountCents,
      ACCOUNT,
      { part: part.consultantId },
      {
        sourceTransaction: intent.latest_charge,
        transferGroup: group,
        idempotencyKey: `${group}:${part.consultantId}`,
      },
    );
  }
  await settle();

  const transfers = await stripe.transfers.list({ transfer_group: group });
  assertEqual(transfers.data.length, 2, "nombre de virements");

  const total = transfers.data.reduce((sum, t) => sum + t.amount, 0);
  assertEqual(total, AMOUNT - FEE, "total reparti");

  // Chaque virement doit citer la charge : sans cela, Stripe puise dans le
  // solde de la plateforme et echoue des qu'il est vide.
  for (const transfer of transfers.data) {
    if (!transfer.source_transaction) {
      throw new Error(`virement ${transfer.id} sans source_transaction`);
    }
  }
};

const scenarioPlatformKeepsExactlyItsFee = async () => {
  const group = `fee-${Date.now()}`;
  const intent = await platformCharge(AMOUNT, group);

  const parts = splitFormationRevenue({
    amountCents: AMOUNT,
    platformFeeCents: FEE,
    ownerId: "proprietaire",
    collaborators: [{ consultantId: "collaboratrice", revenueShare: 30 }],
  });

  for (const part of parts) {
    await createTransfer(part.amountCents, ACCOUNT, { part: part.consultantId }, {
      sourceTransaction: intent.latest_charge,
      transferGroup: group,
      idempotencyKey: `${group}:${part.consultantId}`,
    });
  }
  await settle();

  const transfers = await stripe.transfers.list({ transfer_group: group });
  const distributed = transfers.data.reduce((sum, t) => sum + t.amount, 0);

  assertEqual(AMOUNT - distributed, FEE, "commission conservee par la plateforme");
};

const scenarioReplayDoesNotPayTwice = async () => {
  // Stripe redelivre volontiers un evenement. La cle d'idempotence doit rendre
  // le rejeu inoffensif — sinon chaque part part une seconde fois.
  const group = `replay-${Date.now()}`;
  const intent = await platformCharge(AMOUNT, group);

  const parts = splitFormationRevenue({
    amountCents: AMOUNT,
    platformFeeCents: FEE,
    ownerId: "proprietaire",
    collaborators: [{ consultantId: "collaboratrice", revenueShare: 30 }],
  });

  const send = () =>
    Promise.all(
      parts.map((part) =>
        createTransfer(part.amountCents, ACCOUNT, { part: part.consultantId }, {
          sourceTransaction: intent.latest_charge,
          transferGroup: group,
          idempotencyKey: `${group}:${part.consultantId}`,
        }),
      ),
    );

  await send();
  await send(); // redelivery
  await settle();

  const transfers = await stripe.transfers.list({ transfer_group: group });
  assertEqual(transfers.data.length, parts.length, "virements apres rejeu");

  const total = transfers.data.reduce((sum, t) => sum + t.amount, 0);
  assertEqual(total, AMOUNT - FEE, "total apres rejeu");
};

const main = async () => {
  console.log(`\nRepartitions — charges reelles en mode test sur ${ACCOUNT}\n`);

  await test("chaque part atteint son compte en citant la charge source", scenarioSplitReachesBothAccounts);
  await test("la plateforme conserve exactement sa commission", scenarioPlatformKeepsExactlyItsFee);
  await test("une redelivery ne verse pas les parts deux fois", scenarioReplayDoesNotPayTwice);

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

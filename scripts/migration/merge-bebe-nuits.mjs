/**
 * Merge wix-bebe-nuits.json into wix-formations-full.json
 * puis régénère le seed SQL.
 *
 * Usage :
 *   node scripts/migration/merge-bebe-nuits.mjs
 *
 * Prérequis : avoir exécuté wix-scraper/scrape-bebe-nuits.js au préalable.
 */

import fs from 'fs';

const FULL_JSON_PATH  = 'wix-formations-full.json';
const NUITS_JSON_PATH = 'wix-bebe-nuits.json';

// ── Lecture des fichiers ──────────────────────────────────────────────────
if (!fs.existsSync(NUITS_JSON_PATH)) {
  console.error(`❌ Fichier introuvable : ${NUITS_JSON_PATH}`);
  console.error('   Lance d\'abord : node wix-scraper/scrape-bebe-nuits.js');
  process.exit(1);
}

const formations = JSON.parse(fs.readFileSync(FULL_JSON_PATH, 'utf-8'));
const nuits      = JSON.parse(fs.readFileSync(NUITS_JSON_PATH, 'utf-8'));

// Normalisation : le scraper ciblé retourne un objet unique, pas un tableau
const nuitsEntry = Array.isArray(nuits) ? nuits[0] : nuits;

if (!nuitsEntry?.slug) {
  console.error('❌ Format inattendu dans wix-bebe-nuits.json (slug manquant).');
  process.exit(1);
}

// ── Injection dans wix-formations-full.json ───────────────────────────────
const existingIndex = formations.findIndex(f => f.slug === nuitsEntry.slug);

if (existingIndex !== -1) {
  formations[existingIndex] = nuitsEntry;
  console.log(`🔄 Formation "${nuitsEntry.slug}" mise à jour dans ${FULL_JSON_PATH}.`);
} else {
  formations.push(nuitsEntry);
  console.log(`✅ Formation "${nuitsEntry.slug}" ajoutée dans ${FULL_JSON_PATH}.`);
}

fs.writeFileSync(FULL_JSON_PATH, JSON.stringify(formations, null, 2), 'utf-8');
console.log(`💾 ${FULL_JSON_PATH} sauvegardé (${formations.length} formations).`);

// ── Régénération du seed SQL ──────────────────────────────────────────────
console.log('\n▶  Régénération du seed SQL...');

const { execFileSync } = await import('child_process');
try {
  execFileSync('node', ['scripts/migration/generate-formations-content-seed.mjs'], {
    stdio: 'inherit',
  });
  console.log('✅ Seed SQL régénéré.');
} catch (e) {
  console.error('⚠️  Erreur lors de la régénération du seed :', e.message);
  console.error('   Lance manuellement : node scripts/migration/generate-formations-content-seed.mjs');
}

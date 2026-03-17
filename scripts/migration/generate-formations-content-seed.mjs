import fs from "fs";
import path from "path";

const inputPath = process.argv[2] || "wix-formations-full.json";
const outputPath = process.argv[3] || "supabase/seed_formations_content.sql";

const raw = fs.readFileSync(inputPath, "utf8");
const formations = JSON.parse(raw);

const sqlQuote = (value) => `'${String(value ?? "").replace(/'/g, "''")}'`;
const jsonbLiteral = (value) => `${sqlQuote(JSON.stringify(value))}::jsonb`;

const extractYoutubeId = (src) => {
  if (!src) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
};

const extractVimeoId = (src) => {
  if (!src) return null;
  const m = src.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m?.[1] || null;
};

const inferVideoContent = (video, fallbackTitle) => {
  const src = video?.src || video?.player || "";
  const explicitType = String(video?.type || "").toLowerCase();

  if (explicitType === "youtube") {
    const videoId = extractYoutubeId(src);
    if (!videoId) return null;
    return { provider: "youtube", video_id: videoId, title: fallbackTitle };
  }

  if (explicitType === "vimeo") {
    const videoId = extractVimeoId(src);
    if (!videoId) return null;
    return { provider: "vimeo", video_id: videoId, title: fallbackTitle };
  }

  const yt = extractYoutubeId(src);
  if (yt) return { provider: "youtube", video_id: yt, title: fallbackTitle };

  const vi = extractVimeoId(src);
  if (vi) return { provider: "vimeo", video_id: vi, title: fallbackTitle };

  return null;
};

const fileNameFromUrl = (url) => {
  try {
    const p = new URL(url).pathname;
    const name = path.basename(p);
    return name || "document.pdf";
  } catch {
    return "document.pdf";
  }
};

// ── Pack configuration ─────────────────────────────────────────────────────
// The pack bundles all individual formations. Each formation becomes a section.
const PACK_SLUG = "pack-essentiel-allaitement";

// Maps a pack section title → the slug of the corresponding individual formation
const PACK_SECTION_MAP = [
  { sectionTitle: "Je me prépare à allaiter",             formationSlug: "je-me-prepare-a-allaiter" },
  { sectionTitle: "Mon allaitement des premiers jours",   formationSlug: "mon-allaitement-des-premiers-jours" },
  { sectionTitle: "Mon allaitement au fil des mois",      formationSlug: "mon-allaitement-au-fil-des-mois" },
  { sectionTitle: "La diversification de mon bébé allaité", formationSlug: "la-diversification-de-mon-bebe-allaite" },
  { sectionTitle: "Je reprends une activité professionnelle", formationSlug: "je-reprends-une-activite-professionnelle" },
  { sectionTitle: "Je souhaite sevrer mon bébé",          formationSlug: "je-souhaite-sevrer-mon-bebe" },
  { sectionTitle: "Mon bébé ne fait pas ses nuits",       formationSlug: "mon-bebe-ne-fait-pas-ses-nuits" },
];

// Build a lookup map: slug → formation data
const formationBySlug = Object.fromEntries(
  formations.filter(f => f?.slug).map(f => [f.slug, f])
);

const individualSlugs = formations
  .map((f) => f?.slug)
  .filter(Boolean)
  .map((s) => sqlQuote(s))
  .join(", ");

// Include the pack slug in the cleanup list as well
const allTargetSlugs = [...formations.map(f => f?.slug).filter(Boolean), PACK_SLUG]
  .map(s => sqlQuote(s))
  .join(", ");

// Keep backward-compat alias used below
const slugs = allTargetSlugs;

const lines = [];
lines.push("-- Generated from wix-formations-full.json");
lines.push("-- Source: scripts/migration/generate-formations-content-seed.mjs");
lines.push("-- This seed refreshes sections + blocks for listed formation slugs.");
lines.push("");
lines.push("BEGIN;");
lines.push("");
lines.push("-- Cleanup existing sections/blocks for target formations");
lines.push("DELETE FROM formation_blocks fb");
lines.push("USING formation_sections fs, formations f");
lines.push("WHERE fb.section_id = fs.id");
lines.push("  AND fs.formation_id = f.id");
lines.push(`  AND f.slug IN (${slugs});`);
lines.push("");
lines.push("DELETE FROM formation_sections fs");
lines.push("USING formations f");
lines.push("WHERE fs.formation_id = f.id");
lines.push(`  AND f.slug IN (${slugs});`);
lines.push("");

let sectionCount = 0;
let blockCount = 0;

for (const formation of formations) {
  const slug = formation?.slug;
  if (!slug) continue;

  lines.push(`-- Formation: ${slug}`);

  const sections = Array.isArray(formation?.sections) ? formation.sections : [];

  sections.forEach((section, sIndex) => {
    const sectionTitle = section?.title?.trim() || `Section ${sIndex + 1}`;
    const sectionPosition = sIndex + 1;
    sectionCount += 1;

    lines.push("INSERT INTO formation_sections (formation_id, title, position)");
    lines.push("SELECT f.id, " + sqlQuote(sectionTitle) + ", " + sectionPosition);
    lines.push("FROM formations f");
    lines.push("WHERE f.slug = " + sqlQuote(slug) + ";");

    const steps = Array.isArray(section?.steps) ? section.steps : [];
    let pos = 1;

    for (const step of steps) {
      const stepTitle = (step?.title || "").trim() || "Contenu";
      const html = (step?.html || "").trim();
      const media = step?.media || {};

      // Main text block for the step
      const htmlPayload = html || `<h3>${stepTitle}</h3>`;
      const textContent = { title: stepTitle, html: htmlPayload };
      lines.push("INSERT INTO formation_blocks (section_id, type, content, position)");
      lines.push("SELECT fs.id, 'text', " + jsonbLiteral(textContent) + ", " + pos);
      lines.push("FROM formation_sections fs");
      lines.push("JOIN formations f ON f.id = fs.formation_id");
      lines.push("WHERE f.slug = " + sqlQuote(slug));
      lines.push("  AND fs.position = " + sectionPosition + ";");
      pos += 1;
      blockCount += 1;

      // Video blocks
      const videos = Array.isArray(media?.videos) ? media.videos : [];
      for (const v of videos) {
        const videoContent = inferVideoContent(v, stepTitle);
        if (!videoContent) continue;
        lines.push("INSERT INTO formation_blocks (section_id, type, content, position)");
        lines.push("SELECT fs.id, 'video', " + jsonbLiteral(videoContent) + ", " + pos);
        lines.push("FROM formation_sections fs");
        lines.push("JOIN formations f ON f.id = fs.formation_id");
        lines.push("WHERE f.slug = " + sqlQuote(slug));
        lines.push("  AND fs.position = " + sectionPosition + ";");
        pos += 1;
        blockCount += 1;
      }

      // Image blocks
      const images = Array.isArray(media?.images) ? media.images : [];
      for (const img of images) {
        if (!img?.src) continue;
        const imageContent = {
          url: img.src,
          alt: img.alt || stepTitle,
          caption: stepTitle,
        };
        lines.push("INSERT INTO formation_blocks (section_id, type, content, position)");
        lines.push("SELECT fs.id, 'image', " + jsonbLiteral(imageContent) + ", " + pos);
        lines.push("FROM formation_sections fs");
        lines.push("JOIN formations f ON f.id = fs.formation_id");
        lines.push("WHERE f.slug = " + sqlQuote(slug));
        lines.push("  AND fs.position = " + sectionPosition + ";");
        pos += 1;
        blockCount += 1;
      }

      // Download blocks (only when a real URL is available)
      const pdfs = Array.isArray(media?.pdfs) ? media.pdfs : [];
      for (const pdf of pdfs) {
        const url = pdf?.href || pdf?.url || "";
        if (!url) continue;
        const filename = pdf?.label || pdf?.name || fileNameFromUrl(url);
        const downloadContent = {
          url,
          filename,
          size_bytes: 0,
        };
        lines.push("INSERT INTO formation_blocks (section_id, type, content, position)");
        lines.push("SELECT fs.id, 'download', " + jsonbLiteral(downloadContent) + ", " + pos);
        lines.push("FROM formation_sections fs");
        lines.push("JOIN formations f ON f.id = fs.formation_id");
        lines.push("WHERE f.slug = " + sqlQuote(slug));
        lines.push("  AND fs.position = " + sectionPosition + ";");
        pos += 1;
        blockCount += 1;
      }
    }

    lines.push("");
  });

  lines.push("");
}

// ── Pack : aggregate all formations into a single bundle ──────────────────
lines.push(`-- Pack: ${PACK_SLUG}`);
lines.push("-- Each section of the pack corresponds to one individual formation.");
lines.push("");

let packSectionPosition = 1;

for (const { sectionTitle, formationSlug } of PACK_SECTION_MAP) {
  const sourceFormation = formationBySlug[formationSlug];

  if (!sourceFormation) {
    lines.push(`-- ⚠️  Formation not found in JSON: ${formationSlug} — skipping section "${sectionTitle}"`);
    lines.push("");
    continue;
  }

  const sourceSections = Array.isArray(sourceFormation.sections)
    ? sourceFormation.sections
    : [];

  // Collect all steps across all sections of the source formation
  const allSteps = sourceSections.flatMap(s =>
    Array.isArray(s.steps) ? s.steps : []
  );

  if (allSteps.length === 0) {
    lines.push(`-- ⚠️  No steps found for ${formationSlug} — inserting empty section "${sectionTitle}"`);
  }

  lines.push(`INSERT INTO formation_sections (formation_id, title, position)`);
  lines.push(`SELECT f.id, ${sqlQuote(sectionTitle)}, ${packSectionPosition}`);
  lines.push(`FROM formations f`);
  lines.push(`WHERE f.slug = ${sqlQuote(PACK_SLUG)};`);

  let packBlockPos = 1;

  for (const step of allSteps) {
    const stepTitle = (step?.title || "").trim() || "Contenu";
    const html      = (step?.html  || "").trim();
    const media     = step?.media || {};

    const htmlPayload = html || `<h3>${stepTitle}</h3>`;
    const textContent = { title: stepTitle, html: htmlPayload };

    lines.push(`INSERT INTO formation_blocks (section_id, type, content, position)`);
    lines.push(`SELECT fs.id, 'text', ${jsonbLiteral(textContent)}, ${packBlockPos}`);
    lines.push(`FROM formation_sections fs`);
    lines.push(`JOIN formations f ON f.id = fs.formation_id`);
    lines.push(`WHERE f.slug = ${sqlQuote(PACK_SLUG)}`);
    lines.push(`  AND fs.position = ${packSectionPosition};`);
    packBlockPos += 1;
    blockCount   += 1;

    const videos = Array.isArray(media?.videos) ? media.videos : [];
    for (const v of videos) {
      const videoContent = inferVideoContent(v, stepTitle);
      if (!videoContent) continue;
      lines.push(`INSERT INTO formation_blocks (section_id, type, content, position)`);
      lines.push(`SELECT fs.id, 'video', ${jsonbLiteral(videoContent)}, ${packBlockPos}`);
      lines.push(`FROM formation_sections fs`);
      lines.push(`JOIN formations f ON f.id = fs.formation_id`);
      lines.push(`WHERE f.slug = ${sqlQuote(PACK_SLUG)}`);
      lines.push(`  AND fs.position = ${packSectionPosition};`);
      packBlockPos += 1;
      blockCount   += 1;
    }

    const images = Array.isArray(media?.images) ? media.images : [];
    for (const img of images) {
      if (!img?.src) continue;
      const imageContent = { url: img.src, alt: img.alt || stepTitle, caption: stepTitle };
      lines.push(`INSERT INTO formation_blocks (section_id, type, content, position)`);
      lines.push(`SELECT fs.id, 'image', ${jsonbLiteral(imageContent)}, ${packBlockPos}`);
      lines.push(`FROM formation_sections fs`);
      lines.push(`JOIN formations f ON f.id = fs.formation_id`);
      lines.push(`WHERE f.slug = ${sqlQuote(PACK_SLUG)}`);
      lines.push(`  AND fs.position = ${packSectionPosition};`);
      packBlockPos += 1;
      blockCount   += 1;
    }

    const pdfs = Array.isArray(media?.pdfs) ? media.pdfs : [];
    for (const pdf of pdfs) {
      const url = pdf?.href || pdf?.url || "";
      if (!url) continue;
      const filename = pdf?.label || pdf?.name || fileNameFromUrl(url);
      const downloadContent = { url, filename, size_bytes: 0 };
      lines.push(`INSERT INTO formation_blocks (section_id, type, content, position)`);
      lines.push(`SELECT fs.id, 'download', ${jsonbLiteral(downloadContent)}, ${packBlockPos}`);
      lines.push(`FROM formation_sections fs`);
      lines.push(`JOIN formations f ON f.id = fs.formation_id`);
      lines.push(`WHERE f.slug = ${sqlQuote(PACK_SLUG)}`);
      lines.push(`  AND fs.position = ${packSectionPosition};`);
      packBlockPos += 1;
      blockCount   += 1;
    }
  }

  sectionCount     += 1;
  packSectionPosition += 1;
  lines.push("");
}

lines.push("COMMIT;");
lines.push("");
lines.push(`-- Generated sections: ${sectionCount} (individual formations + ${PACK_SECTION_MAP.length} pack sections)`);
lines.push(`-- Generated blocks: ${blockCount}`);

fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`Seed SQL generated: ${outputPath}`);
console.log(`Sections: ${sectionCount}`);
console.log(`Blocks: ${blockCount}`);

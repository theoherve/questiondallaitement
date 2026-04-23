/**
 * Ricos HTML → typed formation blocks parser.
 *
 * Strategy: find all widget markers at any DOM depth, replace them with
 * ordered placeholders, then split the remaining HTML around the placeholders
 * and interleave emitted blocks in document order.
 *
 * Widgets handled (in-text blocks that DON'T have a dedicated typed block yet):
 *   - form-quiz__main         → one quiz block per question
 *   - file-upload-name-container → logged to missing-downloads, NOT emitted (Option A)
 *
 * Widgets STRIPPED (duplicates of already-typed blocks in DB):
 *   - figure-VIDEO            → typed video block already exists alongside
 *   - figure-IMAGE            → typed image block already exists alongside
 *
 * Remaining prose → cleaned as text blocks (whitelisted tags only).
 *
 * Step title propagation: if the first emitted block isn't a text block whose
 * first child is a heading, prepend a <h3>Step Title</h3> text block so the
 * title remains visible.
 */

import * as cheerio from "cheerio";

const ALLOWED_TAGS = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "mark",
  "ul", "ol", "li",
  "a", "br", "hr",
  "blockquote", "code", "pre",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "img",
]);

const ALLOWED_ATTRS = {
  a: new Set(["href", "title"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  img: new Set(["src", "alt"]),
};

const cleanAttrs = ($, el, tag) => {
  const allowed = ALLOWED_ATTRS[tag] ?? new Set();
  for (const attr of Object.keys({ ...el.attribs })) {
    if (!allowed.has(attr)) $(el).removeAttr(attr);
  }
};

const cleanHtml = (html) => {
  if (!html || !html.trim()) return "";
  const $ = cheerio.load(html, null, false);

  // Repeat pass until DOM is stable (unwrapping may expose new disallowed tags).
  let prev;
  let current = $.xml();
  let loops = 0;
  do {
    prev = current;
    $("*").each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      if (!tag) return;
      if (!ALLOWED_TAGS.has(tag)) {
        const $el = $(el);
        const kids = $el.contents();
        if (kids.length === 0) $el.remove();
        else $el.replaceWith(kids);
        return;
      }
      cleanAttrs($, el, tag);
    });
    current = $.xml();
    loops++;
  } while (prev !== current && loops < 10);

  // Drop empty paragraphs (whitespace-only, no inline content).
  $("p").each((_, el) => {
    const $el = $(el);
    const text = $el.text().replace(/ |\s/g, "");
    const hasInline = $el.find("img, strong, em, a, br, code").length > 0;
    if (!text && !hasInline) $el.remove();
  });

  // Drop consecutive <br>, trailing <br>
  $("br + br").remove();

  let cleaned = $.xml().trim();

  // Trim leading / trailing bare <br> tags
  cleaned = cleaned.replace(/^(\s*<br\s*\/?>)+/i, "").replace(/(<br\s*\/?>\s*)+$/i, "").trim();

  // Discard blocks that are visually empty (only br/hr/whitespace after tags removed).
  const strippedText = cleaned
    .replace(/<br\s*\/?>/g, "")
    .replace(/<hr\s*\/?>/g, "")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/&nbsp;| /g, "")
    .trim();
  if (!strippedText) return "";

  return cleaned;
};

// Merge adjacent text blocks when the first is just a heading and the second starts with prose.
const coalesceTextBlocks = (blocks) => {
  const out = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (
      last &&
      last.type === "text" &&
      b.type === "text" &&
      last.content?.html &&
      b.content?.html
    ) {
      const merged = `${last.content.html}\n${b.content.html}`;
      // Only merge when the first block is <h1-6>-only (tiny) — avoid blowing up big blocks
      const lastIsJustHeading = /^\s*<h[1-6][^>]*>[^<]*<\/h[1-6]>\s*$/i.test(
        last.content.html.trim()
      );
      if (lastIsJustHeading) {
        out[out.length - 1] = { type: "text", content: { html: merged } };
        continue;
      }
    }
    out.push(b);
  }
  return out;
};

// ─── Quiz parsing ──────────────────────────────────────────────────────────

const parseQuizMain = ($, $section) => {
  const title = $section.find('[data-hook="form-quiz__title"]').first().text().trim();
  const questions = [];

  $section.find('[data-field-type="QUIZ_MULTI_CHOICE"]').each((_, fieldEl) => {
    const $field = $(fieldEl);

    // Find the associated question label. Pattern: <label id="form-field-label-<uuid>-..."> ... </label>
    let questionText = "";
    const fieldset = $field.find("fieldset").first();
    const labelledBy = fieldset.attr("aria-labelledby");
    if (labelledBy) {
      const labelEl = $.root().find(`[id="${labelledBy}"]`).first();
      if (labelEl.length) questionText = labelEl.text().trim();
    }
    if (!questionText) {
      // Fallback: any label element right above this field
      questionText = $field.prev("*").find("label").text().trim();
    }
    if (!questionText) {
      // Fallback: search nearest preceding label in the DOM
      const allLabels = $.root().find("label");
      const fieldNode = $field.get(0);
      let candidate = "";
      allLabels.each((_, lEl) => {
        if (lEl === fieldNode) return false;
        const pos = lEl.compareDocumentPosition
          ? lEl.compareDocumentPosition(fieldNode)
          : null;
        // Fallback without compareDocumentPosition
        candidate = $(lEl).text().trim() || candidate;
      });
      questionText = candidate;
    }
    questionText = questionText.replace(/\s+\*$/, "").replace(/\s+/g, " ").trim();

    const options = [];
    const seenTexts = new Set();
    $field.find('[data-hook^="checkbox-"]').each((_, optEl) => {
      const dataHook = $(optEl).attr("data-hook") ?? "";
      const optFromHook = dataHook.replace(/^checkbox-/, "").trim();
      const optFromText = $(optEl).text().replace(/\s+/g, " ").trim();
      const text = (optFromText || optFromHook).trim();
      if (!text || seenTexts.has(text)) return;
      seenTexts.add(text);
      options.push({
        id: `opt-${options.length + 1}`,
        text,
        is_correct: false,
      });
    });

    if (questionText && options.length > 0) {
      questions.push({ question: questionText, options });
    }
  });

  return { title, questions };
};

// ─── Download info ─────────────────────────────────────────────────────────

const parseDownloadInfo = ($node) => {
  const name = $node.find('[data-hook="file-upload-name"]').first().text().trim();
  const ext = $node.find('[data-hook="file-upload-extension"]').first().text().trim();
  const sizeMatch = $node.text().match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i);
  const sizeBytes = sizeMatch
    ? Math.round(
        parseFloat(sizeMatch[1]) *
          { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }[
            sizeMatch[2].toUpperCase()
          ]
      )
    : 0;
  return { filename: name + (ext || ""), size_bytes: sizeBytes };
};

// ─── Public: parse one Wix step (one text block) ──────────────────────────

export const parseRicosBlock = ({ id, sectionId, position, content }) => {
  const html = content?.html ?? "";
  const stepTitle = content?.title ?? "";

  if (!html.trim()) {
    return { sourceBlockId: id, sectionId, position, blocks: [], missingDownloads: [] };
  }

  const $ = cheerio.load(html);
  const missingDownloads = [];
  const widgetRecords = [];

  // Step 1: find and replace all widgets with ordered placeholders.
  // Order matters: a widget nested inside another can cause double-processing.
  // We iterate widget types and take OUTERMOST matches by removing nested ones.

  const processWidget = (kind, selector, handler) => {
    const nodes = $(selector).toArray();
    // Filter out nested ones (if a matched node has another matched ancestor in the same pass, skip).
    const outermost = nodes.filter((n) => {
      for (const other of nodes) {
        if (other === n) continue;
        if ($.contains(other, n)) return false;
      }
      return true;
    });
    outermost.forEach((node) => {
      const $node = $(node);
      const idx = widgetRecords.length;
      const result = handler($node);
      widgetRecords.push({ kind, idx, result });
      $node.replaceWith(`<!--W${idx}-->`);
    });
  };

  // Extract quizzes first (most content-rich)
  processWidget(
    "quiz",
    '[data-hook="form-quiz__main"]',
    ($node) => parseQuizMain($, $node)
  );

  // Log (and strip) the whole file-upload widget (outer wrapper)
  processWidget(
    "download",
    '[data-hook="file-upload-viewer"]',
    ($node) => parseDownloadInfo($node)
  );

  // Strip video/image figures — they're already in dedicated typed blocks
  processWidget("stripVideo", '[data-hook="figure-VIDEO"]', () => null);
  processWidget("stripImage", '[data-hook="figure-IMAGE"]', () => null);

  // Step 2: get the remaining HTML (with placeholders) and split around them.
  // Scope to the content-viewer if present.
  let $root = $('[data-id="content-viewer"]').first();
  if ($root.length === 0) $root = $.root();

  // cheerio serializes html with XML rules — use .html() on root
  const rawWithPlaceholders = $root.html() ?? "";
  const segments = rawWithPlaceholders.split(/<!--W(\d+)-->/);
  // segments = [proseA, idxB, proseB, idxC, proseC, ...]

  const emitted = [];

  const flushProse = (raw) => {
    const cleaned = cleanHtml(raw);
    if (cleaned && cleaned.trim()) {
      emitted.push({ type: "text", content: { html: cleaned } });
    }
  };

  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 0) {
      flushProse(segments[i]);
    } else {
      const widgetIdx = parseInt(segments[i], 10);
      const rec = widgetRecords[widgetIdx];
      if (!rec) continue;

      if (rec.kind === "quiz") {
        const { title, questions } = rec.result;
        for (const [qi, q] of questions.entries()) {
          emitted.push({
            type: "quiz",
            content: {
              question: q.question,
              options: q.options,
              explanation: "",
              title: qi === 0 ? title || stepTitle : undefined,
            },
          });
        }
      } else if (rec.kind === "download") {
        missingDownloads.push(rec.result);
        // not emitted (Option A)
      }
      // stripVideo / stripImage: skip — placeholder just consumed
    }
  }

  // Step title visibility: if first emitted text block doesn't start with a heading,
  // prepend a title block.
  if (stepTitle && emitted.length > 0) {
    const first = emitted[0];
    const firstIsHeading =
      first.type === "text" &&
      /^\s*<h[1-6][^>]*>/i.test(first.content?.html ?? "");
    if (!firstIsHeading) {
      emitted.unshift({
        type: "text",
        content: { html: `<h3>${escapeHtml(stepTitle)}</h3>` },
      });
    }
  }

  return {
    sourceBlockId: id,
    sectionId,
    position,
    blocks: coalesceTextBlocks(emitted),
    missingDownloads,
  };
};

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Pure helpers shared by `EmailBlockEditor` — extracted so they can be
 * unit-tested without mounting the (client-only) Maily editor.
 */

import type { JSONContent } from "@maily-to/render";

// ─── mime → file extension ────────────────────────────────────

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/**
 * Map a MIME string to a short file extension. Falls back to the part after
 * the slash (`image/foo` → `foo`), then to `png` if the MIME is empty.
 */
export const mimeToExt = (mime: string): string =>
  MIME_EXT[mime] ?? (mime.split("/")[1] || "png");

// ─── blob: src stripping ──────────────────────────────────────

type DesignNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: DesignNode[];
};

/**
 * Cheap O(n) scan — no clone. Returns true iff any image node in the tree
 * still has a `src` attribute pointing at a `blob:` URL (upload in flight).
 */
export const hasBlobImageSrc = (json: JSONContent): boolean => {
  if (!json || typeof json !== "object") return false;
  const stack: DesignNode[] = [json as DesignNode];
  while (stack.length) {
    const n = stack.pop()!;
    if (
      n.type === "image" &&
      typeof n.attrs?.src === "string" &&
      n.attrs.src.startsWith("blob:")
    ) {
      return true;
    }
    if (Array.isArray(n.content)) stack.push(...n.content);
  }
  return false;
};

/**
 * Walk the design tree and reset image `src` attrs that still point at a
 * `blob:` URL. Returns a deep-cloned tree — the input is not mutated. Call
 * only after `hasBlobImageSrc` has confirmed a blob is present so the clone
 * cost is amortised.
 */
export const stripBlobImageSrcs = (json: JSONContent): JSONContent => {
  const cloned = JSON.parse(JSON.stringify(json)) as JSONContent;
  const visit = (node: DesignNode) => {
    if (
      node.type === "image" &&
      typeof node.attrs?.src === "string" &&
      node.attrs.src.startsWith("blob:")
    ) {
      node.attrs.src = "";
    }
    if (Array.isArray(node.content)) for (const c of node.content) visit(c);
  };
  visit(cloned as DesignNode);
  return cloned;
};

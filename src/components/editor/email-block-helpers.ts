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
 * Normalise the editor's JSON into plain, structured-cloneable data:
 * deep-clones via a JSON round-trip and resets image `src` attrs still
 * pointing at a `blob:` URL (upload in flight).
 *
 * The clone is not an optimisation detail — it is the only thing that keeps
 * the design serialisable across a server action. Tiptap parks Blob/File
 * handles on nodes mid-upload, and Next wraps anything it cannot serialise in
 * a temporary client reference; the server then throws
 * "Cannot access <attr> on the server" as soon as the email renderer dots
 * into that node's attrs. Always call this before handing a design to a
 * server action.
 */
export const toPlainDesign = (json: JSONContent): JSONContent => {
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

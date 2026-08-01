import { describe, it, expect } from "vitest";
import { toPlainDesign, mimeToExt } from "./email-block-helpers";
import type { JSONContent } from "@maily-to/render";

// ─── toPlainDesign ────────────────────────────────────────────

describe("toPlainDesign", () => {
  it("remplace blob:* par une string vide", () => {
    const input: JSONContent = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "blob:http://local/x", alt: "A" } },
      ],
    };
    const out = toPlainDesign(input);
    const img = (out.content as { attrs: { src: string; alt: string } }[])[0];
    expect(img.attrs.src).toBe("");
    expect(img.attrs.alt).toBe("A"); // autres attrs intactes
  });

  it("laisse les src https intacts", () => {
    const input: JSONContent = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://cdn.example.com/a.jpg" } },
      ],
    };
    const out = toPlainDesign(input);
    const img = (out.content as { attrs: { src: string } }[])[0];
    expect(img.attrs.src).toBe("https://cdn.example.com/a.jpg");
  });

  it("ne mute pas l'input (deep-clone)", () => {
    const input: JSONContent = {
      type: "doc",
      content: [{ type: "image", attrs: { src: "blob:abc" } }],
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    const out = toPlainDesign(input);
    expect(input).toEqual(snapshot);
    expect(out).not.toBe(input);
    expect(out.content).not.toBe(input.content);
  });

  it("laisse tomber les valeurs non serialisables (Blob/File/fonction)", () => {
    const input = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "https://cdn.example.com/a.jpg",
            file: new Blob(["x"]),
            onUpload: () => undefined,
          },
        },
      ],
    } as unknown as JSONContent;
    const out = toPlainDesign(input);
    const attrs = (out.content as { attrs: Record<string, unknown> }[])[0]
      .attrs;
    expect(attrs.src).toBe("https://cdn.example.com/a.jpg");
    expect(attrs.onUpload).toBeUndefined(); // fonction supprimee
    expect(attrs.file).toEqual({}); // Blob aplati en objet nu
  });

  it("préserve la structure nested (colonnes, sections)", () => {
    const input: JSONContent = {
      type: "doc",
      content: [
        {
          type: "section",
          attrs: { backgroundColor: "#fff" },
          content: [
            {
              type: "columns",
              content: [
                {
                  type: "column",
                  content: [
                    { type: "image", attrs: { src: "blob:a" } },
                    { type: "paragraph", content: [{ type: "text", text: "K" }] },
                  ],
                },
                {
                  type: "column",
                  content: [
                    { type: "image", attrs: { src: "https://keep.me/b.jpg" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const out = toPlainDesign(input);
    const section = (out.content as Array<{ content: unknown[] }>)[0];
    const columns = (section.content as Array<{ content: unknown[] }>)[0];
    const cols = columns.content as Array<{ content: Array<{ attrs?: { src?: string } }> }>;
    expect(cols[0].content[0].attrs?.src).toBe(""); // blob → ""
    expect(cols[1].content[0].attrs?.src).toBe("https://keep.me/b.jpg"); // preserved
  });
});

// ─── mimeToExt ────────────────────────────────────────────────

describe("mimeToExt", () => {
  it("mappe les types courants", () => {
    expect(mimeToExt("image/jpeg")).toBe("jpg");
    expect(mimeToExt("image/jpg")).toBe("jpg");
    expect(mimeToExt("image/png")).toBe("png");
    expect(mimeToExt("image/webp")).toBe("webp");
    expect(mimeToExt("image/gif")).toBe("gif");
    expect(mimeToExt("image/svg+xml")).toBe("svg");
  });

  it("fallback sur la partie après le slash pour un mime inconnu", () => {
    expect(mimeToExt("image/avif")).toBe("avif");
    expect(mimeToExt("application/pdf")).toBe("pdf");
  });

  it("retourne `png` quand le mime est vide ou invalide", () => {
    expect(mimeToExt("")).toBe("png");
    expect(mimeToExt("notamime")).toBe("png");
  });
});

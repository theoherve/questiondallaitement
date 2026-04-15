import { describe, it, expect } from "vitest";
import {
  hasBlobImageSrc,
  stripBlobImageSrcs,
  mimeToExt,
} from "./email-block-helpers";
import type { JSONContent } from "@maily-to/render";

// ─── hasBlobImageSrc ──────────────────────────────────────────

describe("hasBlobImageSrc", () => {
  it("false sur design vide", () => {
    expect(hasBlobImageSrc({} as JSONContent)).toBe(false);
  });

  it("false si aucune image", () => {
    expect(
      hasBlobImageSrc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello" }],
          },
        ],
      }),
    ).toBe(false);
  });

  it("false si toutes les images ont un src https", () => {
    expect(
      hasBlobImageSrc({
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "https://cdn.example.com/a.jpg" },
          },
        ],
      }),
    ).toBe(false);
  });

  it("true si au moins une image.src commence par blob:", () => {
    expect(
      hasBlobImageSrc({
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "https://cdn.example.com/a.jpg" },
          },
          { type: "image", attrs: { src: "blob:http://localhost/xyz" } },
        ],
      }),
    ).toBe(true);
  });

  it("traverse les colonnes nested", () => {
    expect(
      hasBlobImageSrc({
        type: "doc",
        content: [
          {
            type: "columns",
            content: [
              {
                type: "column",
                content: [
                  {
                    type: "columns",
                    content: [
                      {
                        type: "column",
                        content: [
                          {
                            type: "image",
                            attrs: { src: "blob:deep-nested" },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });
});

// ─── stripBlobImageSrcs ───────────────────────────────────────

describe("stripBlobImageSrcs", () => {
  it("remplace blob:* par une string vide", () => {
    const input: JSONContent = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "blob:http://local/x", alt: "A" } },
      ],
    };
    const out = stripBlobImageSrcs(input);
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
    const out = stripBlobImageSrcs(input);
    const img = (out.content as { attrs: { src: string } }[])[0];
    expect(img.attrs.src).toBe("https://cdn.example.com/a.jpg");
  });

  it("ne mute pas l'input (deep-clone)", () => {
    const input: JSONContent = {
      type: "doc",
      content: [{ type: "image", attrs: { src: "blob:abc" } }],
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    stripBlobImageSrcs(input);
    expect(input).toEqual(snapshot);
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
    const out = stripBlobImageSrcs(input);
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

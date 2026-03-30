import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseVimeoUrl, getVimeoEmbedUrl, fetchVimeoThumbnail } from "./vimeo";

// ─── parseVimeoUrl ────────────────────────────────────────────

describe("parseVimeoUrl", () => {
  it("parses a URL with video ID and hash", () => {
    const result = parseVimeoUrl("https://vimeo.com/1170385467/e4537c030e");
    expect(result).toEqual({ id: "1170385467", hash: "e4537c030e" });
  });

  it("parses a URL with video ID only (no hash)", () => {
    const result = parseVimeoUrl("https://vimeo.com/1053899351");
    expect(result).toEqual({ id: "1053899351", hash: undefined });
  });

  it("parses a URL with hash and query string (?ts=0&...)", () => {
    const result = parseVimeoUrl(
      "https://vimeo.com/1082820873/12cd73ef20?ts=0&share=copy",
    );
    expect(result).toEqual({ id: "1082820873", hash: "12cd73ef20" });
  });

  it("returns null for a non-Vimeo URL", () => {
    expect(parseVimeoUrl("https://youtube.com/watch?v=abc123")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(parseVimeoUrl("not-a-url")).toBeNull();
  });

  it("returns null when the path starts with a non-numeric segment", () => {
    expect(parseVimeoUrl("https://vimeo.com/channels/abc")).toBeNull();
  });
});

// ─── getVimeoEmbedUrl ─────────────────────────────────────────

describe("getVimeoEmbedUrl", () => {
  it("generates an embed URL with h= param when hash is present", () => {
    const url = getVimeoEmbedUrl("https://vimeo.com/1170385467/e4537c030e");
    expect(url).toBe(
      "https://player.vimeo.com/video/1170385467?dnt=1&h=e4537c030e",
    );
  });

  it("generates an embed URL without h= param when no hash", () => {
    const url = getVimeoEmbedUrl("https://vimeo.com/1053899351");
    expect(url).toBe("https://player.vimeo.com/video/1053899351?dnt=1");
  });

  it("always includes dnt=1", () => {
    const url = getVimeoEmbedUrl("https://vimeo.com/1053899351");
    expect(url).toContain("dnt=1");
  });

  it("returns null for an invalid URL", () => {
    expect(getVimeoEmbedUrl("not-a-url")).toBeNull();
  });

  it("returns null for a non-Vimeo URL", () => {
    expect(getVimeoEmbedUrl("https://youtube.com/watch?v=abc")).toBeNull();
  });
});

// ─── fetchVimeoThumbnail ──────────────────────────────────────

describe("fetchVimeoThumbnail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the thumbnail_url from a valid oEmbed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          thumbnail_url: "https://i.vimeocdn.com/video/123456_640.jpg",
        }),
      }),
    );

    const result = await fetchVimeoThumbnail(
      "https://vimeo.com/1170385467/e4537c030e",
    );
    expect(result).toBe("https://i.vimeocdn.com/video/123456_640.jpg");
  });

  it("returns null when oEmbed response has no thumbnail_url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );

    const result = await fetchVimeoThumbnail("https://vimeo.com/1053899351");
    expect(result).toBeNull();
  });

  it("returns null when fetch returns a non-ok HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false }),
    );

    const result = await fetchVimeoThumbnail("https://vimeo.com/1053899351");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    const result = await fetchVimeoThumbnail("https://vimeo.com/1053899351");
    expect(result).toBeNull();
  });

  it("calls the oEmbed endpoint with the encoded video URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ thumbnail_url: "https://example.com/thumb.jpg" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchVimeoThumbnail("https://vimeo.com/1170385467/e4537c030e");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        encodeURIComponent("https://vimeo.com/1170385467/e4537c030e"),
      ),
      expect.any(Object),
    );
  });
});

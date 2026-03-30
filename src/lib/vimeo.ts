/**
 * Utilities for parsing and embedding Vimeo URLs.
 *
 * Supported URL formats:
 *  - https://vimeo.com/{videoId}
 *  - https://vimeo.com/{videoId}/{hash}
 *  - https://vimeo.com/{videoId}/{hash}?ts=0&...
 */

export type VimeoParsed = {
  id: string;
  hash?: string;
};

/**
 * Extracts the video ID and optional unlisted hash from a Vimeo URL.
 * Returns null if the URL is not a recognised Vimeo video URL.
 */
export function parseVimeoUrl(url: string): VimeoParsed | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("vimeo.com")) return null;

    // Path: /{videoId} or /{videoId}/{hash}
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const id = segments[0];
    if (!/^\d+$/.test(id)) return null;

    const hash = segments[1] && /^[a-f0-9]+$/i.test(segments[1])
      ? segments[1]
      : undefined;

    return { id, hash };
  } catch {
    return null;
  }
}

/**
 * Returns a Vimeo player embed URL for use in an <iframe>.
 * Includes dnt=1 (Do Not Track) for privacy.
 * Returns null if the URL cannot be parsed.
 */
export function getVimeoEmbedUrl(url: string): string | null {
  const parsed = parseVimeoUrl(url);
  if (!parsed) return null;

  const params = new URLSearchParams({ dnt: "1" });
  if (parsed.hash) params.set("h", parsed.hash);

  return `https://player.vimeo.com/video/${parsed.id}?${params.toString()}`;
}

/**
 * Fetches the thumbnail URL for a Vimeo video via the oEmbed API.
 * Works for unlisted videos when the full URL (with hash) is provided.
 * Results are cached by Next.js fetch for 1 hour.
 * Returns null on failure.
 */
export async function fetchVimeoThumbnail(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}&width=640`;
    const res = await fetch(oembedUrl, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    return data.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

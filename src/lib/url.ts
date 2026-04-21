import { siteConfig } from "@/config/site";

/**
 * Returns the site base URL with any trailing slash stripped — safe for
 * building absolute links (`${baseUrl()}/path`).
 *
 * Prefer this over using `siteConfig.url` directly so callers don't need to
 * re-implement the trim-trailing-slash dance.
 */
export const baseUrl = (): string => siteConfig.url.replace(/\/$/, "");

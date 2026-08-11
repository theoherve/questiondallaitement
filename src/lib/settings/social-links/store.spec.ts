import { describe, expect, it } from "vitest";
import { DEFAULT_SOCIAL_LINKS, parseSocialLinks } from "./store";

describe("parseSocialLinks", () => {
  it("retombe sur les valeurs par défaut si la valeur brute est vide", () => {
    expect(parseSocialLinks(null)).toEqual(DEFAULT_SOCIAL_LINKS);
    expect(parseSocialLinks(undefined)).toEqual(DEFAULT_SOCIAL_LINKS);
    expect(parseSocialLinks("not-json")).toEqual(DEFAULT_SOCIAL_LINKS);
  });

  it("fusionne une valeur partielle avec les défauts", () => {
    const result = parseSocialLinks({ instagram_url: "https://instagram.com/x" });
    expect(result).toEqual({
      ...DEFAULT_SOCIAL_LINKS,
      instagram_url: "https://instagram.com/x",
    });
  });

  it("accepte explicitement null pour masquer un lien", () => {
    const result = parseSocialLinks({ tiktok_url: null });
    expect(result.tiktok_url).toBeNull();
  });

  it("ignore une clé de mauvais type et garde le défaut", () => {
    expect(parseSocialLinks({ instagram_url: 42 }).instagram_url).toBe(
      DEFAULT_SOCIAL_LINKS.instagram_url,
    );
  });
});

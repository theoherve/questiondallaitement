import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNOUNCEMENT_BANNER,
  isAnnouncementBannerActive,
  parseAnnouncementBanner,
  type AnnouncementBanner,
} from "./store";

const base: AnnouncementBanner = {
  enabled: true,
  message: "Nouveau site en ligne !",
  link_url: null,
  link_label: "",
  start_date: null,
  end_date: null,
};

describe("isAnnouncementBannerActive", () => {
  it("est inactif si enabled est false, meme sans dates", () => {
    expect(isAnnouncementBannerActive({ ...base, enabled: false })).toBe(false);
  });

  it("est actif si enabled est true et aucune date definie", () => {
    expect(isAnnouncementBannerActive(base)).toBe(true);
  });

  it("est inactif avant la date de debut", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    const banner = { ...base, start_date: "2026-09-01" };
    expect(isAnnouncementBannerActive(banner, now)).toBe(false);
  });

  it("est actif apres la date de debut", () => {
    const now = new Date("2026-09-02T00:00:00.000Z");
    const banner = { ...base, start_date: "2026-09-01" };
    expect(isAnnouncementBannerActive(banner, now)).toBe(true);
  });

  it("est inactif apres la date de fin", () => {
    const now = new Date("2026-09-10T00:00:00.000Z");
    const banner = { ...base, end_date: "2026-09-01" };
    expect(isAnnouncementBannerActive(banner, now)).toBe(false);
  });

  it("est actif avant la date de fin", () => {
    const now = new Date("2026-08-15T00:00:00.000Z");
    const banner = { ...base, end_date: "2026-09-01" };
    expect(isAnnouncementBannerActive(banner, now)).toBe(true);
  });

  it("est actif entre les deux bornes", () => {
    const now = new Date("2026-08-15T00:00:00.000Z");
    const banner = { ...base, start_date: "2026-08-01", end_date: "2026-09-01" };
    expect(isAnnouncementBannerActive(banner, now)).toBe(true);
  });
});

describe("parseAnnouncementBanner", () => {
  it("retombe sur les valeurs par defaut si la valeur brute est vide", () => {
    expect(parseAnnouncementBanner(null)).toEqual(DEFAULT_ANNOUNCEMENT_BANNER);
    expect(parseAnnouncementBanner(undefined)).toEqual(DEFAULT_ANNOUNCEMENT_BANNER);
    expect(parseAnnouncementBanner("not-json")).toEqual(DEFAULT_ANNOUNCEMENT_BANNER);
  });

  it("fusionne une valeur partielle avec les defauts", () => {
    const result = parseAnnouncementBanner({ enabled: true, message: "Promo" });
    expect(result).toEqual({
      ...DEFAULT_ANNOUNCEMENT_BANNER,
      enabled: true,
      message: "Promo",
    });
  });

  it("accepte une chaine JSON serialisee", () => {
    const result = parseAnnouncementBanner(
      JSON.stringify({ enabled: true, message: "Promo" }),
    );
    expect(result.enabled).toBe(true);
    expect(result.message).toBe("Promo");
  });

  it("ignore une cle de type incorrect et garde le defaut", () => {
    const result = parseAnnouncementBanner({ enabled: "oui" });
    expect(result.enabled).toBe(DEFAULT_ANNOUNCEMENT_BANNER.enabled);
  });
});

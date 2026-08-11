import { describe, expect, it } from "vitest";
import { announcementBannerSchema } from "./announcement-banner";

const valid = {
  enabled: true,
  message: "Nouveau site en ligne !",
  link_url: "https://example.com/nouveautes",
  link_label: "En savoir plus",
  start_date: null,
  end_date: null,
};

describe("announcementBannerSchema", () => {
  it("accepte un bandeau complet actif", () => {
    expect(announcementBannerSchema.safeParse(valid).success).toBe(true);
  });

  it("accepte un bandeau desactive sans message", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      enabled: false,
      message: "",
    });
    expect(result.success).toBe(true);
  });

  it("refuse un bandeau actif sans message", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("refuse une URL de lien invalide", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      link_url: "pas-une-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un link_url vide (pas de lien)", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      link_url: "",
    });
    expect(result.success).toBe(true);
  });

  it("refuse une date de fin avant la date de debut", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      start_date: "2026-09-01",
      end_date: "2026-08-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepte une date de fin egale a la date de debut", () => {
    const result = announcementBannerSchema.safeParse({
      ...valid,
      start_date: "2026-09-01",
      end_date: "2026-09-01",
    });
    expect(result.success).toBe(true);
  });
});

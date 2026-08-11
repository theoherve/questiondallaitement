import { describe, expect, it } from "vitest";
import { DEFAULT_SEO_DEFAULTS, parseSeoDefaults } from "./store";

describe("parseSeoDefaults", () => {
  it("retombe sur les valeurs par défaut si la valeur brute est vide", () => {
    expect(parseSeoDefaults(null)).toEqual(DEFAULT_SEO_DEFAULTS);
    expect(parseSeoDefaults(undefined)).toEqual(DEFAULT_SEO_DEFAULTS);
    expect(parseSeoDefaults("not-json")).toEqual(DEFAULT_SEO_DEFAULTS);
  });

  it("prend en compte une valeur valide", () => {
    const result = parseSeoDefaults({ contact_email: "hello@questiondallaitement.fr" });
    expect(result.contact_email).toBe("hello@questiondallaitement.fr");
  });

  it("ignore une valeur de mauvais type et garde le défaut", () => {
    expect(parseSeoDefaults({ contact_email: 42 }).contact_email).toBe(
      DEFAULT_SEO_DEFAULTS.contact_email,
    );
    expect(parseSeoDefaults({ contact_email: "" }).contact_email).toBe(
      DEFAULT_SEO_DEFAULTS.contact_email,
    );
  });
});

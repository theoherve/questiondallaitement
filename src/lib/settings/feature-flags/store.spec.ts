import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURE_FLAGS, parseFeatureFlags } from "./store";

describe("parseFeatureFlags", () => {
  it("retombe sur les valeurs par défaut si la valeur brute est vide", () => {
    expect(parseFeatureFlags(null)).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(parseFeatureFlags(undefined)).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(parseFeatureFlags("not-json")).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it("prend en compte une valeur booléenne valide", () => {
    expect(parseFeatureFlags({ booking_enabled: false }).booking_enabled).toBe(false);
    expect(parseFeatureFlags({ booking_enabled: true }).booking_enabled).toBe(true);
  });

  it("ignore une valeur de mauvais type et garde le défaut", () => {
    expect(parseFeatureFlags({ booking_enabled: "false" }).booking_enabled).toBe(
      DEFAULT_FEATURE_FLAGS.booking_enabled,
    );
  });
});

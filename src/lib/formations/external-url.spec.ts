import { describe, it, expect } from "vitest";
import { buildExternalUrl } from "./external-url";

describe("buildExternalUrl", () => {
  it("ouvre la query string quand l'url n'en a pas", () => {
    expect(buildExternalUrl("https://ecole.fr/formation")).toBe(
      "https://ecole.fr/formation?code=MILKPOWER",
    );
  });

  it("enchaine sur une query string existante", () => {
    expect(buildExternalUrl("https://ecole.fr/formation?ref=qda")).toBe(
      "https://ecole.fr/formation?ref=qda&code=MILKPOWER",
    );
  });
});

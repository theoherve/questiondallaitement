import { describe, it, expect } from "vitest";
import { matchesAudienceFilter } from "./audience";

describe("matchesAudienceFilter", () => {
  it("laisse tout passer sur le filtre 'all'", () => {
    expect(matchesAudienceFilter("maman", "all")).toBe(true);
    expect(matchesAudienceFilter("pro", "all")).toBe(true);
    expect(matchesAudienceFilter("both", "all")).toBe(true);
  });

  it("une session 'both' reste visible quel que soit le filtre", () => {
    expect(matchesAudienceFilter("both", "maman")).toBe(true);
    expect(matchesAudienceFilter("both", "pro")).toBe(true);
  });

  it("filtre une session dont l'audience ne correspond pas au filtre", () => {
    expect(matchesAudienceFilter("maman", "pro")).toBe(false);
    expect(matchesAudienceFilter("pro", "maman")).toBe(false);
  });

  it("garde une session dont l'audience correspond au filtre", () => {
    expect(matchesAudienceFilter("maman", "maman")).toBe(true);
    expect(matchesAudienceFilter("pro", "pro")).toBe(true);
  });
});

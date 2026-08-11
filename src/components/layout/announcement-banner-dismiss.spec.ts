import { describe, expect, it } from "vitest";
import { dismissKey } from "./announcement-banner-dismiss";

describe("dismissKey", () => {
  it("produit la meme cle pour le meme message", () => {
    expect(dismissKey("Nouveau site en ligne !")).toBe(
      dismissKey("Nouveau site en ligne !"),
    );
  });

  it("produit une cle differente pour un message different", () => {
    expect(dismissKey("Promo")).not.toBe(dismissKey("Nouvelle annonce"));
  });

  it("est prefixee pour rester identifiable dans localStorage", () => {
    expect(dismissKey("Promo")).toMatch(/^announcement-banner-dismissed:/);
  });
});

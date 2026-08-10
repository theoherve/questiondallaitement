import { describe, it, expect } from "vitest";
import { resolveAcquisitionSource } from "./acquisition";

describe("resolveAcquisitionSource", () => {
  it("retient une source connue", () => {
    expect(resolveAcquisitionSource("instagram")).toBe("instagram");
    expect(resolveAcquisitionSource("liens")).toBe("liens");
  });

  it("normalise la casse et les espaces", () => {
    expect(resolveAcquisitionSource("  Instagram  ")).toBe("instagram");
  });

  it("renvoie null sans valeur", () => {
    expect(resolveAcquisitionSource(null)).toBeNull();
    expect(resolveAcquisitionSource("")).toBeNull();
    expect(resolveAcquisitionSource(undefined)).toBeNull();
  });

  it("tronque une valeur trop longue plutôt que de la rejeter", () => {
    const long = "a".repeat(200);
    expect(resolveAcquisitionSource(long)?.length).toBe(64);
  });

  it("refuse une valeur qui n'est pas un mot simple", () => {
    // Le champ vient d'une URL : il est saisissable par n'importe qui, et se
    // retrouve affiché dans le backoffice.
    expect(resolveAcquisitionSource("<script>alert(1)</script>")).toBeNull();
    expect(resolveAcquisitionSource("a b")).toBeNull();
  });
});

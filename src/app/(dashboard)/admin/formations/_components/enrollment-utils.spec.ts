import { describe, it, expect } from "vitest";
import { formatClientName } from "./enrollment-utils";

describe("formatClientName", () => {
  it("assemble prénom + nom quand les deux sont présents", () => {
    expect(
      formatClientName({
        email: "a@b.fr",
        first_name: "Alice",
        last_name: "Martin",
      }),
    ).toBe("Alice Martin");
  });

  it("affiche le prénom seul quand le nom est null", () => {
    expect(
      formatClientName({
        email: "a@b.fr",
        first_name: "Alice",
        last_name: null,
      }),
    ).toBe("Alice");
  });

  it("affiche le nom seul quand le prénom est null", () => {
    expect(
      formatClientName({
        email: "a@b.fr",
        first_name: null,
        last_name: "Martin",
      }),
    ).toBe("Martin");
  });

  it("retombe sur l'email quand les deux noms sont null", () => {
    expect(
      formatClientName({
        email: "a@b.fr",
        first_name: null,
        last_name: null,
      }),
    ).toBe("a@b.fr");
  });

  it("retombe sur l'email quand les noms sont vides ou blancs", () => {
    expect(
      formatClientName({
        email: "a@b.fr",
        first_name: "",
        last_name: "   ",
      }),
    ).toBe("a@b.fr");
  });
});

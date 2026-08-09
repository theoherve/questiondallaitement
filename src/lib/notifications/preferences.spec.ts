import { describe, it, expect } from "vitest";
import { resolveChannels } from "./preferences";

describe("resolveChannels", () => {
  it("laisse passer tous les canaux déclarés pour le transactionnel", () => {
    expect(resolveChannels("transactional", ["in_app", "email"])).toEqual([
      "in_app",
      "email",
    ]);
  });

  it("ignore les préférences sur le transactionnel", () => {
    expect(
      resolveChannels("transactional", ["in_app", "email"], { email: false })
    ).toEqual(["in_app", "email"]);
  });

  it("ignore les préférences sur le système", () => {
    expect(
      resolveChannels("system", ["in_app", "email"], { in_app: false })
    ).toEqual(["in_app", "email"]);
  });

  it("applique les préférences sur le marketing", () => {
    expect(
      resolveChannels("marketing", ["in_app", "email"], { email: false })
    ).toEqual(["in_app"]);
  });

  it("laisse passer le marketing sans préférence enregistrée", () => {
    expect(resolveChannels("marketing", ["in_app", "email"])).toEqual([
      "in_app",
      "email",
    ]);
  });

  it("ne renvoie jamais un canal non déclaré par l'événement", () => {
    expect(resolveChannels("marketing", ["in_app"], { email: true })).toEqual([
      "in_app",
    ]);
  });
});

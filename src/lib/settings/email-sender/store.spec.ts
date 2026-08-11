import { describe, expect, it } from "vitest";
import { DEFAULT_EMAIL_SENDER, parseEmailSender } from "./store";

describe("parseEmailSender", () => {
  it("retombe sur les valeurs par défaut si la valeur brute est vide", () => {
    expect(parseEmailSender(null)).toEqual(DEFAULT_EMAIL_SENDER);
    expect(parseEmailSender(undefined)).toEqual(DEFAULT_EMAIL_SENDER);
    expect(parseEmailSender("not-json")).toEqual(DEFAULT_EMAIL_SENDER);
  });

  it("fusionne une valeur partielle avec les défauts", () => {
    const result = parseEmailSender({ from_name: "QDA Support" });
    expect(result).toEqual({
      ...DEFAULT_EMAIL_SENDER,
      from_name: "QDA Support",
    });
  });

  it("accepte une chaîne JSON sérialisée", () => {
    const result = parseEmailSender(
      JSON.stringify({ from_address: "hello@questiondallaitement.fr", from_name: "QDA" }),
    );
    expect(result.from_address).toBe("hello@questiondallaitement.fr");
    expect(result.from_name).toBe("QDA");
  });

  it("ignore une clé vide ou de mauvais type et garde le défaut", () => {
    expect(parseEmailSender({ from_name: "" }).from_name).toBe(DEFAULT_EMAIL_SENDER.from_name);
    expect(parseEmailSender({ from_name: 42 }).from_name).toBe(DEFAULT_EMAIL_SENDER.from_name);
  });
});

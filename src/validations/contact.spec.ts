import { describe, it, expect } from "vitest";
import { contactMessageSchema } from "./contact";

const valid = {
  name: "Marie Dupont",
  email: "marie@exemple.fr",
  subject: "Question sur l'allaitement mixte",
  message: "Bonjour, j'aimerais des conseils.",
};

describe("contactMessageSchema", () => {
  it("accepte un message valide", () => {
    expect(contactMessageSchema.safeParse(valid).success).toBe(true);
  });

  it("accepte un message valide avec honeypot vide", () => {
    const result = contactMessageSchema.safeParse({ ...valid, website: "" });
    expect(result.success).toBe(true);
  });

  it("refuse un nom vide", () => {
    const result = contactMessageSchema.safeParse({ ...valid, name: "  " });
    expect(result.success).toBe(false);
  });

  it("refuse un email invalide", () => {
    const result = contactMessageSchema.safeParse({ ...valid, email: "pas-un-email" });
    expect(result.success).toBe(false);
  });

  it("refuse un sujet vide", () => {
    const result = contactMessageSchema.safeParse({ ...valid, subject: "" });
    expect(result.success).toBe(false);
  });

  it("refuse un message vide", () => {
    const result = contactMessageSchema.safeParse({ ...valid, message: "" });
    expect(result.success).toBe(false);
  });
});

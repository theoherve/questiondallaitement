import { describe, it, expect } from "vitest";
import { consultationNoteFieldsSchema } from "./consultation-notes";

describe("consultationNoteFieldsSchema", () => {
  const base = {
    child_id: null,
    motif: "Douleur à la tétée",
    antecedents_medicaux: false,
    antecedents_medicaux_detail: null,
    antecedents_chirurgicaux: false,
    antecedents_chirurgicaux_detail: null,
    allergies: false,
    allergies_detail: null,
    traitements_en_cours: false,
    traitements_en_cours_detail: null,
    observation: "Mise au sein observée, prise superficielle",
    conclusion: "À revoir dans une semaine",
    notes_internes: null,
  };

  it("accepte une fiche valide sans enfant (consultation parent seule)", () => {
    const result = consultationNoteFieldsSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("accepte une fiche valide rattachée à un enfant", () => {
    const result = consultationNoteFieldsSchema.safeParse({
      ...base,
      child_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepte des champs vides (sauvegarde en brouillon)", () => {
    const result = consultationNoteFieldsSchema.safeParse({
      ...base,
      motif: "",
      observation: "",
      conclusion: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un child_id qui n'est pas un UUID", () => {
    const result = consultationNoteFieldsSchema.safeParse({
      ...base,
      child_id: "pas-un-uuid",
    });
    expect(result.success).toBe(false);
  });
});

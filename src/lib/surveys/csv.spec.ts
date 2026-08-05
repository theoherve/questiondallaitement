import { describe, expect, it } from "vitest";
import { toSurveyCsv } from "./csv";
import type { SurveyDefinition, SurveyResponseRow } from "./types";

const survey: SurveyDefinition = {
  id: "s1",
  slug: "reveils",
  title: "Réveils",
  intro: null,
  status: "published",
  thank_you_message: "",
  questions: [
    {
      id: "q1",
      position: 0,
      kind: "matrix",
      label: "Réveils",
      rows: [{ key: "0-2", label: "0-2 mois" }],
      choices: [{ key: "aucun", label: "pas de réveils" }],
      is_required: true,
      is_segment: false,
      is_charted: true,
    },
  ],
};

const response = (
  overrides: Partial<SurveyResponseRow> = {},
): SurveyResponseRow => ({
  id: "r1",
  survey_id: "s1",
  answers: { q1: { "0-2": "aucun" } },
  segment_key: "6-9",
  email: "parent@example.com",
  marketing_consent: true,
  consent_text: "…",
  consented_at: "2026-08-04T10:00:00Z",
  source_path: "/blog/article",
  ip_hash: null,
  created_at: "2026-08-04T10:00:00Z",
  ...overrides,
});

describe("toSurveyCsv", () => {
  it("produit une colonne par ligne de question", () => {
    const [header] = toSurveyCsv(survey, [response()]).split("\n");
    expect(header).toContain("Réveils — 0-2 mois");
  });

  it("écrit les libellés, pas les clés techniques", () => {
    expect(toSurveyCsv(survey, [response()])).toContain("pas de réveils");
  });

  it("échappe les valeurs contenant un point-virgule ou un guillemet", () => {
    const csv = toSurveyCsv(survey, [response({ source_path: '/blog/a;b"c' })]);
    expect(csv).toContain('"/blog/a;b""c"');
  });

  it("laisse la cellule vide quand la ligne n'a pas été renseignée", () => {
    const csv = toSurveyCsv(survey, [response({ answers: {} })]);
    const cells = csv.split("\n")[1].split(";");

    // La colonne de réponse existe toujours — elle est simplement vide, sinon
    // les colonnes se décaleraient d'une ligne à l'autre dans le tableur.
    expect(cells).toHaveLength(6);
    expect(cells[5]).toBe("");
  });
});

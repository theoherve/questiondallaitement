import { describe, expect, it } from "vitest";
import { gradeQuiz, quizVerdict, scoredQuestions } from "./quiz";
import type { SurveyDefinition, SurveyQuestion } from "./types";

const question = (overrides: Partial<SurveyQuestion>): SurveyQuestion => ({
  id: "q1",
  position: 1,
  kind: "single",
  label: "Une question",
  rows: [{ key: "_", label: "" }],
  choices: [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
  ],
  is_required: true,
  is_segment: false,
  is_charted: false,
  correct_choice_key: "a",
  explanation_html: null,
  ...overrides,
});

const survey = (questions: SurveyQuestion[]): SurveyDefinition => ({
  id: "s1",
  slug: "quiz",
  title: "Quiz",
  kind: "quiz",
  intro: null,
  status: "published",
  thank_you_message: "",
  questions,
});

describe("scoredQuestions", () => {
  it("écarte les questions sans bonne réponse", () => {
    const definition = survey([
      question({ id: "q1" }),
      question({ id: "q2", correct_choice_key: null, is_segment: true }),
    ]);

    expect(scoredQuestions(definition).map((q) => q.id)).toEqual(["q1"]);
  });
});

describe("gradeQuiz", () => {
  it("compte une bonne réponse par question juste", () => {
    const definition = survey([
      question({ id: "q1", correct_choice_key: "a" }),
      question({ id: "q2", correct_choice_key: "b" }),
    ]);

    const result = gradeQuiz(definition, {
      q1: { _: "a" },
      q2: { _: "a" },
    });

    expect(result.score).toBe(1);
    expect(result.total).toBe(2);
    expect(result.questions[1].isCorrect).toBe(false);
  });

  it("traite une question sans réponse comme fausse, sans planter", () => {
    const definition = survey([question({ id: "q1" })]);
    const result = gradeQuiz(definition, {});

    expect(result.questions[0].givenKey).toBeNull();
    expect(result.score).toBe(0);
  });

  it("ignore la question de segmentation dans le total", () => {
    const definition = survey([
      question({ id: "q1", correct_choice_key: "a" }),
      question({
        id: "sujets",
        kind: "multi",
        correct_choice_key: null,
        is_segment: true,
      }),
    ]);

    const result = gradeQuiz(definition, {
      q1: { _: "a" },
      sujets: { pleurs: "oui" },
    });

    expect(result.total).toBe(1);
    expect(result.score).toBe(1);
  });
});

describe("quizVerdict", () => {
  it("reste encourageant quel que soit le score", () => {
    expect(quizVerdict(12, 12)).toContain("incollable");
    expect(quizVerdict(6, 12)).toContain("bonnes bases");
    expect(quizVerdict(0, 12)).toContain("idées reçues");
  });

  it("ne divise pas par zéro sans question notée", () => {
    expect(quizVerdict(0, 0)).toBe("Merci pour vos réponses.");
  });
});

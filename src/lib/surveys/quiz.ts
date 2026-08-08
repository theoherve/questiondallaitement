import { SINGLE_ROW_KEY } from "@/config/surveys";
import type { SurveyAnswers, SurveyDefinition, SurveyQuestion } from "./types";

/**
 * Correction d'un quiz.
 *
 * Un quiz est un sondage dont certaines questions portent une bonne réponse
 * (`correct_choice_key`, migration 00075). Le reste, la question de
 * segmentation notamment, est ignoré du score : elle n'a rien de juste ou de
 * faux, la compter ferait mécaniquement perdre un point.
 */

export type QuizQuestionResult = {
  question: SurveyQuestion;
  /** Clé choisie, `null` si la question est restée sans réponse. */
  givenKey: string | null;
  correctKey: string;
  isCorrect: boolean;
};

export type QuizResult = {
  score: number;
  total: number;
  questions: QuizQuestionResult[];
};

/** Les questions qui entrent dans le score. */
export const scoredQuestions = (survey: SurveyDefinition): SurveyQuestion[] =>
  survey.questions.filter((question) => !!question.correct_choice_key);

export const gradeQuiz = (
  survey: SurveyDefinition,
  answers: SurveyAnswers,
): QuizResult => {
  const questions = scoredQuestions(survey).map((question) => {
    const givenKey = answers[question.id]?.[SINGLE_ROW_KEY] ?? null;
    const correctKey = question.correct_choice_key as string;
    return { question, givenKey, correctKey, isCorrect: givenKey === correctKey };
  });

  return {
    score: questions.filter((entry) => entry.isCorrect).length,
    total: questions.length,
    questions,
  };
};

/**
 * Commentaire affiché au-dessus du score.
 *
 * Trois paliers seulement : au-delà, la nuance ne se lit plus et chaque phrase
 * doit rester encourageante — le quiz sert à donner envie d'en savoir plus, pas
 * à sanctionner.
 */
export const quizVerdict = (score: number, total: number): string => {
  if (total === 0) return "Merci pour vos réponses.";
  const ratio = score / total;
  if (ratio >= 0.8) return "Vous êtes incollable, ou tout comme.";
  if (ratio >= 0.5) return "De bonnes bases, et de quoi aller plus loin.";
  return "Beaucoup d'idées reçues circulent : vous êtes au bon endroit pour les démêler.";
};

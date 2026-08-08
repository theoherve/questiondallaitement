"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SINGLE_ROW_KEY, SURVEY_CONSENT_TEXT } from "@/config/surveys";
import { gradeQuiz, quizVerdict } from "@/lib/surveys/quiz";
import type { SurveyAnswers, SurveyDefinition } from "@/lib/surveys/types";

/**
 * Passation d'un quiz : on répond à tout, puis on corrige.
 *
 * La correction n'arrive qu'à la fin, et non après chaque question : les
 * explications sont longues et renvoient vers des contenus du site, les
 * intercaler ferait sortir du quiz avant la dernière question.
 *
 * Les bonnes réponses transitent avec la définition, donc lisibles par qui
 * inspecte la page. C'est assumé : le quiz est un contenu éditorial, pas un
 * examen, et une correction côté serveur imposerait un aller-retour par
 * question sans rien protéger d'important.
 */
export const QuizRunner = ({ survey }: { survey: SurveyDefinition }) => {
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");

  const graded = useMemo(() => survey.questions.filter((q) => q.correct_choice_key), [survey]);
  const topicQuestion = useMemo(
    () => survey.questions.find((q) => q.kind === "multi"),
    [survey],
  );
  const result = useMemo(() => gradeQuiz(survey, answers), [survey, answers]);

  const answeredCount = graded.filter(
    (question) => answers[question.id]?.[SINGLE_ROW_KEY],
  ).length;
  const allAnswered = answeredCount === graded.length;

  const choose = (questionId: string, choiceKey: string) =>
    setAnswers((current) => ({
      ...current,
      [questionId]: { [SINGLE_ROW_KEY]: choiceKey },
    }));

  const toggleTopic = (questionId: string, rowKey: string) =>
    setAnswers((current) => {
      const currentRows = { ...(current[questionId] ?? {}) };
      // Une case décochée disparaît de la réponse plutôt que d'y rester à
      // « non » : l'agrégat compte les clés présentes.
      if (currentRows[rowKey]) delete currentRows[rowKey];
      else currentRows[rowKey] = "oui";
      return { ...current, [questionId]: currentRows };
    });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!allAnswered) {
      setError("Merci de répondre à toutes les questions avant de voir votre résultat.");
      return;
    }

    setPending(true);
    setError(null);

    // L'enregistrement ne conditionne pas l'affichage du résultat : la
    // correction est déjà calculée ici. Une panne réseau ne doit pas priver la
    // personne de ses réponses.
    await fetch(`/api/surveys/${survey.slug}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers,
        email: email.trim() || undefined,
        first_name: firstName.trim() || undefined,
        consent: consent || undefined,
        source_path: window.location.pathname,
        website,
      }),
    }).catch(() => null);

    setPending(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <QuizResultView
        survey={survey}
        result={result}
        answers={answers}
        topicQuestionId={topicQuestion?.id ?? null}
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      {survey.intro && (
        <p className="text-lg leading-relaxed text-primary-green/80">{survey.intro}</p>
      )}

      {graded.map((question, index) => (
        <fieldset key={question.id} className="space-y-3">
          <legend className="font-serif text-lg font-semibold text-primary-green">
            <span className="mr-2 text-primary-red">{index + 1}.</span>
            {question.label}
          </legend>
          <div className="space-y-2">
            {question.choices.map((choice) => {
              const selected = answers[question.id]?.[SINGLE_ROW_KEY] === choice.key;
              return (
                <label
                  key={choice.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    selected
                      ? "border-primary-red bg-primary-red/5"
                      : "border-primary-green/15 hover:border-primary-red/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={choice.key}
                    checked={selected}
                    onChange={() => choose(question.id, choice.key)}
                    className="mt-1"
                  />
                  <span className="text-primary-green/85">{choice.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {topicQuestion && (
        <fieldset className="space-y-3 bg-background-beige-dark p-5">
          <legend className="font-serif text-lg font-semibold text-primary-green">
            {topicQuestion.label}
          </legend>
          <div className="space-y-2">
            {topicQuestion.rows.map((row) => (
              <label
                key={row.key}
                className="flex cursor-pointer items-center gap-3 text-primary-green/85"
              >
                <Checkbox
                  checked={!!answers[topicQuestion.id]?.[row.key]}
                  onCheckedChange={() => toggleTopic(topicQuestion.id, row.key)}
                />
                <span>{row.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="space-y-3 bg-background-beige-dark/60 p-5">
        <p className="text-sm text-primary-green/80">
          Envie de recevoir d&apos;autres informations sur l&apos;allaitement ?
          Laissez votre prénom et votre email, c&apos;est facultatif.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="quiz-first-name">Prénom</Label>
            <Input
              id="quiz-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div>
            <Label htmlFor="quiz-email">Email</Label>
            <Input
              id="quiz-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
        </div>

        {email.trim() !== "" && (
          <label className="flex items-start gap-2 text-sm text-primary-green/80">
            <Checkbox
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
            />
            <span>{SURVEY_CONSENT_TEXT}</span>
          </label>
        )}
      </div>

      {/* Piège à robots : hors flux et masqué aux lecteurs d'écran. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
      />

      {error && <p className="text-sm text-primary-red">{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Un instant…" : "Voir mon résultat"}
        </Button>
        <span className="text-sm text-primary-green/50">
          {answeredCount} / {graded.length} question
          {graded.length > 1 ? "s" : ""} répondue{answeredCount > 1 ? "s" : ""}
        </span>
      </div>
    </form>
  );
};

/* ------------------------------------------------------------------ */
/*  Résultat                                                           */
/* ------------------------------------------------------------------ */

const QuizResultView = ({
  survey,
  result,
  answers,
  topicQuestionId,
}: {
  survey: SurveyDefinition;
  result: ReturnType<typeof gradeQuiz>;
  answers: SurveyAnswers;
  topicQuestionId: string | null;
}) => {
  const topicQuestion = survey.questions.find((q) => q.id === topicQuestionId);
  // Les sujets cochés deviennent des suggestions : c'est le seul endroit du
  // quiz où la personne a dit ce qui l'intéresse.
  const suggestions =
    topicQuestion?.rows.filter(
      (row) => row.href && answers[topicQuestion.id]?.[row.key],
    ) ?? [];

  return (
    <div className="space-y-10">
      <div className="bg-primary-green p-8 text-center text-white">
        <p className="font-serif text-4xl font-bold">
          {result.score} / {result.total}
        </p>
        <p className="mt-2 text-white/80">{quizVerdict(result.score, result.total)}</p>
      </div>

      <div className="space-y-8">
        {result.questions.map((entry, index) => {
          const correctChoice = entry.question.choices.find(
            (choice) => choice.key === entry.correctKey,
          );
          return (
            <div key={entry.question.id} className="border-t border-primary-green/10 pt-6">
              <div className="flex items-start gap-3">
                {entry.isCorrect ? (
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary-green" />
                ) : (
                  <XCircle className="mt-1 h-5 w-5 shrink-0 text-primary-red" />
                )}
                <div className="min-w-0">
                  <p className="font-serif text-lg font-semibold text-primary-green">
                    <span className="mr-2 text-primary-red">{index + 1}.</span>
                    {entry.question.label}
                  </p>
                  <p className="mt-2 text-sm font-medium text-primary-green">
                    Réponse : {correctChoice?.label}
                  </p>
                  {entry.question.explanation_html && (
                    <div
                      className="mt-2 text-primary-green/80 [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-2 [&_p:last-child]:mb-0"
                      dangerouslySetInnerHTML={{
                        __html: entry.question.explanation_html,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <div className="bg-background-beige-dark p-6">
          <h2 className="font-serif text-lg font-semibold text-primary-green">
            Pour aller plus loin sur ce qui vous intéresse
          </h2>
          <ul className="mt-3 space-y-2">
            {suggestions.map((row) => (
              <li key={row.key}>
                <Link
                  href={row.href as string}
                  className="text-primary-red underline underline-offset-2"
                >
                  {row.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {survey.thank_you_message && (
        <p className="text-primary-green/80">{survey.thank_you_message}</p>
      )}

      <Button asChild variant="outline">
        <Link href="/newsletter">S&apos;abonner à la newsletter</Link>
      </Button>
    </div>
  );
};

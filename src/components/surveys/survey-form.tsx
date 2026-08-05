"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SINGLE_ROW_KEY, SURVEY_CONSENT_TEXT } from "@/config/surveys";
import type { PersonalResult } from "@/lib/surveys/personal-result";
import type { SurveyAnswers, SurveyPublicPayload } from "@/lib/surveys/types";

type Props = {
  payload: SurveyPublicPayload;
  onSubmitted: (result: {
    personalResult: PersonalResult | null;
    answers: SurveyAnswers;
  }) => void;
};

export const SurveyForm = ({ payload, onSubmitted }: Props) => {
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (questionId: string, rowKey: string, choiceKey: string) =>
    setAnswers((current) => ({
      ...current,
      [questionId]: { ...(current[questionId] ?? {}), [rowKey]: choiceKey },
    }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch(
      `/api/surveys/${payload.survey.slug}/responses`,
      {
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
      },
    ).catch(() => null);

    setPending(false);

    if (!response || !response.ok) {
      const message = await response?.json().catch(() => null);
      setError(message?.error ?? "L'envoi a échoué, réessayez dans un instant.");
      return;
    }

    const data = await response.json();
    onSubmitted({ personalResult: data.personalResult ?? null, answers });
  };

  return (
    <form onSubmit={submit} className="not-prose space-y-8">
      {payload.survey.intro && (
        <p className="text-primary-green/80">{payload.survey.intro}</p>
      )}

      {payload.survey.questions.map((question) => (
        <fieldset key={question.id} className="space-y-3">
          <legend className="font-serif text-lg text-primary-green">
            {question.label}
          </legend>

          {question.kind === "single" ? (
            <div className="space-y-2">
              {question.choices.map((choice) => (
                <label
                  key={choice.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-primary-green/15 px-3 py-2"
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={choice.key}
                    checked={answers[question.id]?.[SINGLE_ROW_KEY] === choice.key}
                    onChange={() => choose(question.id, SINGLE_ROW_KEY, choice.key)}
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </div>
          ) : (
            // Une carte par ligne, y compris sur grand écran : une matrice
            // 9 × 4 en tableau devient illisible dans la colonne étroite d'un
            // article, et scroller horizontalement fait abandonner.
            <div className="space-y-3">
              {question.rows.map((row) => (
                <div
                  key={row.key}
                  className="rounded-lg border border-primary-green/15 p-3"
                >
                  <p className="mb-2 font-medium text-primary-green">
                    {row.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {question.choices.map((choice) => {
                      const selected =
                        answers[question.id]?.[row.key] === choice.key;
                      return (
                        <button
                          key={choice.key}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => choose(question.id, row.key, choice.key)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            selected
                              ? "border-primary-red bg-primary-red text-white"
                              : "border-primary-green/20 text-primary-green/80 hover:border-primary-red/40"
                          }`}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </fieldset>
      ))}

      <div className="space-y-3 rounded-lg bg-background-beige-dark/50 p-4">
        <p className="text-sm text-primary-green/80">
          Envie de savoir où se situe votre bébé par rapport aux autres familles
          de son âge&nbsp;? Laissez votre prénom et votre email — c&apos;est
          facultatif.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="survey-first-name">Prénom</Label>
            <Input
              id="survey-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div>
            <Label htmlFor="survey-email">Email</Label>
            <Input
              id="survey-email"
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

      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer mes réponses"}
      </Button>
    </form>
  );
};

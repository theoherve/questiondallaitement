"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

type QuizOption = {
  id: string;
  text: string;
  is_correct: boolean;
};

type QuizBlockProps = {
  content: {
    question: string;
    options: QuizOption[];
    explanation: string;
  };
};

export const QuizBlock = ({ content }: QuizBlockProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const selectedOption = content.options.find((o) => o.id === selectedId);
  const isCorrect = selectedOption?.is_correct ?? false;

  const handleSubmit = () => {
    if (!selectedId) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setSelectedId(null);
    setSubmitted(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-primary-green">{content.question}</h3>

      <div className="space-y-2">
        {content.options.map((option) => {
          let borderClass = "border-muted";
          if (submitted) {
            if (option.is_correct) borderClass = "border-green-500 bg-green-50";
            else if (option.id === selectedId)
              borderClass = "border-destructive bg-red-50";
          } else if (option.id === selectedId) {
            borderClass = "border-primary-red bg-primary-red/5";
          }

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => !submitted && setSelectedId(option.id)}
              disabled={submitted}
              className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm transition-all ${borderClass} ${
                submitted ? "cursor-default" : "hover:border-primary-red/50"
              }`}
              tabIndex={0}
              aria-label={option.text}
            >
              {submitted && option.is_correct && (
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              )}
              {submitted && option.id === selectedId && !option.is_correct && (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={!selectedId}
          size="sm"
          className="bg-primary-red hover:bg-primary-red-dark"
        >
          Valider
        </Button>
      )}

      {submitted && (
        <div className="space-y-3">
          <div
            className={`rounded-lg p-3 text-sm ${
              isCorrect
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
            role="alert"
          >
            <p className="font-medium">
              {isCorrect ? "Bonne réponse !" : "Mauvaise réponse"}
            </p>
            {content.explanation && (
              <p className="mt-1">{content.explanation}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Réessayer
          </Button>
        </div>
      )}
    </div>
  );
};

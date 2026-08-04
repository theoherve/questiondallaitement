"use client";

import { useCallback, useEffect, useState } from "react";
import { SURVEY_REFRESH_INTERVAL_MS } from "@/config/surveys";
import type { PersonalResult } from "@/lib/surveys/personal-result";
import type { SurveyAnswers, SurveyPublicPayload } from "@/lib/surveys/types";
import { SurveyChart } from "./survey-chart";
import { SurveyForm } from "./survey-form";

type Props = { slug: string; mode: "form" | "chart" };

/**
 * Point d'entrée des sondages embarqués dans un article.
 *
 * Tout se charge après l'hydratation, jamais au build : un article est rendu
 * statiquement et resterait sinon figé sur les chiffres du jour de sa
 * publication. Le rafraîchissement périodique entretient l'effet « en direct »
 * pour un lecteur qui laisse l'onglet ouvert.
 */
export const SurveyEmbed = ({ slug, mode }: Props) => {
  const [payload, setPayload] = useState<SurveyPublicPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [submitted, setSubmitted] = useState<{
    personalResult: PersonalResult | null;
    answers: SurveyAnswers;
  } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/surveys/${slug}`, {
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      setFailed(true);
      return;
    }
    setPayload(await response.json());
  }, [slug]);

  useEffect(() => {
    // Chargement après hydratation assumé : c'est précisément ce qui empêche
    // le widget d'être figé au build dans un article statique.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cf. ci-dessus
    void load();
    const timer = setInterval(() => void load(), SURVEY_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Un sondage indisponible ne doit rien casser dans la lecture de l'article :
  // on n'affiche rien plutôt qu'un bloc d'erreur au milieu du texte.
  if (failed) return null;

  if (!payload) {
    return (
      <div className="not-prose my-8 h-64 animate-pulse rounded-xl bg-background-beige-dark/60" />
    );
  }

  if (mode === "chart") return <SurveyChart payload={payload} />;

  if (!submitted) {
    return payload.survey.status === "closed" ? (
      <SurveyChart payload={payload} />
    ) : (
      <SurveyForm
        payload={payload}
        onSubmitted={(result) => {
          setSubmitted(result);
          void load();
        }}
      />
    );
  }

  const segmentQuestion = payload.survey.questions.find((q) => q.is_segment);
  const highlight = segmentQuestion
    ? (Object.values(submitted.answers[segmentQuestion.id] ?? {})[0] ?? null)
    : null;

  return (
    <div className="not-prose my-8 space-y-4">
      <div className="rounded-xl border border-primary-green/15 bg-background-beige-dark/40 p-6">
        <h3 className="font-serif text-xl text-primary-green">Merci&nbsp;!</h3>
        <p className="mt-1 text-primary-green/80">
          J&apos;ai bien reçu vos réponses.
        </p>

        {submitted.personalResult && (
          <p className="mt-3 text-primary-green">
            Vous avez répondu «&nbsp;{submitted.personalResult.choiceLabel}
            &nbsp;» pour la tranche {submitted.personalResult.rowLabel}.
            C&apos;est le cas de {submitted.personalResult.percentage}&nbsp;% des
            familles ayant répondu pour cette tranche.
          </p>
        )}

        {payload.survey.thank_you_message && (
          <p className="mt-3 whitespace-pre-line text-primary-green/80">
            {payload.survey.thank_you_message}
          </p>
        )}
      </div>

      <SurveyChart payload={payload} highlightRowKey={highlight} />
    </div>
  );
};

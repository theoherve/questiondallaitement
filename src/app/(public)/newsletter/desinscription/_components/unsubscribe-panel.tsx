"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { resubscribe, unsubscribe } from "../actions";

type Step = "confirm" | "done" | "resubscribed";

/**
 * Confirmation de la desinscription.
 *
 * Un clic visible, jamais un effet au chargement : les passerelles de securite
 * prechargent les liens des emails, et un GET qui desinscrit fait partir des
 * abonnees qui n'ont rien demande — sans qu'elles le sachent, puisqu'elles ne
 * voient pas la page. Le bouton declenche une action serveur, donc un POST, que
 * ces outils ne rejouent pas.
 *
 * Reste un seul geste pour la personne : le droit s'exerce sans parcours.
 */
export const UnsubscribePanel = ({
  token,
  firstName,
  alreadyUnsubscribed,
}: {
  token: string;
  firstName: string;
  alreadyUnsubscribed: boolean;
}) => {
  const [step, setStep] = useState<Step>(
    alreadyUnsubscribed ? "done" : "confirm",
  );
  const [pending, startTransition] = useTransition();

  if (step === "resubscribed") {
    return (
      <p role="status" className="font-medium text-primary-green">
        Vous êtes de nouveau abonnée. À mardi !
      </p>
    );
  }

  if (step === "done") {
    return (
      <>
        <h1 className="font-serif text-3xl font-bold text-primary-green lg:text-4xl">
          {alreadyUnsubscribed ? "Vous étiez déjà désinscrite" : "C'est fait"}
        </h1>
        <p className="mt-6 text-primary-green/70">
          {firstName}, vous ne recevrez plus la newsletter. Aucune justification
          à donner, et vous pouvez revenir quand vous voulez.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          {/* Discret : la personne vient de demander a partir. */}
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (await resubscribe(token)) setStep("resubscribed");
              })
            }
          >
            {pending ? "Un instant…" : "C'était une erreur, me réabonner"}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-primary-green lg:text-4xl">
        Vous souhaitez ne plus recevoir la newsletter ?
      </h1>
      <p className="mt-6 text-primary-green/70">
        {firstName}, un seul clic et c&apos;est réglé. Aucune justification à
        donner.
      </p>
      <div className="mt-10 flex flex-col items-center gap-4">
        <Button
          size="lg"
          disabled={pending}
          className="bg-primary-red px-8 hover:bg-primary-red-dark"
          onClick={() =>
            startTransition(async () => {
              if (await unsubscribe(token)) setStep("done");
            })
          }
        >
          {pending ? "Désinscription…" : "Confirmer ma désinscription"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Annuler, rester abonnée</Link>
        </Button>
      </div>
    </>
  );
};

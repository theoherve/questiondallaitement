"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resubscribe } from "../actions";

/**
 * Retour en arriere apres une desinscription.
 *
 * Presente discretement : la personne vient de demander a partir, lui remettre
 * un bouton d'inscription bien visible serait une insistance deplacee. Il est
 * la pour le cas ou le lien a ete visite par un antivirus ou une
 * previsualisation, pas pour rattraper un depart.
 */
export const ResubscribeButton = ({ token }: { token: string }) => {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p role="status" className="font-medium text-primary-green">
        Vous êtes de nouveau abonnée. À mardi !
      </p>
    );
  }

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const ok = await resubscribe(token);
          if (ok) setDone(true);
        })
      }
    >
      {pending ? "Un instant…" : "C'était une erreur, me réabonner"}
    </Button>
  );
};

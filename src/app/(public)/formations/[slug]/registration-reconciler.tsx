"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { hasEventRegistration } from "../actions";

/**
 * Comble la course entre le retour du paiement et le webhook Stripe qui
 * enregistre l'inscription. La page serveur ne rend cet ilot que lorsque
 * `?registered=true` est present, que l'evenement est payant et que
 * l'inscription n'apparait pas encore : on sonde jusqu'a ce que le webhook ait
 * cree la ligne, puis `router.refresh()` re-rend la page (le bouton passe a
 * « Vous etes inscrit(e) »). Sans lui, la cliente devait rafraichir a la main.
 */
export const RegistrationReconciler = ({
  eventId,
}: {
  eventId: string;
}) => {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // React monte deux fois en dev (StrictMode) : sans ce garde, deux boucles
    // de sondage tournent en parallele.
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    const deadline = Date.now() + 20_000;

    const poll = async () => {
      if (cancelled) return;

      const ready = await hasEventRegistration(eventId).catch(() => false);
      if (cancelled) return;

      if (ready) {
        // Retire `?registered` pour ne pas relancer le sondage au prochain rendu.
        window.history.replaceState(null, "", window.location.pathname);
        router.refresh();
        return;
      }

      if (Date.now() > deadline) {
        setTimedOut(true);
        return;
      }

      setTimeout(poll, 1_500);
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [eventId, router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-2xl border border-primary-red/20 bg-primary-red/5 px-4 py-3 text-sm text-primary-green"
    >
      {timedOut ? (
        <>
          <span>
            Votre paiement est bien reçu. Votre inscription s&apos;active dans un
            instant —
          </span>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="font-medium text-primary-red underline underline-offset-2"
          >
            rafraîchir
          </button>
        </>
      ) : (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span>Validation de votre paiement, inscription en cours…</span>
        </>
      )}
    </div>
  );
};

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { KlarnaNote } from "@/components/klarna-note";
import {
  PromoCodeField,
  type AppliedPromo,
} from "@/components/promo/promo-code-field";
import { registerForEvent } from "../actions";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { buildExternalUrl } from "@/lib/events/external-url";

type Props = {
  eventId: string;
  isFree: boolean;
  isFullyBooked: boolean;
  isAlreadyRegistered: boolean;
  isPast: boolean;
  isAuthenticated: boolean;
  priceCents: number;
  currency: string;
  /** Lien d'inscription de l'organisme, si la formation est vendue par lui. */
  externalUrl?: string | null;
  isPreview?: boolean;
};

export const RegisterButton = ({
  eventId,
  isFree,
  isFullyBooked,
  isAlreadyRegistered,
  isPast,
  isAuthenticated,
  priceCents,
  currency,
  externalUrl,
  isPreview = false,
}: Props) => {
  const [isPending, startTransition] = useTransition();
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const router = useRouter();

  // Apercu du back-office : le rendu doit etre celui du public, mais aucune
  // inscription ne doit partir depuis un brouillon.
  if (isPreview) {
    return (
      <Button className="w-full" disabled>
        Inscription (désactivée en aperçu)
      </Button>
    );
  }

  if (isPast) {
    return (
      <Button className="w-full" disabled>
        Événement terminé
      </Button>
    );
  }

  // Inscription chez l'organisme : on sort du site, donc aucune notion locale
  // ne s'applique (compte, places restantes, promo). Place avant elles pour
  // qu'un « Complet » calcule sur nos inscriptions ne bloque pas un lien qui
  // ne les regarde pas.
  if (externalUrl) {
    return (
      <Button
        className="w-full bg-primary-red hover:bg-primary-red-dark"
        asChild
      >
        <a
          href={buildExternalUrl(externalUrl)}
          target="_blank"
          rel="noopener noreferrer"
        >
          S&apos;inscrire
          <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      </Button>
    );
  }

  if (isAlreadyRegistered) {
    return (
      <Button className="w-full" variant="outline" disabled>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Vous êtes inscrit(e)
      </Button>
    );
  }

  if (isFullyBooked) {
    return (
      <Button className="w-full" disabled>
        Complet
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        className="w-full bg-primary-red hover:bg-primary-red-dark"
        onClick={() => router.push("/connexion")}
      >
        Se connecter pour s&apos;inscrire
      </Button>
    );
  }

  const handleRegister = () => {
    startTransition(async () => {
      const result = await registerForEvent(eventId, promo?.code);
      if (result.success) {
        if (result.data?.redirect_url) {
          // Paid event → redirect to Stripe
          window.location.href = result.data.redirect_url;
        } else {
          // Free event → registered directly
          toast.success("Inscription confirmée !");
          router.refresh();
        }
      } else {
        toast.error(result.error || "Erreur lors de l'inscription");
      }
    });
  };

  return (
    <div className="space-y-2">
      {/* Rien a remiser sur un evenement gratuit. */}
      {!isFree && (
        <PromoCodeField
          serviceKind="event"
          itemId={eventId}
          amountCents={priceCents}
          currency={currency}
          onApplied={setPromo}
        />
      )}
      <Button
        className="w-full bg-primary-red hover:bg-primary-red-dark"
        onClick={handleRegister}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Inscription en cours...
          </>
        ) : isFree ? (
          "S\u2019inscrire"
        ) : (
          "S\u2019inscrire"
        )}
      </Button>
      {!isFree && <KlarnaNote />}
    </div>
  );
};

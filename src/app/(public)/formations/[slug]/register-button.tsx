"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { KlarnaNote } from "@/components/klarna-note";
import { registerForEvent } from "../actions";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

type Props = {
  eventId: string;
  isFree: boolean;
  isFullyBooked: boolean;
  isAlreadyRegistered: boolean;
  isPast: boolean;
  isAuthenticated: boolean;
};

export const RegisterButton = ({
  eventId,
  isFree,
  isFullyBooked,
  isAlreadyRegistered,
  isPast,
  isAuthenticated,
}: Props) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (isPast) {
    return (
      <Button className="w-full" disabled>
        Événement terminé
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
      const result = await registerForEvent(eventId);
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

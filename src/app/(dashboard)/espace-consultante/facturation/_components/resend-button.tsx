"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { resendInvoice } from "../actions";

/**
 * Renvoi de la facture a la cliente. « Envoyer » si elle ne l'a jamais recue,
 * « Renvoyer » sinon — l'action envoie dans les deux cas.
 */
export const ResendInvoiceButton = ({
  invoiceId,
  alreadySent,
}: {
  invoiceId: string;
  alreadySent: boolean;
}) => {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const handleClick = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await resendInvoice(invoiceId);
      setMessage(
        result.success
          ? { ok: true, text: "Envoyée" }
          : { ok: false, text: result.error ?? "Erreur" },
      );
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-1 h-4 w-4" />
        )}
        {alreadySent ? "Renvoyer" : "Envoyer"}
      </Button>
      {message && (
        <span
          className={
            message.ok
              ? "text-xs text-green-700"
              : "text-xs text-destructive"
          }
          role="status"
        >
          {message.text}
        </span>
      )}
    </div>
  );
};

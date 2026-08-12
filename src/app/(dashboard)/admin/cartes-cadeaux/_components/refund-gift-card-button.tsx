"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { refundExpiredGiftCard } from "../actions";

/**
 * Remboursement exceptionnel apres expiration (§7.6 Exception 2). Le
 * virement est effectue par Carole hors app avec l'IBAN/BIC recu par email
 * — ce dialogue ne fait que tracer la decision et cloturer la carte.
 */
export const RefundGiftCardButton = ({ giftCardId }: { giftCardId: string }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    if (!note.trim()) {
      setError("Indiquez une référence (facture, virement) pour tracer la décision.");
      return;
    }
    startTransition(async () => {
      const result = await refundExpiredGiftCard({ giftCardId, note: note.trim() });
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Rembourser
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remboursement exceptionnel</DialogTitle>
          <DialogDescription>
            Le virement se fait hors application, avec l&apos;IBAN/BIC reçu par
            email. Confirmer ici clôture la carte et trace la décision — aucun
            frais de gestion n&apos;est appliqué.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="refund-note">Référence / note</Label>
          <textarea
            id="refund-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border p-2"
            rows={3}
            placeholder="Ex. Virement effectué le 12/08, réf ABC123"
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-primary-green hover:bg-primary-green/90"
          >
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirmer le remboursement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

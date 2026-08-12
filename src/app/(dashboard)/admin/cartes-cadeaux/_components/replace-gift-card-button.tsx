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
import { replaceExpiredGiftCard } from "../actions";

/**
 * Prolongation apres expiration (§7.6 Exception 2) : emet une carte de
 * remplacement valable 9 mois pour le solde restant, et cloture
 * l'originale.
 */
export const ReplaceGiftCardButton = ({ giftCardId }: { giftCardId: string }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    if (!note.trim()) {
      setError("Indiquez une référence pour tracer la décision.");
      return;
    }
    startTransition(async () => {
      const result = await replaceExpiredGiftCard({ giftCardId, note: note.trim() });
      if (result.success) {
        setNotice(`Nouvelle carte émise : ${result.data?.code}`);
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
          Prolonger
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Émettre une carte de remplacement</DialogTitle>
          <DialogDescription>
            Émet une nouvelle carte valable 9 mois pour le solde restant, aux
            mêmes destinataires, et clôture la carte expirée.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="replace-note">Référence / note</Label>
          <textarea
            id="replace-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border p-2"
            rows={3}
            placeholder="Ex. Demande reçue le 12/08 par email"
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-sm text-primary-green" role="status">
              {notice}
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
            Émettre la carte de remplacement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

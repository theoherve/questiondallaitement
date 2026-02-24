"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, XCircle } from "lucide-react";
import { cancelBookingClient } from "../actions";

type CancelBookingButtonProps = {
  bookingId: string;
  hoursUntil: number;
};

export const CancelBookingButton = ({
  bookingId,
  hoursUntil,
}: CancelBookingButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isFullRefund = hoursUntil >= 48;

  const handleCancel = () => {
    if (!reason.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await cancelBookingClient(bookingId, reason);
      if (result.success) {
        setOpen(false);
        setReason("");
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <XCircle className="mr-1 h-3 w-3" />
          Annuler
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler la réservation</DialogTitle>
          <DialogDescription>
            {isFullRefund
              ? "Vous serez intégralement remboursé·e."
              : "L'annulation moins de 48h avant le rendez-vous entraîne une retenue de 50%."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="client-cancel-reason">Raison de l'annulation</Label>
          <Textarea
            id="client-cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Indiquez la raison..."
            rows={3}
            required
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Retour
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isPending || !reason.trim()}
          >
            {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Confirmer l'annulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

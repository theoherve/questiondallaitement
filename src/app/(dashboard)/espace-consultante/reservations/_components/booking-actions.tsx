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
import {
  CheckCircle,
  XCircle,
  CheckCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  confirmBooking,
  cancelBooking,
  completeBooking,
  markNoShow,
} from "../actions";
import type { BookingStatus } from "@/types/database";

type BookingActionsProps = {
  bookingId: string;
  status: BookingStatus;
  isPast: boolean;
};

export const BookingActions = ({
  bookingId,
  status,
  isPast,
}: BookingActionsProps) => {
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmBooking(bookingId);
      if (!result.success) setError(result.error ?? "Erreur");
    });
  };

  const handleComplete = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeBooking(bookingId);
      if (!result.success) setError(result.error ?? "Erreur");
    });
  };

  const handleNoShow = () => {
    setError(null);
    startTransition(async () => {
      const result = await markNoShow(bookingId);
      if (!result.success) setError(result.error ?? "Erreur");
    });
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelBooking(bookingId, cancelReason, "consultant");
      if (!result.success) {
        setError(result.error ?? "Erreur");
      } else {
        setCancelOpen(false);
        setCancelReason("");
      }
    });
  };

  if (["cancelled", "completed", "no_show"].includes(status)) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "pending" && (
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isPending}
            data-testid="booking-confirm-action"
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle className="mr-1 h-3 w-3" />
            )}
            Confirmer
          </Button>
        )}

        {status === "confirmed" && isPast && (
          <>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="mr-1 h-3 w-3" />
              )}
              Marquer terminé
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNoShow}
              disabled={isPending}
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              Absent
            </Button>
          </>
        )}

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={isPending}>
              <XCircle className="mr-1 h-3 w-3" />
              Annuler
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Annuler la réservation</DialogTitle>
              <DialogDescription>
                Un remboursement sera effectué selon la politique d&apos;annulation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Raison de l&apos;annulation</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Indiquez la raison..."
                rows={3}
                required
              />
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setCancelOpen(false)}
                disabled={isPending}
              >
                Retour
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isPending || !cancelReason.trim()}
              >
                {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Confirmer l&apos;annulation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

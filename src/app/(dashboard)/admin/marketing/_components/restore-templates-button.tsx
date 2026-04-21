"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { restoreDefaultTemplates } from "../actions";

/**
 * Overflow menu on the marketing templates tab. Contains the "restore defaults"
 * action behind a confirmation dialog so it can't be clicked by accident.
 */
export const TemplatesOverflowMenu = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await restoreDefaultTemplates();
      if (result.success && result.data) {
        toast.success(
          `${result.data.updated} templates restaurés avec le design par défaut.`,
        );
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de la restauration.");
      }
    } catch {
      toast.error("Erreur lors de la restauration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Plus d'actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Restaurer designs par défaut
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer les templates transactionnels ?</DialogTitle>
            <DialogDescription>
              Réécrit le sujet, le contenu HTML et le design block-éditeur des 6
              templates transactionnels (booking_confirmation, booking_reminder,
              booking_cancelled, formation_access, welcome, password_reset) avec
              les designs par défaut de la marque. Toute personnalisation sera
              écrasée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRestore} disabled={loading}>
              {loading ? "Restauration..." : "Restaurer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

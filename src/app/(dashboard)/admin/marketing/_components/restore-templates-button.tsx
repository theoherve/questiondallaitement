"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { restoreDefaultTemplates } from "../actions";

export const RestoreTemplatesButton = () => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await restoreDefaultTemplates();
      if (result.success && result.data) {
        toast.success(
          `${result.data.updated} templates restaurés avec le design par défaut.`,
        );
        setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="mr-2 h-4 w-4" />
          Restaurer designs par défaut
        </Button>
      </DialogTrigger>
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
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleRestore} disabled={loading}>
            {loading ? "Restauration..." : "Restaurer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

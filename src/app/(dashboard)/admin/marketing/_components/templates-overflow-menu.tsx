"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Sparkles, Plus } from "lucide-react";
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
import { createMissingTemplates, restoreDefaultTemplates } from "../actions";

/**
 * Overflow menu on the marketing templates tab. Contains the "restore defaults"
 * action behind a confirmation dialog so it can't be clicked by accident.
 */
export const TemplatesOverflowMenu = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /**
   * Sans confirmation, contrairement a la restauration : cette action ne peut
   * rien ecraser. Demander « êtes-vous sûr ? » laisserait croire l'inverse.
   */
  const handleCreateMissing = async () => {
    setLoading(true);
    try {
      const result = await createMissingTemplates();
      if (result.success && result.data) {
        const { created } = result.data;
        toast.success(
          created.length === 0
            ? "Aucun template manquant — rien n'a été modifié."
            : `Créé : ${created.join(", ")}. Les autres templates n'ont pas été touchés.`,
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de la création.");
      }
    } catch {
      toast.error("Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  };

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
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem disabled={loading} onSelect={handleCreateMissing}>
            <Plus className="mr-2 h-4 w-4" />
            Créer les templates manquants
          </DropdownMenuItem>
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
              Réécrit le sujet, le contenu HTML et le design de{" "}
              <strong>tous</strong> les templates transactionnels livrés avec le
              site. Toute retouche faite dans l&apos;éditeur sera perdue, y
              compris sur les templates que vous ne cherchiez pas à restaurer.
              Pour ajouter un template absent sans rien écraser, utilisez
              « Créer les templates manquants ».
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

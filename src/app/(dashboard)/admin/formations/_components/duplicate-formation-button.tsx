"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { duplicateFormation } from "../actions";

type Props = {
  formationId: string;
  formationTitle: string;
};

export const DuplicateFormationButton = ({ formationId, formationTitle }: Props) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`${formationTitle} (copie)`);
  const [isPending, setIsPending] = useState(false);

  const handleDuplicate = async () => {
    setIsPending(true);
    const result = await duplicateFormation(formationId, title);
    setIsPending(false);

    if (result.success && result.data) {
      setOpen(false);
      toast.success("Copie créée en brouillon");
      router.push(`/admin/formations/${result.data.id}/edit`);
    } else {
      toast.error(result.error ?? "Erreur lors de la duplication");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setTitle(`${formationTitle} (copie)`);
          setOpen(true);
        }}
      >
        <Copy className="mr-2 h-4 w-4" />
        Dupliquer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dupliquer « {formationTitle} »</DialogTitle>
            <DialogDescription>
              Contenu, programme, tarifs et classement sont recopiés. La copie
              est créée en brouillon avec les mêmes dates que l&apos;original :
              pensez à les mettre à jour avant de publier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`duplicate-title-${formationId}`}>
              Titre de la copie
            </Label>
            <Input
              id={`duplicate-title-${formationId}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) {
                  e.preventDefault();
                  handleDuplicate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              className="bg-primary-red hover:bg-primary-red-dark"
              onClick={handleDuplicate}
              disabled={isPending || !title.trim()}
            >
              {isPending ? "Duplication…" : "Dupliquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

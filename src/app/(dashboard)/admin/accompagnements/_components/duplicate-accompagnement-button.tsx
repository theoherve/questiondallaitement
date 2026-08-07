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
import { duplicateAccompagnement } from "../actions";

type Props = {
  accompagnementId: string;
  accompagnementTitle: string;
};

export const DuplicateAccompagnementButton = ({
  accompagnementId,
  accompagnementTitle,
}: Props) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`${accompagnementTitle} Premium`);
  const [isPending, setIsPending] = useState(false);

  const handleDuplicate = async () => {
    setIsPending(true);
    const result = await duplicateAccompagnement(accompagnementId, title);
    setIsPending(false);

    if (result.success && result.data) {
      setOpen(false);
      toast.success("Copie créée en brouillon");
      router.push(`/admin/accompagnements/${result.data.id}/edit`);
    } else {
      toast.error(result.error ?? "Erreur lors de la duplication");
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setTitle(`${accompagnementTitle} Premium`);
          setOpen(true);
        }}
        aria-label={`Dupliquer ${accompagnementTitle}`}
      >
        <Copy className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dupliquer « {accompagnementTitle} »</DialogTitle>
            <DialogDescription>
              Sections, blocs, description et vignette sont recopiés. La copie
              est créée en brouillon, à 0 € : fixez son prix avant de la
              publier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`duplicate-title-${accompagnementId}`}>
              Titre de la copie
            </Label>
            <Input
              id={`duplicate-title-${accompagnementId}`}
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

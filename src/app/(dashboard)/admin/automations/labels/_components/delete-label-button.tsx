"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteLabel } from "../../actions";

export const DeleteLabelButton = ({ labelId }: { labelId: string }) => {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      title="Supprimer"
      onClick={() => {
        if (!confirm("Supprimer ce label ?")) return;
        startTransition(async () => {
          const result = await deleteLabel(labelId);
          if (result.success) {
            toast.success("Label supprimé");
          } else {
            toast.error(result.error ?? "Erreur");
          }
        });
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
};

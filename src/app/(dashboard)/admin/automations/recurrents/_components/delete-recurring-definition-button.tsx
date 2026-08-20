"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRecurringDefinition } from "../../actions";

export const DeleteRecurringDefinitionButton = ({ id, title }: { id: string; title: string }) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (!confirm(`Supprimer « ${title} » ? Les occurrences déjà générées restent en place.`)) return;

    startTransition(async () => {
      const result = await deleteRecurringDefinition(id);
      if (result.success) {
        toast.success("Définition supprimée");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Supprimer"
      disabled={isPending}
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4 text-primary-red" />
    </Button>
  );
};

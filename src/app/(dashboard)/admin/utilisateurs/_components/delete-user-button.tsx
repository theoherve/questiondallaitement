"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { deletePlatformUser } from "../actions";

type DeleteUserButtonProps = {
  userId: string;
  userEmail: string;
  isCurrentAdmin: boolean;
};

export const DeleteUserButton = ({
  userId,
  userEmail,
  isCurrentAdmin,
}: DeleteUserButtonProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (isCurrentAdmin) {
      window.alert("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    const confirmed = window.confirm(
      `Confirmer la suppression du compte ${userEmail} ? Cette action est irreversible.`
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deletePlatformUser(userId);
      if (!result.success) {
        window.alert(result.error ?? "Erreur lors de la suppression.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending || isCurrentAdmin}
      aria-label={`Supprimer le compte ${userEmail}`}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      Supprimer
    </Button>
  );
};

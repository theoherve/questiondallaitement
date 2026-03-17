"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { updatePlatformUser, deletePlatformUser } from "../actions";
import { ROLES } from "@/constants/roles";
import type { ProfileRow } from "../page";

const EDITABLE_ROLES: (keyof typeof ROLES)[] = [
  "client",
  "consultant",
  "consultant_limited",
  "marketing_manager",
  "admin",
];

type Props = {
  user: ProfileRow;
  isCurrentAdmin: boolean;
};

export const UserRowActions = ({ user, isCurrentAdmin }: Props) => {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isEditPending, startEditTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const handleEditSubmit = (formData: FormData) => {
    startEditTransition(async () => {
      await updatePlatformUser(formData);
      setEditOpen(false);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (isCurrentAdmin) {
      window.alert("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    const confirmed = window.confirm(
      `Supprimer définitivement le compte « ${user.email} » ?\n\nCette action est irréversible.`
    );
    if (!confirmed) return;

    startDeleteTransition(async () => {
      const result = await deletePlatformUser(user.id);
      if (!result.success) {
        window.alert(result.error ?? "Erreur lors de la suppression.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditOpen(true)}
          aria-label={`Modifier ${user.email}`}
        >
          <Pencil className="h-4 w-4" />
          Modifier
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeletePending || isCurrentAdmin}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Supprimer ${user.email}`}
        >
          {isDeletePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Supprimer
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
          </DialogHeader>

          <form action={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="userId" value={user.id} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">Prénom</Label>
                <Input
                  id="edit-first-name"
                  name="first_name"
                  defaultValue={user.first_name ?? ""}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Nom</Label>
                <Input
                  id="edit-last-name"
                  name="last_name"
                  defaultValue={user.last_name ?? ""}
                  placeholder="Nom"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Rôle</Label>
              <select
                id="edit-role"
                name="role"
                defaultValue={user.role}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {EDITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLES[r].label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {ROLES[user.role]?.description}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isEditPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isEditPending}
                className="bg-primary-red hover:bg-primary-red-dark"
              >
                {isEditPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

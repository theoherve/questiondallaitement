"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ROLES } from "@/constants/roles";
import type { UserRole } from "@/types/database";
import { updateUserProfile } from "../actions";

const EDITABLE_ROLES: (keyof typeof ROLES)[] = [
  "client",
  "consultant",
  "consultant_limited",
  "marketing_manager",
  "admin",
];

type Props = {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    roles: UserRole[];
    created_at: string;
    updated_at: string;
  };
};

export const TabInfos = ({ user }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateUserProfile(formData);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary-green">
          Informations personnelles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          <input type="hidden" name="userId" value={user.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={user.first_name ?? ""}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={user.last_name ?? ""}
                placeholder="Nom"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={user.phone ?? ""}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rôles</Label>
            <div className="space-y-2 rounded-md border border-input p-3">
              {EDITABLE_ROLES.map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    name="roles"
                    value={r}
                    defaultChecked={user.roles.includes(r)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm font-medium">
                    {ROLES[r].label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    — {ROLES[r].description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Dernière mise à jour :{" "}
              {new Date(user.updated_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import { changePassword } from "../actions";

export const ChangePasswordForm = () => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await changePassword(formData);
      if (result.success) {
        setSuccess(true);
        const form = document.getElementById(
          "change-password-form"
        ) as HTMLFormElement;
        form?.reset();
      } else {
        setError(result.error ?? "Erreur inconnue");
      }
    });
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-serif text-lg">
          Changer le mot de passe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id="change-password-form"
          action={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="current_password">Mot de passe actuel</Label>
            <Input
              id="current_password"
              name="current_password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">Nouveau mot de passe</Label>
            <Input
              id="new_password"
              name="new_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              8 caractères minimum
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p
              className="flex items-center gap-1 text-sm text-green-600"
              role="status"
            >
              <CheckCircle className="h-4 w-4" />
              Mot de passe modifié avec succès
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary-red hover:bg-primary-red-dark"
          >
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Modifier le mot de passe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

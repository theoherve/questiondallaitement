"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateEmailSenderAction } from "@/lib/settings/email-sender/actions";
import type { EmailSender } from "@/lib/settings/email-sender/store";

type Props = { sender: EmailSender };

export const EmailSenderForm = ({ sender }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EmailSender>(sender);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof EmailSender>(key: K, value: EmailSender[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const domain = form.from_address.split("@")[1];
  const domainWarning =
    domain && domain !== "questiondallaitement.fr" && domain !== "questiondallaitement.com";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateEmailSenderAction(form);
      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
        return;
      }
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">Expéditeur des emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from_name">Nom affiché</Label>
              <Input
                id="from_name"
                value={form.from_name}
                onChange={(e) => set("from_name", e.target.value)}
                aria-label="Nom affiché de l'expéditeur"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_address">Adresse d&apos;expédition</Label>
              <Input
                id="from_address"
                type="email"
                value={form.from_address}
                onChange={(e) => set("from_address", e.target.value)}
                aria-label="Adresse email d'expédition"
              />
            </div>
          </div>
          {domainWarning && (
            <p className="text-xs text-amber-600">
              Le domaine « {domain} » doit être vérifié dans Resend pour que les emails ne
              partent pas en spam.
            </p>
          )}

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm font-medium text-green-600" role="status">
              Expéditeur enregistré.
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary-red hover:bg-primary-red-dark"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Enregistrer l&apos;expéditeur
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};

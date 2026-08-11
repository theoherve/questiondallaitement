"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateSocialLinksAction } from "@/lib/settings/social-links/actions";
import type { SocialLinks } from "@/lib/settings/social-links/store";

type Props = { links: SocialLinks };

export const SocialLinksForm = ({ links }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<SocialLinks>(links);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof SocialLinks>(key: K, value: SocialLinks[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateSocialLinksAction(form);
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
          <CardTitle className="text-primary-green">Réseaux sociaux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instagram_url">Instagram</Label>
            <Input
              id="instagram_url"
              type="url"
              value={form.instagram_url ?? ""}
              onChange={(e) => set("instagram_url", e.target.value || null)}
              placeholder="https://www.instagram.com/..."
              aria-label="Lien Instagram"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok_url">TikTok</Label>
            <Input
              id="tiktok_url"
              type="url"
              value={form.tiktok_url ?? ""}
              onChange={(e) => set("tiktok_url", e.target.value || null)}
              placeholder="https://www.tiktok.com/@..."
              aria-label="Lien TikTok"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={form.linkedin_url ?? ""}
              onChange={(e) => set("linkedin_url", e.target.value || null)}
              placeholder="https://www.linkedin.com/in/..."
              aria-label="Lien LinkedIn"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Un champ vide masque l&apos;icône correspondante dans le pied de page et la page de
            liens.
          </p>

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm font-medium text-green-600" role="status">
              Réseaux sociaux enregistrés.
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
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};

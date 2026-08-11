"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { updateAnnouncementBannerAction } from "@/lib/announcement-banner/actions";
import type { AnnouncementBanner } from "@/lib/announcement-banner/store";

type Props = { banner: AnnouncementBanner };

export const AnnouncementBannerForm = ({ banner }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<AnnouncementBanner>(banner);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof AnnouncementBanner>(key: K, value: AnnouncementBanner[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateAnnouncementBannerAction(form);
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
          <CardTitle className="text-primary-green">Bandeau d&apos;annonce</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Afficher le bandeau</p>
              <p className="text-sm text-muted-foreground">
                Visible en haut de toutes les pages publiques tant qu&apos;actif.
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
              aria-label="Afficher le bandeau d'annonce"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-message">Message</Label>
            <Textarea
              id="banner-message"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-link-url">Lien (optionnel)</Label>
              <Input
                id="banner-link-url"
                value={form.link_url ?? ""}
                onChange={(e) => set("link_url", e.target.value || null)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-link-label">Libellé du lien</Label>
              <Input
                id="banner-link-label"
                value={form.link_label}
                onChange={(e) => set("link_label", e.target.value)}
                placeholder="En savoir plus"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-start-date">Date de début (optionnelle)</Label>
              <Input
                id="banner-start-date"
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => set("start_date", e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-end-date">Date de fin (optionnelle)</Label>
              <Input
                id="banner-end-date"
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) => set("end_date", e.target.value || null)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-primary-green">Enregistré.</p>}

          <Button type="submit" disabled={isPending}>
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

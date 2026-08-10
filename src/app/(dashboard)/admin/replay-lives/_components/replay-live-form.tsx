"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WysiwygEditor } from "@/components/editor/wysiwyg-editor";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createReplayLive, updateReplayLive, deleteReplayLive } from "../actions";
import type { ReplayLive } from "@/types/database";

type Props = {
  live?: ReplayLive;
  mode: "create" | "edit";
};

export const ReplayLiveForm = ({ live, mode }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    title: live?.title ?? "",
    vimeo_url: live?.vimeo_url ?? "",
    description: live?.description ?? "",
    live_date: live?.live_date ?? "",
  });

  // Decoche par defaut : republier un replay corrige ne doit pas renotifier
  // tout le monde.
  const [notifyHolders, setNotifyHolders] = useState(false);

  const handleChange =
    (field: "title" | "vimeo_url" | "live_date") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const payload = {
        ...formData,
        description: formData.description || null,
      };

      const result =
        mode === "create"
          ? await createReplayLive(payload, { notifyHolders })
          : await updateReplayLive(live!.id, payload);

      if (!result.success) {
        toast.error(result.error ?? "Une erreur est survenue");
        return;
      }

      toast.success(
        mode === "create" ? "Replay ajouté avec succès" : "Replay mis à jour"
      );
      router.push("/admin/replay-lives");
    });
  };

  const handleDelete = () => {
    if (!live) return;
    if (!confirm("Supprimer ce replay ? Cette action est irréversible.")) return;

    startTransition(async () => {
      const result = await deleteReplayLive(live.id);
      if (!result.success) {
        toast.error(result.error ?? "Erreur lors de la suppression");
        return;
      }
      toast.success("Replay supprimé");
      router.push("/admin/replay-lives");
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/replay-lives">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>
          <h1 className="text-xl font-semibold text-foreground">
            {mode === "create" ? "Ajouter un replay" : "Modifier le replay"}
          </h1>
        </div>

        {mode === "edit" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informations du replay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Titre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={handleChange("title")}
                placeholder="Ex : Replay du 4 mars 2026"
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="live_date">
                Date du live <span className="text-destructive">*</span>
              </Label>
              <Input
                id="live_date"
                type="date"
                value={formData.live_date}
                onChange={handleChange("live_date")}
                required
              />
            </div>

            {/* Vimeo URL */}
            <div className="space-y-2">
              <Label htmlFor="vimeo_url">
                URL Vimeo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vimeo_url"
                type="url"
                value={formData.vimeo_url}
                onChange={handleChange("vimeo_url")}
                placeholder="https://vimeo.com/1234567890/abcdef1234"
                required
              />
              <p className="text-xs text-muted-foreground">
                Copiez l&apos;URL complète depuis Vimeo, y compris le hash pour les vidéos non-listées.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <WysiwygEditor
                initialContent={formData.description}
                onChange={(html) =>
                  setFormData((prev) => ({ ...prev, description: html }))
                }
                placeholder="Sujets abordés : listes à puces, mise en forme..."
              />
            </div>

            {mode === "create" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={notifyHolders}
                  onChange={(e) => setNotifyHolders(e.target.checked)}
                  className="h-4 w-4"
                />
                Prévenir les personnes ayant accès aux ateliers
              </label>
            )}

            {/* Submit */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                <Save className="mr-2 h-4 w-4" />
                {isPending
                  ? "Enregistrement..."
                  : mode === "create"
                    ? "Ajouter le replay"
                    : "Enregistrer les modifications"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

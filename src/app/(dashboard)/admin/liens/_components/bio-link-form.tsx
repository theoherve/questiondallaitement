"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BioLink, BioLinkKind } from "@/types/database";
import { createBioLink, updateBioLink, deleteBioLink } from "../actions";

type BioLinkFormProps = {
  link?: BioLink;
  mode: "create" | "edit";
  /** Titre de la mise en avant déjà active, pour prévenir du doublon. */
  currentFeaturedTitle?: string | null;
};

export const BioLinkForm = ({
  link,
  mode,
  currentFeaturedTitle,
}: BioLinkFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    kind: (link?.kind ?? "link") as BioLinkKind,
    title: link?.title ?? "",
    subtitle: link?.subtitle ?? "",
    url: link?.url ?? "",
    thumbnail_url: link?.thumbnail_url ?? "",
    is_featured: link?.is_featured ?? false,
    is_active: link?.is_active ?? true,
  });

  const isHeader = formData.kind === "header";
  const stealsFeatured =
    formData.is_featured &&
    !link?.is_featured &&
    Boolean(currentFeaturedTitle);

  const handleChange =
    (field: "title" | "subtitle" | "url" | "thumbnail_url") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const payload = {
        ...formData,
        subtitle: formData.subtitle || null,
        url: formData.url || null,
        thumbnail_url: formData.thumbnail_url || null,
      };

      const result =
        mode === "create"
          ? await createBioLink(payload)
          : await updateBioLink(link!.id, payload);

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Une erreur est survenue");
        return;
      }

      toast.success(mode === "create" ? "Lien ajouté" : "Lien mis à jour");
      router.push("/admin/liens");
    });
  };

  const handleDelete = () => {
    if (!link) return;
    if (!confirm("Supprimer cette entrée ? Cette action est irréversible.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteBioLink(link.id);
      if (!result.success) {
        toast.error(result.error ?? "Erreur lors de la suppression");
        return;
      }
      toast.success("Entrée supprimée");
      router.push("/admin/liens");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/liens">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux liens
          </Link>
        </Button>
        {mode === "edit" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "create" ? "Nouvelle entrée" : "Modifier l'entrée"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="kind">Type</Label>
              <Select
                value={formData.kind}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    kind: value as BioLinkKind,
                  }))
                }
              >
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Lien</SelectItem>
                  <SelectItem value="header">Rubrique</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Une rubrique est un intertitre qui sépare les liens. Elle n&apos;est
                pas cliquable.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Titre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={handleChange("title")}
                placeholder={
                  isHeader
                    ? "Tu préfères les modules à l'unité ?"
                    : "Je me prépare à allaiter"
                }
                required
              />
              {fieldErrors.title && (
                <p className="text-sm text-destructive">{fieldErrors.title}</p>
              )}
            </div>

            {!isHeader && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">Sous-titre</Label>
                  <Input
                    id="subtitle"
                    value={formData.subtitle}
                    onChange={handleChange("subtitle")}
                    placeholder="Une ligne de précision sous le titre"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">
                    Adresse <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={handleChange("url")}
                    placeholder="https://exemple.fr/ma-page"
                  />
                  {fieldErrors.url ? (
                    <p className="text-sm text-destructive">{fieldErrors.url}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Une adresse complète, ou un chemin commençant par / pour
                      une page du site.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail_url">Vignette</Label>
                  <Input
                    id="thumbnail_url"
                    value={formData.thumbnail_url}
                    onChange={handleChange("thumbnail_url")}
                    placeholder="/liens/ma-vignette.jpg"
                  />
                  <p className="text-sm text-muted-foreground">
                    Une image déposée dans public/liens, ou une adresse complète.
                  </p>
                </div>

                <div className="flex items-start justify-between gap-6 rounded-lg border p-4">
                  <div className="space-y-1">
                    <Label htmlFor="is_featured">Mettre en avant</Label>
                    <p className="text-sm text-muted-foreground">
                      Affiche le lien en grand, vignette en fond, en haut de sa
                      rubrique.
                    </p>
                    {stealsFeatured && (
                      <p className="text-sm text-primary-red">
                        « {currentFeaturedTitle} » est déjà mis en avant. Deux
                        mises en avant se neutralisent.
                      </p>
                    )}
                  </div>
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_featured: checked }))
                    }
                  />
                </div>
              </>
            )}

            <div className="flex items-start justify-between gap-6 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="is_active">Afficher sur la page</Label>
                <p className="text-sm text-muted-foreground">
                  Désactivée, l&apos;entrée reste ici mais disparaît de /liens.
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" asChild>
                <Link href="/admin/liens">Annuler</Link>
              </Button>
              <Button type="submit" disabled={isPending}>
                <Save className="mr-2 h-4 w-4" />
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

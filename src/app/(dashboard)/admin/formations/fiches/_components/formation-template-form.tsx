"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormationContentFields } from "../../_components/formation-content-fields";
import {
  FORMATION_CATEGORIES,
  FORMATION_CATEGORY_CONFIG,
} from "@/config/formation-categories";
import {
  createFormationTemplate,
  updateFormationTemplate,
  deleteFormationTemplate,
} from "../actions";
import type { FormationCategory, FormationTemplate } from "@/types";

type Props = {
  template?: FormationTemplate;
  mode: "create" | "edit";
  /** Sessions rattachees : la fiche est partagee, l'auteur doit voir la portee. */
  attachedCount?: number;
};

export const FormationTemplateForm = ({
  template,
  mode,
  attachedCount = 0,
}: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    title: template?.title ?? "",
    slug: template?.slug ?? "",
    summary_html: template?.summary_html ?? "",
    objectives_html: template?.objectives_html ?? "",
    program_html: template?.program_html ?? "",
    audience_html: template?.audience_html ?? "",
    external_url: template?.external_url ?? "",
    badge: template?.badge ?? "",
    category: template?.category ?? ("formation" as FormationCategory),
  });

  const slugify = (text: string): string =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      external_url: formData.external_url.trim() || null,
      badge: formData.badge.trim() || null,
    };

    startTransition(async () => {
      if (mode === "create") {
        const result = await createFormationTemplate(payload);
        if (result.success && result.data) {
          toast.success("Fiche créée");
          router.push(`/admin/formations/fiches/${result.data.id}/edit`);
        } else {
          toast.error(result.error || "Erreur lors de la création");
        }
        return;
      }

      if (!template) return;
      const result = await updateFormationTemplate(template.id, payload);
      if (result.success) {
        toast.success("Fiche enregistrée");
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour");
      }
    });
  };

  const handleDelete = () => {
    if (!template) return;
    if (!confirm("Supprimer cette fiche ? Cette action est irréversible.")) return;

    startTransition(async () => {
      const result = await deleteFormationTemplate(template.id);
      if (result.success) {
        toast.success("Fiche supprimée");
        router.push("/admin/formations/fiches");
      } else {
        toast.error(result.error || "Erreur lors de la suppression");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" asChild>
            <Link href="/admin/formations/fiches">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            {mode === "create" ? "Nouvelle fiche" : "Modifier la fiche"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary-red hover:bg-primary-red-dark"
          >
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
        </div>
      </div>

      {mode === "edit" && attachedCount > 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ce contenu s&apos;affiche sur <strong>{attachedCount}</strong> session
          {attachedCount > 1 ? "s" : ""}. Toute modification les met à jour
          toutes, sauf celles qui ont saisi leur propre texte.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                const title = e.target.value;
                setFormData((p) => ({
                  ...p,
                  title,
                  slug: mode === "create" ? slugify(title) : p.slug,
                }));
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              Repris comme titre des sessions créées à partir de cette fiche.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData((p) => ({ ...p, slug: e.target.value }))
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              Identifiant interne. La fiche n&apos;a pas de page publique, ce
              sont les sessions qui affichent son contenu.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <select
              id="category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.category}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  category: e.target.value as FormationCategory,
                }))
              }
            >
              {FORMATION_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {FORMATION_CATEGORY_CONFIG[key].filterLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="badge">Badge (optionnel)</Label>
            <Input
              id="badge"
              value={formData.badge}
              onChange={(e) =>
                setFormData((p) => ({ ...p, badge: e.target.value }))
              }
              placeholder="2.5 L-CERPs, Éligible FIFPL…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="external_url">
              Lien vers l&apos;organisme (optionnel)
            </Label>
            <Input
              id="external_url"
              type="url"
              value={formData.external_url}
              onChange={(e) =>
                setFormData((p) => ({ ...p, external_url: e.target.value }))
              }
              placeholder="https://…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contenu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormationContentFields
            values={{
              summary_html: formData.summary_html,
              objectives_html: formData.objectives_html,
              program_html: formData.program_html,
              audience_html: formData.audience_html,
            }}
            onChange={(field, html) =>
              setFormData((p) => ({ ...p, [field]: html }))
            }
          />
        </CardContent>
      </Card>
    </form>
  );
};

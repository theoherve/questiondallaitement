"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { FormationContentFields } from "./formation-content-fields";
import { FormationHighlightsField } from "./formation-highlights-field";
import { FORMATION_HIGHLIGHT_KEYS } from "@/config/formation-highlights";
import {
  createFormation,
  updateFormation,
  deleteFormation,
  toggleFormationPublish,
} from "../actions";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Eye,
  Trash2,
  Globe,
  GlobeLock,
} from "lucide-react";
import Link from "next/link";
import type { Formation } from "@/types";

type ConsultantOption = {
  id: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

type ProviderOption = {
  id: string;
  name: string;
};

type Props = {
  formation?: Formation;
  consultants: ConsultantOption[];
  providers?: ProviderOption[];
  mode: "create" | "edit";
  registrationsCount?: number;
};

export const FormationForm = ({
  formation,
  consultants,
  providers = [],
  mode,
  registrationsCount = 0,
}: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Date et heure sont saisies separement : l'heure est facultative, et un
  // `datetime-local` ne sait pas exprimer « date connue, heure inconnue ».
  const toLocalDatetime = (iso: string | undefined | null): string => {
    if (!iso) return "";
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const toLocalDate = (iso: string | undefined | null): string =>
    toLocalDatetime(iso).slice(0, 10);

  // Vide quand la formation n'a pas d'horaire : les bornes stockees couvrent
  // alors la journee entiere, les reafficher serait inventer une saisie.
  const toLocalTime = (iso: string | undefined | null): string =>
    formation?.show_time === false ? "" : toLocalDatetime(iso).slice(11, 16);

  const [formData, setFormData] = useState({
    title: formation?.title ?? "",
    slug: formation?.slug ?? "",
    description: formation?.description ?? "",
    summary_html: formation?.summary_html ?? "",
    objectives_html: formation?.objectives_html ?? "",
    program_html: formation?.program_html ?? "",
    audience_html: formation?.audience_html ?? "",
    // A la creation, le jeu complet est propose : c'est ce qu'affichaient
    // toutes les fiches jusqu'ici, et retirer est plus rapide qu'ajouter.
    highlights: formation?.highlights ?? FORMATION_HIGHLIGHT_KEYS,
    thumbnail_url: formation?.thumbnail_url ?? "",
    type: formation?.type ?? ("online" as "online" | "in_person" | "hybrid"),
    start_date: toLocalDate(formation?.starts_at),
    start_time: toLocalTime(formation?.starts_at),
    end_date: toLocalDate(formation?.ends_at),
    end_time: toLocalTime(formation?.ends_at),
    location: formation?.location ?? "",
    max_participants: formation?.max_participants ?? ("" as number | ""),
    price_cents: formation?.price_cents ?? 0,
    discounted_price_cents: formation?.discounted_price_cents ?? ("" as number | ""),
    currency: formation?.currency ?? "eur",
    show_price: formation?.show_price ?? true,
    provider_id: formation?.provider_id ?? "",
    external_url: formation?.external_url ?? "",
    consultant_id: formation?.consultant_id ?? "",
    is_published: formation?.is_published ?? false,
  });

  const slugify = (text: string): string =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      slug: mode === "create" ? slugify(title) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Les deux heures vont ensemble : une seule renseignee laisserait une
    // borne inventee, on prefere le dire plutot que de la deviner.
    if (!formData.start_time !== !formData.end_time) {
      toast.error(
        "Renseignez l'heure de début et l'heure de fin, ou aucune des deux",
      );
      return;
    }

    const showTime = !!formData.start_time && !!formData.end_time;
    // Sans heure, la formation occupe les journees indiquees en entier : c'est
    // ce que les bornes encodent, `show_time` dit qu'il ne faut pas l'afficher.
    const startsAt = formData.start_date
      ? new Date(`${formData.start_date}T${showTime ? formData.start_time : "00:00"}`)
      : null;
    const endsAt = formData.end_date
      ? new Date(`${formData.end_date}T${showTime ? formData.end_time : "23:59"}`)
      : null;

    const payload = {
      ...formData,
      description: formData.description || null,
      thumbnail_url: formData.thumbnail_url || null,
      summary_html: formData.summary_html || null,
      objectives_html: formData.objectives_html || null,
      program_html: formData.program_html || null,
      audience_html: formData.audience_html || null,
      location: formData.location || null,
      max_participants:
        formData.max_participants === "" ? null : Number(formData.max_participants),
      price_cents: Number(formData.price_cents),
      discounted_price_cents:
        formData.discounted_price_cents === ""
          ? null
          : Number(formData.discounted_price_cents),
      provider_id: formData.provider_id || null,
      external_url: formData.external_url.trim() || null,
      starts_at: startsAt ? startsAt.toISOString() : "",
      ends_at: endsAt ? endsAt.toISOString() : "",
      show_time: showTime,
    };

    startTransition(async () => {
      if (mode === "create") {
        const result = await createFormation(payload);
        if (result.success && result.data) {
          toast.success("Formation créée");
          router.push(`/admin/formations/${result.data.id}/edit`);
        } else {
          toast.error(result.error || "Erreur lors de la création");
        }
      } else if (formation) {
        const result = await updateFormation(formation.id, payload);
        if (result.success) {
          toast.success("Formation mise à jour");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }
    });
  };

  const handleDelete = async () => {
    if (!formation) return;
    if (
      !confirm(
        "Supprimer cette formation ? Cette action est irréversible.",
      )
    )
      return;

    startTransition(async () => {
      const result = await deleteFormation(formation.id);
      if (result.success) {
        toast.success("Formation supprimée");
        router.push("/admin/formations");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleTogglePublish = async () => {
    if (!formation) return;

    startTransition(async () => {
      const result = await toggleFormationPublish(formation.id, !formation.is_published);
      if (result.success) {
        toast.success(
          formation.is_published ? "Formation dépubliée" : "Formation publiée",
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const priceInEuros = formData.price_cents / 100;
  const discountedPriceInEuros =
    formData.discounted_price_cents === ""
      ? ""
      : formData.discounted_price_cents / 100;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/formations">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            {mode === "create"
              ? "Nouvelle formation"
              : "Modifier la formation"}
          </h1>
        </div>
        <div className="flex gap-2">
          {/* « Aperçu » couvre aussi les brouillons, c'est sa raison d'etre.
              « Voir » reste reserve aux formations publies. */}
          {mode === "edit" && formation && (
            <Button type="button" variant="outline" asChild>
              <Link
                href={`/admin/formations/${formation.id}/preview`}
                target="_blank"
              >
                <Eye className="mr-2 h-4 w-4" />
                Aperçu
              </Link>
            </Button>
          )}
          {mode === "edit" && formation?.is_published && (
            <Button type="button" variant="outline" asChild>
              <Link href={`/formations/${formation.slug}`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Voir
              </Link>
            </Button>
          )}
          {mode === "edit" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleTogglePublish}
              disabled={isPending}
            >
              {formation?.is_published ? (
                <>
                  <GlobeLock className="mr-2 h-4 w-4" />
                  Dépublier
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Publier
                </>
              )}
            </Button>
          )}
          {mode === "edit" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="Titre de la formation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, slug: e.target.value }))
                  }
                  placeholder="ma-formation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Description de la formation..."
                  rows={6}
                />
              </div>

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

          <Card>
            <CardHeader>
              <CardTitle>Repères affichés sur la fiche</CardTitle>
            </CardHeader>
            <CardContent>
              <FormationHighlightsField
                value={formData.highlights}
                onChange={(highlights) =>
                  setFormData((p) => ({ ...p, highlights }))
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Date et lieu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date de début</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, start_date: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Date de fin</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, end_date: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">
                    Heure de début (optionnel)
                  </Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, start_time: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Heure de fin (optionnel)</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, end_time: e.target.value }))
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Laisser les deux heures vides pour les formats sans horaire
                (webinaire, e-learning) : aucun horaire ni durée n&apos;apparaît
                alors sur le site.
              </p>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      type: e.target.value as "online" | "in_person" | "hybrid",
                    }))
                  }
                >
                  <option value="online">En ligne</option>
                  <option value="in_person">Présentiel</option>
                  <option value="hybrid">Hybride</option>
                </select>
              </div>

              {(formData.type === "in_person" || formData.type === "hybrid") && (
                <div className="space-y-2">
                  <Label htmlFor="location">Lieu</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, location: e.target.value }))
                    }
                    placeholder="Adresse ou lieu"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organisme de formation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider_id">Organisme</Label>
                <select
                  id="provider_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.provider_id}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, provider_id: e.target.value }))
                  }
                >
                  <option value="">Aucun (formation propre)</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="external_url">
                  Lien vers la page de l&apos;organisme (optionnel)
                </Label>
                <Input
                  id="external_url"
                  type="url"
                  value={formData.external_url}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, external_url: e.target.value }))
                  }
                  placeholder="https://organisme.fr/formations/..."
                />
                <p className="text-xs text-muted-foreground">
                  Si renseigné, la fiche reste consultable sur le site mais
                  l&apos;inscription part chez l&apos;organisme : le bouton
                  « S&apos;inscrire » ouvre ce lien dans un nouvel onglet (avec
                  le code MILKPOWER), sans demander de connexion. Aucune
                  inscription n&apos;est enregistrée ici.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Image de couverture</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Le bucket `formations` garde son nom d'avant le renommage du
                  vocabulaire : il est incruste dans les URLs deja publiees. */}
              <FileUpload
                bucket="formations"
                folder="couvertures-formations"
                accept="image/*"
                maxSizeMb={5}
                value={formData.thumbnail_url}
                onUpload={(url) =>
                  setFormData((p) => ({ ...p, thumbnail_url: url }))
                }
                onRemove={() =>
                  setFormData((p) => ({ ...p, thumbnail_url: "" }))
                }
                label="Ajouter une image de couverture"
                cropAspect="16:9"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Affichée sur la carte du catalogue et en haut de la fiche. Sans
                image, la carte retombe sur un aplat vert avec la date.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consultante</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.consultant_id}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, consultant_id: e.target.value }))
                }
                required
              >
                <option value="">Sélectionner...</option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.profiles
                      ? `${c.profiles.first_name ?? ""} ${c.profiles.last_name ?? ""}`.trim()
                      : c.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarif et capacité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Prix (€)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceInEuros}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      price_cents: Math.round(
                        parseFloat(e.target.value || "0") * 100,
                      ),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  0 € affiche « Voir avec l&apos;école » sur la page publique de
                  la formation : à utiliser quand l&apos;inscription et le
                  paiement passent par l&apos;école.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discounted_price">
                  Prix remisé (€, optionnel)
                </Label>
                <Input
                  id="discounted_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountedPriceInEuros}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      discounted_price_cents:
                        e.target.value === ""
                          ? ""
                          : Math.round(parseFloat(e.target.value) * 100),
                    }))
                  }
                  placeholder="Aucune remise"
                />
                <p className="text-xs text-muted-foreground">
                  Affiche le prix plein barré à côté du prix remisé.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="show_price"
                  checked={formData.show_price}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, show_price: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="show_price">Afficher le tarif</Label>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                Décoché : aucun tarif n&apos;apparaît sur le site (à utiliser
                tant que le prix n&apos;est pas arrêté).
              </p>

              <div className="space-y-2">
                <Label htmlFor="max_participants">
                  Places max (optionnel)
                </Label>
                <Input
                  id="max_participants"
                  type="number"
                  min="1"
                  value={formData.max_participants}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      max_participants: e.target.value
                        ? parseInt(e.target.value)
                        : "",
                    }))
                  }
                  placeholder="Illimité"
                />
              </div>

              {mode === "edit" && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-medium">Inscriptions</p>
                  <p className="text-muted-foreground">
                    {registrationsCount} inscrit(s)
                    {formation?.max_participants
                      ? ` / ${formation.max_participants} places`
                      : ""}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      is_published: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_published">
                  Publier la formation
                </Label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formData.is_published
                  ? "La formation est visible publiquement"
                  : "La formation est en brouillon (invisible)"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
};

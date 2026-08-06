"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EventContentFields } from "./event-content-fields";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventPublish,
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
import type { Event } from "@/types";

type ConsultantOption = {
  id: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

type ProviderOption = {
  id: string;
  name: string;
};

type Props = {
  event?: Event;
  consultants: ConsultantOption[];
  providers?: ProviderOption[];
  mode: "create" | "edit";
  registrationsCount?: number;
};

export const EventForm = ({
  event,
  consultants,
  providers = [],
  mode,
  registrationsCount = 0,
}: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toLocalDatetime = (iso: string | undefined | null): string => {
    if (!iso) return "";
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    title: event?.title ?? "",
    slug: event?.slug ?? "",
    description: event?.description ?? "",
    summary_html: event?.summary_html ?? "",
    objectives_html: event?.objectives_html ?? "",
    program_html: event?.program_html ?? "",
    audience_html: event?.audience_html ?? "",
    type: event?.type ?? ("online" as "online" | "in_person" | "hybrid"),
    starts_at: toLocalDatetime(event?.starts_at) || "",
    ends_at: toLocalDatetime(event?.ends_at) || "",
    location: event?.location ?? "",
    max_participants: event?.max_participants ?? ("" as number | ""),
    price_cents: event?.price_cents ?? 0,
    discounted_price_cents: event?.discounted_price_cents ?? ("" as number | ""),
    currency: event?.currency ?? "eur",
    show_price: event?.show_price ?? true,
    provider_id: event?.provider_id ?? "",
    external_url: event?.external_url ?? "",
    consultant_id: event?.consultant_id ?? "",
    is_published: event?.is_published ?? false,
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

    const payload = {
      ...formData,
      description: formData.description || null,
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
      starts_at: formData.starts_at
        ? new Date(formData.starts_at).toISOString()
        : "",
      ends_at: formData.ends_at
        ? new Date(formData.ends_at).toISOString()
        : "",
    };

    startTransition(async () => {
      if (mode === "create") {
        const result = await createEvent(payload);
        if (result.success && result.data) {
          toast.success("Événement créé");
          router.push(`/admin/evenements/${result.data.id}/edit`);
        } else {
          toast.error(result.error || "Erreur lors de la création");
        }
      } else if (event) {
        const result = await updateEvent(event.id, payload);
        if (result.success) {
          toast.success("Événement mis à jour");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }
    });
  };

  const handleDelete = async () => {
    if (!event) return;
    if (
      !confirm(
        "Supprimer cet événement ? Cette action est irréversible.",
      )
    )
      return;

    startTransition(async () => {
      const result = await deleteEvent(event.id);
      if (result.success) {
        toast.success("Événement supprimé");
        router.push("/admin/evenements");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleTogglePublish = async () => {
    if (!event) return;

    startTransition(async () => {
      const result = await toggleEventPublish(event.id, !event.is_published);
      if (result.success) {
        toast.success(
          event.is_published ? "Événement dépublié" : "Événement publié",
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
            <Link href="/admin/evenements">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            {mode === "create"
              ? "Nouvel événement"
              : "Modifier l\u2019événement"}
          </h1>
        </div>
        <div className="flex gap-2">
          {/* « Aperçu » couvre aussi les brouillons, c'est sa raison d'etre.
              « Voir » reste reserve aux evenements publies. */}
          {mode === "edit" && event && (
            <Button type="button" variant="outline" asChild>
              <Link
                href={`/admin/evenements/${event.id}/preview`}
                target="_blank"
              >
                <Eye className="mr-2 h-4 w-4" />
                Aperçu
              </Link>
            </Button>
          )}
          {mode === "edit" && event?.is_published && (
            <Button type="button" variant="outline" asChild>
              <Link href={`/evenements/${event.slug}`} target="_blank">
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
              {event?.is_published ? (
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
                  placeholder="Titre de l'événement"
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
                  placeholder="mon-evenement"
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
                  placeholder="Description de l'événement..."
                  rows={6}
                />
              </div>

              <EventContentFields
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
              <CardTitle>Date et lieu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Début</Label>
                  <Input
                    id="starts_at"
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, starts_at: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ends_at">Fin</Label>
                  <Input
                    id="ends_at"
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, ends_at: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

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
                  Si renseigné, la formation n&apos;a plus de page de détail sur
                  le site : le CTA renvoie directement vers l&apos;organisme
                  (avec le code MILKPOWER). Aucune inscription n&apos;est
                  possible ici.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                    {event?.max_participants
                      ? ` / ${event.max_participants} places`
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
                  Publier l&apos;événement
                </Label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formData.is_published
                  ? "L'événement est visible publiquement"
                  : "L'événement est en brouillon (invisible)"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
};

"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import {
  adminCreateConsultationType,
  adminUpdateConsultationType,
  adminDeleteConsultationType,
  type AdminConsultationTypeFormData,
} from "../[id]/actions";
import type { ConsultationLocation } from "@/types/database";

type ConsultationType = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  available_locations: string[];
  buffer_minutes: number;
};

type ConsultationTypeTemplate = {
  title: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  available_locations: string[];
  buffer_minutes: number;
};

type Props = {
  consultantId: string;
  types: ConsultationType[];
  templates: ConsultationTypeTemplate[];
};

const LOCATION_OPTIONS: { value: ConsultationLocation; label: string }[] = [
  { value: "cabinet", label: "Cabinet" },
  { value: "teleconsultation", label: "Téléconsultation" },
  { value: "domicile", label: "Domicile" },
];

const LOCATION_LABELS: Record<string, string> = {
  cabinet: "Cabinet",
  teleconsultation: "Téléconsultation",
  domicile: "Domicile",
};

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    cents / 100
  );

export const AdminConsultationTypes = ({ consultantId, types, templates }: Props) => {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ConsultationType | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<ConsultationLocation[]>(["teleconsultation"]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [prefill, setPrefill] = useState<ConsultationTypeTemplate | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleOpenCreate = () => {
    setEditingType(null);
    setPrefill(null);
    setSelectedLocations(["teleconsultation"]);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  };

  const handleOpenEdit = (ct: ConsultationType) => {
    setEditingType(ct);
    setPrefill(null);
    setSelectedLocations((ct.available_locations ?? []) as ConsultationLocation[]);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  };

  const handleSelectTemplate = (title: string) => {
    const template = templates.find((t) => t.title === title);
    if (!template) return;
    setPrefill(template);
    setSelectedLocations((template.available_locations ?? []) as ConsultationLocation[]);
    setFormKey((k) => k + 1);
  };

  const handleLocationToggle = (loc: ConsultationLocation) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);

    const data: AdminConsultationTypeFormData = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) ?? "",
      duration_minutes: Number(formData.get("duration_minutes")),
      price_cents: Math.round(Number(formData.get("price_euros")) * 100),
      available_locations: selectedLocations,
      buffer_minutes: Number(formData.get("buffer_minutes")),
    };

    startTransition(async () => {
      const result = editingType
        ? await adminUpdateConsultationType(consultantId, editingType.id, data)
        : await adminCreateConsultationType(consultantId, data);

      if (result.success) {
        setDialogOpen(false);
        setMessage({ type: "success", text: editingType ? "Mis à jour" : "Créé" });
      } else {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  const handleDelete = (id: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await adminDeleteConsultationType(consultantId, id);
      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  const currentTitle = prefill?.title ?? editingType?.title ?? "";
  const currentDescription = prefill?.description ?? editingType?.description ?? "";
  const currentDuration = prefill?.duration_minutes ?? editingType?.duration_minutes ?? 60;
  const currentPrice = prefill
    ? (prefill.price_cents / 100).toFixed(2)
    : editingType
    ? (editingType.price_cents / 100).toFixed(2)
    : "";
  const currentBuffer = prefill?.buffer_minutes ?? editingType?.buffer_minutes ?? 15;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold text-primary-green">
            Types de consultation
          </h2>
          <p className="text-sm text-muted-foreground">
            Services proposés dans le flow de réservation.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              <Plus className="mr-1 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Modifier" : "Nouveau"} type de consultation
              </DialogTitle>
            </DialogHeader>

            {!editingType && templates.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Partir d&apos;un type existant</Label>
                <Select onValueChange={handleSelectTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un modèle…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.title} value={t.title}>
                        {t.title}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatPrice(t.price_cents)} · {t.duration_minutes} min
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ct-title">Titre</Label>
                <Input
                  id="ct-title"
                  name="title"
                  required
                  defaultValue={currentTitle}
                  placeholder="Ex : Consultation allaitement"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ct-desc">Description</Label>
                <Textarea
                  id="ct-desc"
                  name="description"
                  rows={2}
                  defaultValue={currentDescription}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ct-duration">Durée (minutes)</Label>
                  <Input
                    id="ct-duration"
                    name="duration_minutes"
                    type="number"
                    min={15}
                    max={480}
                    required
                    defaultValue={currentDuration}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ct-price">Prix (€)</Label>
                  <Input
                    id="ct-price"
                    name="price_euros"
                    type="number"
                    min={0}
                    step={0.01}
                    required
                    defaultValue={currentPrice}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ct-buffer">Buffer (minutes entre RDV)</Label>
                <Input
                  id="ct-buffer"
                  name="buffer_minutes"
                  type="number"
                  min={0}
                  max={120}
                  defaultValue={currentBuffer}
                />
              </div>
              <div className="space-y-2">
                <Label>Lieux disponibles</Label>
                <div className="flex flex-wrap gap-3">
                  {LOCATION_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`loc-${opt.value}`}
                        checked={selectedLocations.includes(opt.value)}
                        onCheckedChange={() => handleLocationToggle(opt.value)}
                      />
                      <Label htmlFor={`loc-${opt.value}`} className="text-sm font-normal">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              {message && (
                <p
                  className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
                  role="alert"
                >
                  {message.text}
                </p>
              )}
              <Button
                type="submit"
                disabled={isPending || selectedLocations.length === 0}
                className="w-full bg-primary-red hover:bg-primary-red-dark"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingType ? "Mettre à jour" : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {message && !dialogOpen && (
        <p
          className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      {types.length > 0 ? (
        <div className="space-y-3">
          {types.map((ct) => (
            <Card key={ct.id}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-primary-green">{ct.title}</h3>
                    <span className="text-sm font-medium text-primary-green/70">
                      {formatPrice(ct.price_cents)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {ct.duration_minutes} min
                    </Badge>
                    {((ct.available_locations as string[]) ?? []).map((loc) => (
                      <Badge key={loc} variant="secondary" className="text-xs">
                        {LOCATION_LABELS[loc] ?? loc}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(ct)}
                    aria-label={`Modifier ${ct.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ct.id)}
                    disabled={isPending}
                    aria-label={`Supprimer ${ct.title}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun type de consultation configuré.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

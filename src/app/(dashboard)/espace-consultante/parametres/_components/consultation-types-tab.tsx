"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import {
  createConsultationType,
  updateConsultationType,
  deleteConsultationType,
  type ConsultationTypeFormData,
} from "../actions";
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

type ConsultationTypesTabProps = {
  types: ConsultationType[];
};

const LOCATION_OPTIONS: { value: ConsultationLocation; label: string }[] = [
  { value: "cabinet", label: "Cabinet" },
  { value: "teleconsultation", label: "Téléconsultation" },
  { value: "domicile", label: "Domicile" },
];

const formatPrice = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const LOCATION_LABELS: Record<string, string> = {
  cabinet: "Cabinet",
  teleconsultation: "Téléconsultation",
  domicile: "Domicile",
};

export const ConsultationTypesTab = ({ types }: ConsultationTypesTabProps) => {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ConsultationType | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<
    ConsultationLocation[]
  >(["teleconsultation"]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleOpenCreate = () => {
    setEditingType(null);
    setSelectedLocations(["teleconsultation"]);
    setDialogOpen(true);
  };

  const handleOpenEdit = (ct: ConsultationType) => {
    setEditingType(ct);
    setSelectedLocations(
      (ct.available_locations ?? []) as ConsultationLocation[]
    );
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);

    const data: ConsultationTypeFormData = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) ?? "",
      duration_minutes: Number(formData.get("duration_minutes")),
      price_cents: Math.round(Number(formData.get("price_euros")) * 100),
      available_locations: selectedLocations,
      buffer_minutes: Number(formData.get("buffer_minutes")),
    };

    startTransition(async () => {
      const result = editingType
        ? await updateConsultationType(editingType.id, data)
        : await createConsultationType(data);

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
      const result = await deleteConsultationType(id);
      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  const handleLocationToggle = (loc: ConsultationLocation) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold text-primary-green">
            Types de consultation
          </h2>
          <p className="text-sm text-muted-foreground">
            Définissez les services que vous proposez.
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ct-title">Titre</Label>
                <Input
                  id="ct-title"
                  name="title"
                  required
                  defaultValue={editingType?.title ?? ""}
                  placeholder="Ex : Consultation allaitement"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ct-desc">Description</Label>
                <Textarea
                  id="ct-desc"
                  name="description"
                  rows={2}
                  defaultValue={editingType?.description ?? ""}
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
                    defaultValue={editingType?.duration_minutes ?? 60}
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
                    defaultValue={
                      editingType ? (editingType.price_cents / 100).toFixed(2) : ""
                    }
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
                  defaultValue={editingType?.buffer_minutes ?? 15}
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
                      <Label
                        htmlFor={`loc-${opt.value}`}
                        className="text-sm font-normal"
                      >
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
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
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
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-primary-green">
                      {ct.title}
                    </h3>
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
                    tabIndex={0}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ct.id)}
                    disabled={isPending}
                    aria-label={`Supprimer ${ct.title}`}
                    tabIndex={0}
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
            Aucun type de consultation. Ajoutez-en un pour commencer à recevoir
            des réservations.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

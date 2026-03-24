"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Card,
  CardContent,
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
  getDurationOptions,
  saveDurationOptions,
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

type DurationRow = {
  duration_minutes: number;
  price_cents: number;
  weekend_price_cents: number | null;
  is_default: boolean;
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

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
};

const LOCATION_LABELS: Record<string, string> = {
  cabinet: "Cabinet",
  teleconsultation: "Téléconsultation",
  domicile: "Domicile",
};

const DEFAULT_DURATIONS: DurationRow[] = [
  { duration_minutes: 30, price_cents: 5000, weekend_price_cents: null, is_default: false },
  { duration_minutes: 60, price_cents: 9000, weekend_price_cents: null, is_default: true },
  { duration_minutes: 90, price_cents: 13000, weekend_price_cents: null, is_default: false },
  { duration_minutes: 120, price_cents: 17000, weekend_price_cents: null, is_default: false },
];

export const ConsultationTypesTab = ({ types }: ConsultationTypesTabProps) => {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ConsultationType | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<
    ConsultationLocation[]
  >(["teleconsultation"]);
  const [durations, setDurations] = useState<DurationRow[]>(DEFAULT_DURATIONS);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load duration options when editing an existing type
  useEffect(() => {
    if (!editingType) return;
    const load = async () => {
      const opts = await getDurationOptions(editingType.id);
      if (opts.length > 0) {
        setDurations(
          opts.map((o) => ({
            duration_minutes: o.duration_minutes,
            price_cents: o.price_cents,
            weekend_price_cents: o.weekend_price_cents,
            is_default: o.is_default,
          }))
        );
      }
    };
    load();
  }, [editingType]);

  const handleOpenCreate = () => {
    setEditingType(null);
    setSelectedLocations(["teleconsultation"]);
    setDurations(DEFAULT_DURATIONS);
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
      available_locations: selectedLocations,
      buffer_minutes: Number(formData.get("buffer_minutes")),
    };

    startTransition(async () => {
      const result = editingType
        ? await updateConsultationType(editingType.id, data)
        : await createConsultationType(data);

      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
        return;
      }

      // Save duration options for existing types
      if (editingType) {
        const durResult = await saveDurationOptions(editingType.id, durations);
        if (!durResult.success) {
          setMessage({ type: "error", text: durResult.error ?? "Erreur durées" });
          return;
        }
      }

      setDialogOpen(false);
      setMessage({ type: "success", text: editingType ? "Mis à jour" : "Créé" });
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

  const handleDurationChange = (
    index: number,
    field: keyof DurationRow,
    value: number | boolean | null
  ) => {
    setDurations((prev) => {
      const next = [...prev];
      if (field === "is_default" && value === true) {
        // Only one default
        next.forEach((d, i) => {
          next[i] = { ...d, is_default: i === index };
        });
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleAddDuration = () => {
    setDurations((prev) => [
      ...prev,
      { duration_minutes: 60, price_cents: 9000, weekend_price_cents: null, is_default: false },
    ]);
  };

  const handleRemoveDuration = (index: number) => {
    setDurations((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Ensure at least one default
      if (next.length > 0 && !next.some((d) => d.is_default)) {
        next[0] = { ...next[0], is_default: true };
      }
      return next;
    });
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
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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

              {/* Duration options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Durées et tarifs</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDuration}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Ajouter
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tarif week-end/jours fériés : 110 €/h par défaut. Laissez vide pour
                  utiliser ce tarif, ou saisissez un montant personnalisé.
                </p>
                <div className="space-y-2">
                  {durations.map((dur, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Durée (min)</Label>
                            <Input
                              type="number"
                              min={15}
                              max={480}
                              step={15}
                              value={dur.duration_minutes}
                              onChange={(e) =>
                                handleDurationChange(
                                  i,
                                  "duration_minutes",
                                  Number(e.target.value)
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Prix (€)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              value={(dur.price_cents / 100).toFixed(2)}
                              onChange={(e) =>
                                handleDurationChange(
                                  i,
                                  "price_cents",
                                  Math.round(Number(e.target.value) * 100)
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">WE/férié (€)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              placeholder="Auto"
                              value={
                                dur.weekend_price_cents !== null
                                  ? (dur.weekend_price_cents / 100).toFixed(2)
                                  : ""
                              }
                              onChange={(e) =>
                                handleDurationChange(
                                  i,
                                  "weekend_price_cents",
                                  e.target.value
                                    ? Math.round(Number(e.target.value) * 100)
                                    : null
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Checkbox
                          checked={dur.is_default}
                          onCheckedChange={(v) =>
                            handleDurationChange(i, "is_default", !!v)
                          }
                          aria-label="Par défaut"
                        />
                        <span className="text-[10px] text-muted-foreground">
                          Défaut
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleRemoveDuration(i)}
                        disabled={durations.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
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
                disabled={isPending || selectedLocations.length === 0 || durations.length === 0}
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
                      {formatDuration(ct.duration_minutes)}
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
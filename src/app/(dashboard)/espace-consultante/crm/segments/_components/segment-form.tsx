"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { CrmSegment, SegmentCondition } from "@/types/database";

const FIELD_LABELS: Record<string, string> = {
  booking_count: "Nombre de consultations",
  total_spent_cents: "Total dépensé (centimes)",
  accompagnement_count: "Nombre d'accompagnements",
  formation_count: "Nombre de formations",
  inactive_days: "Jours d'inactivité",
  days_since_registration: "Jours depuis l'inscription",
};

const OP_LABELS: Record<string, string> = {
  ">=": "≥",
  "<=": "≤",
  "=": "=",
  "!=": "≠",
};

const PRESET_SEGMENTS = [
  {
    label: "Clients fidèles",
    color: "#2563eb",
    conditions: [{ field: "booking_count", op: ">=", value: 3 }] as SegmentCondition[],
  },
  {
    label: "VIP",
    color: "#7c3aed",
    conditions: [{ field: "total_spent_cents", op: ">=", value: 15000 }] as SegmentCondition[],
  },
  {
    label: "Inactifs",
    color: "#dc2626",
    conditions: [{ field: "inactive_days", op: ">=", value: 90 }] as SegmentCondition[],
  },
  {
    label: "Nouveaux",
    color: "#16a34a",
    conditions: [{ field: "days_since_registration", op: "<=", value: 30 }] as SegmentCondition[],
  },
];

interface Props {
  initial?: CrmSegment;
  onSubmit: (data: {
    name: string;
    description?: string;
    color?: string;
    conditions: SegmentCondition[];
  }) => Promise<void>;
  submitLabel?: string;
}

export function SegmentForm({ initial, onSubmit, submitLabel = "Créer" }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6B7280");
  const [conditions, setConditions] = useState<SegmentCondition[]>(
    initial?.conditions ?? [{ field: "booking_count", op: ">=", value: 1 }],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { field: "booking_count", op: ">=", value: 1 },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCondition = (
    index: number,
    key: keyof SegmentCondition,
    value: string | number,
  ) => {
    setConditions((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, [key]: key === "value" ? Number(value) : value } : c,
      ),
    );
  };

  const applyPreset = (preset: (typeof PRESET_SEGMENTS)[0]) => {
    setName(preset.label);
    setColor(preset.color);
    setConditions(preset.conditions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Le nom est requis"); return; }
    if (conditions.length === 0) { setError("Au moins une condition est requise"); return; }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({ name, description: description || undefined, color, conditions });
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Presets */}
      {!initial && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Démarrer avec un modèle
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_SEGMENTS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                style={{ borderColor: preset.color, color: preset.color }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="seg-name">Nom *</Label>
          <Input
            id="seg-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Clients fidèles"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seg-color">Couleur</Label>
          <div className="flex items-center gap-2">
            <input
              id="seg-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-14 rounded border border-input cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">{color}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="seg-desc">Description</Label>
        <Textarea
          id="seg-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description optionnelle du segment"
          rows={2}
        />
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Conditions (toutes doivent être vérifiées)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCondition}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>

        {conditions.map((cond, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={cond.field}
              onValueChange={(v) => updateCondition(i, "field", v)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={cond.op}
              onValueChange={(v) => updateCondition(i, "op", v)}
            >
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OP_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              min={0}
              value={cond.value}
              onChange={(e) => updateCondition(i, "value", e.target.value)}
              className="w-24"
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeCondition(i)}
              disabled={conditions.length === 1}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement…" : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/espace-consultante/crm/segments")}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

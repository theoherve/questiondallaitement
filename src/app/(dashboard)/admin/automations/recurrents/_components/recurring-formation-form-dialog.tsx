"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  createRecurringDefinition,
  updateRecurringDefinition,
} from "../../actions";
import {
  FORMATION_CATEGORIES,
  FORMATION_CATEGORY_CONFIG,
  type FormationCategory,
} from "@/config/formation-categories";
import type { RecurringFormationDefinition } from "@/lib/admin-workflows/types";

const DAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const WEEK_POSITIONS = [
  { value: 1, label: "1er" },
  { value: 2, label: "2e" },
  { value: 3, label: "3e" },
  { value: 4, label: "4e" },
  { value: -1, label: "Dernier" },
];

type Props = {
  consultants: { id: string; name: string }[];
  /** Presente : le dialogue modifie cette definition plutot que d'en creer une. */
  definition?: RecurringFormationDefinition;
};

const slugify = (str: string): string =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const RecurringFormationFormDialog = ({ consultants, definition }: Props) => {
  const isEditing = definition != null;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [title, setTitle] = useState(definition?.title ?? "");
  const [slugPrefix, setSlugPrefix] = useState(definition?.slug_prefix ?? "");
  const [description, setDescription] = useState(definition?.description ?? "");
  const [consultantId, setConsultantId] = useState(
    definition?.consultant_id ?? consultants[0]?.id ?? "",
  );
  const [type, setType] = useState<"online" | "in_person" | "hybrid">(
    definition?.type ?? "online",
  );
  const [category, setCategory] = useState<FormationCategory>(
    definition?.category ?? "atelier_mensuel",
  );
  const [durationMinutes, setDurationMinutes] = useState(
    definition?.duration_minutes ?? 60,
  );
  const [timeOfDay, setTimeOfDay] = useState(definition?.time_of_day.slice(0, 5) ?? "19:00");
  const [frequency, setFrequency] = useState<"monthly" | "weekly">(
    definition?.recurrence_rule.frequency ?? "monthly",
  );
  const [dayOfWeek, setDayOfWeek] = useState(definition?.recurrence_rule.day_of_week ?? 3);
  const [weekOfMonth, setWeekOfMonth] = useState(
    definition?.recurrence_rule.week_of_month ?? 1,
  );
  const [maxParticipants, setMaxParticipants] = useState<number | null>(
    definition?.max_participants ?? null,
  );
  const [priceCents, setPriceCents] = useState(definition?.price_cents ?? 0);

  const handleSubmit = () => {
    const data = {
      title,
      slug_prefix: slugPrefix || slugify(title),
      description: description || null,
      consultant_id: consultantId,
      type,
      category,
      duration_minutes: durationMinutes,
      time_of_day: timeOfDay,
      recurrence_rule: {
        frequency,
        interval: 1,
        day_of_week: dayOfWeek,
        ...(frequency === "monthly" ? { week_of_month: weekOfMonth } : {}),
      },
      max_participants: maxParticipants,
      price_cents: priceCents,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateRecurringDefinition(definition.id, data)
        : await createRecurringDefinition(data);

      if (result.success) {
        toast.success(isEditing ? "Définition mise à jour" : "Définition créée");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon" aria-label="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="bg-primary-red hover:bg-primary-red-dark">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle définition
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la formation récurrente" : "Nouvelle formation récurrente"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Titre</label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!isEditing) setSlugPrefix(slugify(e.target.value));
              }}
              placeholder="Atelier mensuel"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Slug prefix
            </label>
            <Input
              value={slugPrefix}
              onChange={(e) => setSlugPrefix(e.target.value)}
              placeholder="atelier-mensuel"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Consultante
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
            >
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "online" | "in_person" | "hybrid")
                }
              >
                <option value="online">En visio (Zoom)</option>
                <option value="in_person">Présentiel</option>
                <option value="hybrid">Hybride</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Catégorie
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as FormationCategory)}
              >
                {FORMATION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {FORMATION_CATEGORY_CONFIG[c].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Durée (min)
            </label>
            <Input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              min={15}
              max={480}
            />
          </div>

          {/* Recurrence rule */}
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Récurrence</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs">Fréquence</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as "monthly" | "weekly")
                  }
                >
                  <option value="monthly">Mensuel</option>
                  <option value="weekly">Hebdomadaire</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs">Jour</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                >
                  {DAYS.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {frequency === "monthly" && (
              <div>
                <label className="mb-1 block text-xs">Semaine du mois</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={weekOfMonth}
                  onChange={(e) => setWeekOfMonth(Number(e.target.value))}
                >
                  {WEEK_POSITIONS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Heure (Europe/Paris)
            </label>
            <Input
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Max participants
              </label>
              <Input
                type="number"
                value={maxParticipants ?? ""}
                onChange={(e) =>
                  setMaxParticipants(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                placeholder="Illimité"
                min={1}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Prix (centimes)
              </label>
              <Input
                type="number"
                value={priceCents}
                onChange={(e) => setPriceCents(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isPending || !title || !consultantId}
            className="w-full"
          >
            {isPending
              ? isEditing
                ? "Mise à jour..."
                : "Création..."
              : isEditing
                ? "Mettre à jour"
                : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

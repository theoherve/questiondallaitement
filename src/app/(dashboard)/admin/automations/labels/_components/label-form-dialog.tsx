"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { createLabel, updateLabel } from "../../actions";
import type { Label } from "@/lib/admin-workflows/types";

type Props = {
  formations: { id: string; title: string }[];
  label?: Label;
};

const slugify = (str: string): string =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const LabelFormDialog = ({ formations, label }: Props) => {
  const isEdit = !!label;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(label?.name ?? "");
  const [slug, setSlug] = useState(label?.slug ?? "");
  const [color, setColor] = useState(label?.color ?? "#6B7280");
  const [autoAssign, setAutoAssign] = useState(
    !!label?.auto_assign_rule,
  );
  const [formationIds, setFormationIds] = useState<string[]>(
    label?.auto_assign_rule?.formation_ids ?? [],
  );

  const handleSubmit = () => {
    const data = {
      name,
      slug: slug || slugify(name),
      color,
      auto_assign_rule: autoAssign
        ? {
            trigger: "formation_enrolled" as const,
            ...(formationIds.length > 0 ? { formation_ids: formationIds } : {}),
          }
        : null,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateLabel(label.id, data)
        : await createLabel(data);

      if (result.success) {
        toast.success(isEdit ? "Label mis à jour" : "Label créé");
        setOpen(false);
        if (!isEdit) {
          setName("");
          setSlug("");
          setColor("#6B7280");
          setAutoAssign(false);
          setFormationIds([]);
        }
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" title="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="bg-primary-red hover:bg-primary-red-dark">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau label
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le label" : "Nouveau label"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom</label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!isEdit) setSlug(slugify(e.target.value));
              }}
              placeholder="Accompagnement en ligne"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="accompagnement-en-ligne"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Couleur</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-28"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={autoAssign}
                onChange={(e) => setAutoAssign(e.target.checked)}
                className="rounded"
              />
              Auto-assigner à l&apos;achat d&apos;une formation
            </label>
            {autoAssign && (
              <div className="ml-6 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Laisser vide = toute formation
                </p>
                {formations.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formationIds.includes(f.id)}
                      onChange={(e) => {
                        setFormationIds(
                          e.target.checked
                            ? [...formationIds, f.id]
                            : formationIds.filter((id) => id !== f.id),
                        );
                      }}
                      className="rounded"
                    />
                    {f.title}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name}
            className="w-full"
          >
            {isPending ? "..." : isEdit ? "Mettre à jour" : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

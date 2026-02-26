"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tags, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { createTag, updateTag, deleteTag } from "../actions";
import { toast } from "sonner";

type Tag = { id: string; name: string; color: string | null };

const TAG_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

export const TagsManager = ({ tags }: { tags: Tag[] }) => {
  const [open, setOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setEditingTag(null);
    setName("");
    setColor(null);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    startTransition(async () => {
      const payload = { name: name.trim(), color };

      if (editingTag) {
        const result = await updateTag(editingTag.id, payload);
        if (result.success) {
          toast.success("Tag mis à jour");
          resetForm();
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createTag(payload);
        if (result.success) {
          toast.success("Tag créé");
          resetForm();
        } else {
          toast.error(result.error);
        }
      }
    });
  };

  const handleDelete = (tagId: string) => {
    startTransition(async () => {
      const result = await deleteTag(tagId);
      if (result.success) {
        toast.success("Tag supprimé");
        if (editingTag?.id === tagId) resetForm();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tags className="mr-2 h-4 w-4" />
          Gérer les tags
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer les tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tag list */}
          <div className="space-y-2">
            {tags.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun tag créé pour le moment.
              </p>
            )}
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <Badge
                  variant="outline"
                  style={
                    tag.color
                      ? { borderColor: tag.color, color: tag.color }
                      : undefined
                  }
                >
                  {tag.name}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(tag)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(tag.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Create / Edit form */}
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">
              {editingTag ? "Modifier le tag" : "Nouveau tag"}
            </p>
            <Input
              placeholder="Nom du tag"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setColor(null)}
                className={`h-6 w-6 rounded-full border-2 bg-muted ${
                  color === null ? "ring-2 ring-ring ring-offset-2" : ""
                }`}
                title="Sans couleur"
              />
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 ${
                    color === c ? "ring-2 ring-ring ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: c, borderColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isPending || !name.trim()}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : editingTag ? (
                  <Pencil className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {editingTag ? "Modifier" : "Créer"}
              </Button>
              {editingTag && (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

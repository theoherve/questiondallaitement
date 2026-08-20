"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Folder, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { createCategory, updateCategory, deleteCategory } from "../actions";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  categories: Category[];
};

export const CategoriesDialog = ({ categories }: Props) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    position: 0,
  });

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "", position: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const slugify = (text: string): string =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingId ? prev.slug : slugify(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (editingId) {
        const result = await updateCategory(editingId, formData);
        if (result.success) {
          toast.success("Catégorie mise à jour");
          resetForm();
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createCategory({
          ...formData,
          position: categories.length,
        });
        if (result.success) {
          toast.success("Catégorie créée");
          resetForm();
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }
    });
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: "",
      position: 0,
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.success) {
        toast.success("Catégorie supprimée");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Folder className="mr-2 h-4 w-4" />
          Catégories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les catégories</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category list */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune catégorie
              </p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">
                      /{cat.slug}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(cat)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cat.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form */}
          {showForm ? (
            <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Nom</Label>
                <Input
                  id="cat-name"
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="Allaitement, Sommeil..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-slug">Slug</Label>
                <Input
                  id="cat-slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="allaitement"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description (optionnel)</Label>
                <Textarea
                  id="cat-desc"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Description de la catégorie..."
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isPending}>
                  {editingId ? "Modifier" : "Créer"}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle catégorie
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { createFormation } from "../actions";
import { toast } from "sonner";

type ConsultantOption = {
  id: string;
  profiles: { first_name: string | null; last_name: string | null };
};

type AdminFormationCreateFormProps = {
  consultants: ConsultantOption[];
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const AdminFormationCreateForm = ({
  consultants,
}: AdminFormationCreateFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [consultantId, setConsultantId] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = {
      title: formData.get("title") as string,
      slug: slugify(formData.get("title") as string),
      description: (formData.get("description") as string) || undefined,
      short_description:
        (formData.get("short_description") as string) || undefined,
      price_cents: Math.round(
        parseFloat(formData.get("price") as string) * 100
      ),
      status: "draft" as const,
      consultant_id: consultantId || undefined,
      thumbnail_url: thumbnailUrl || undefined,
    };

    const result = await createFormation(data);
    setIsSubmitting(false);

    if (result.success && result.data) {
      toast.success("Formation créée");
      router.push(`/admin/formations/${result.data.id}/edit`);
    } else {
      toast.error(result.error ?? "Erreur lors de la création");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              name="title"
              required
              minLength={3}
              placeholder="Ex: Les bases de l'allaitement"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consultant_id">Consultante associée</Label>
            <Select value={consultantId} onValueChange={setConsultantId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une consultante" />
              </SelectTrigger>
              <SelectContent>
                {consultants.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.profiles?.first_name ?? ""} {c.profiles?.last_name ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_description">Description courte</Label>
            <Input
              id="short_description"
              name="short_description"
              maxLength={200}
              placeholder="Résumé en une phrase (max 200 caractères)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description complète</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Décrivez le contenu et les objectifs..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Prix (€)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="49.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <FileUpload
              bucket="formations"
              folder="thumbnails"
              accept="image/*"
              maxSizeMb={5}
              value={thumbnailUrl}
              onUpload={setThumbnailUrl}
              onRemove={() => setThumbnailUrl("")}
              label="Glissez ou cliquez pour ajouter une image"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary-red hover:bg-primary-red-dark"
      >
        {isSubmitting ? "Création en cours..." : "Créer la formation"}
      </Button>
    </form>
  );
};

import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFormation } from "../actions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Nouvelle formation",
};

const handleCreate = async (formData: FormData) => {
  "use server";

  const data = {
    title: formData.get("title") as string,
    slug: (formData.get("title") as string)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    description: (formData.get("description") as string) || undefined,
    short_description: (formData.get("short_description") as string) || undefined,
    price_cents: Math.round(parseFloat(formData.get("price") as string) * 100),
    status: (formData.get("status") as string) || "draft",
  };

  const result = await createFormation(data);

  if (result.success && result.data) {
    redirect(`/espace-consultante/formations/${result.data.id}/edit`);
  }
};

const NewFormationPage = () => {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Nouvelle formation
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-4">
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
                rows={6}
                placeholder="Décrivez le contenu et les objectifs de la formation..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="status">Statut</Label>
                <Select name="status" defaultValue="draft">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publiée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary-red hover:bg-primary-red-dark"
            >
              Créer la formation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewFormationPage;

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { updateFormation, createSection } from "../../actions";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Modifier la formation",
};

const EditFormationPage = async ({ params }: Props) => {
  const { id } = await params;
  const supabase = await createClient();

  const { data: formation } = await supabase
    .from("formations")
    .select(
      `
      *,
      formation_sections (
        id,
        title,
        position,
        formation_blocks (
          id,
          type,
          content,
          position
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!formation) notFound();

  const sections = (
    formation.formation_sections as unknown as {
      id: string;
      title: string;
      position: number;
      formation_blocks: {
        id: string;
        type: string;
        content: Record<string, unknown>;
        position: number;
      }[];
    }[]
  ).sort((a, b) => a.position - b.position);

  const handleUpdate = async (formData: FormData) => {
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
      price_cents: Math.round(
        parseFloat(formData.get("price") as string) * 100
      ),
      status: (formData.get("status") as string) || "draft",
    };

    await updateFormation(id, data);
  };

  const handleAddSection = async (formData: FormData) => {
    "use server";

    await createSection(id, {
      title: formData.get("section_title") as string,
      position: sections.length,
    });

    revalidatePath(`/espace-consultante/formations/${id}/edit`);
  };

  const BLOCK_TYPE_LABELS: Record<string, string> = {
    text: "Texte",
    video: "Vidéo",
    image: "Image",
    quiz: "Quiz",
    download: "Téléchargement",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Modifier la formation
        </h1>
        <Badge
          variant={formation.status === "published" ? "default" : "secondary"}
        >
          {formation.status === "published" ? "Publiée" : "Brouillon"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                name="title"
                defaultValue={formation.title}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="short_description">Description courte</Label>
              <Input
                id="short_description"
                name="short_description"
                defaultValue={formation.short_description ?? ""}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description complète</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={formation.description ?? ""}
                rows={6}
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
                  defaultValue={(formation.price_cents / 100).toFixed(2)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select name="status" defaultValue={formation.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publiée</SelectItem>
                    <SelectItem value="archived">Archivée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="submit"
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-primary-green">
            Sections & Contenu
          </h2>
        </div>

        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {section.formation_blocks.length > 0 ? (
                <div className="space-y-2">
                  {section.formation_blocks
                    .sort((a, b) => a.position - b.position)
                    .map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {BLOCK_TYPE_LABELS[block.type] ?? block.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Bloc #{block.position + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun contenu dans cette section
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="pt-4">
            <form action={handleAddSection} className="flex gap-2">
              <Input
                name="section_title"
                placeholder="Titre de la nouvelle section"
                required
                className="flex-1"
              />
              <Button
                type="submit"
                variant="outline"
              >
                Ajouter une section
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditFormationPage;

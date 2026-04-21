"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileUpload } from "@/components/ui/file-upload";
import { WysiwygEditor } from "@/components/editor/wysiwyg-editor";
import { SectionEditor } from "./section-editor";
import {
  updateFormation,
  updateFormationStatus,
  deleteFormation,
  createSection,
} from "../actions";
import { toast } from "sonner";
import {
  Save,
  Globe,
  Eye,
  EyeOff,
  Archive,
  Trash2,
  Plus,
  ArrowLeft,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";

type SectionData = {
  id: string;
  title: string;
  position: number;
  formation_blocks: {
    id: string;
    type: string;
    content: Record<string, unknown>;
    position: number;
  }[];
};

type ConsultantOption = {
  id: string;
  profiles: { first_name: string | null; last_name: string | null };
};

type FormationData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  long_description_html: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  status: string;
  consultant_id: string;
};

type FormationEditorProps = {
  formation: FormationData;
  sections: SectionData[];
  consultants: ConsultantOption[];
  headerActions?: React.ReactNode;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  published: { label: "Publiée", variant: "default" },
  archived: { label: "Archivée", variant: "outline" },
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const FormationEditor = ({
  formation,
  sections,
  consultants,
  headerActions,
}: FormationEditorProps) => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(
    formation.thumbnail_url ?? ""
  );
  const [consultantId, setConsultantId] = useState(formation.consultant_id);
  const [longDescriptionHtml, setLongDescriptionHtml] = useState(
    formation.long_description_html ?? ""
  );
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const statusConfig = STATUS_CONFIG[formation.status] ?? STATUS_CONFIG.draft;

  const handleSaveMetadata = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = {
      title: formData.get("title") as string,
      slug: slugify(formData.get("title") as string),
      description: (formData.get("description") as string) || undefined,
      short_description:
        (formData.get("short_description") as string) || undefined,
      long_description_html: longDescriptionHtml || undefined,
      price_cents: Math.round(
        parseFloat(formData.get("price") as string) * 100
      ),
      status: formation.status as "draft" | "published" | "archived",
      consultant_id: consultantId || undefined,
      thumbnail_url: thumbnailUrl || undefined,
    };

    const result = await updateFormation(formation.id, data);
    setIsSaving(false);

    if (result.success) {
      toast.success("Formation enregistrée");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur lors de la sauvegarde");
    }
  };

  const handleStatusChange = async (
    newStatus: "draft" | "published" | "archived"
  ) => {
    const result = await updateFormationStatus(formation.id, newStatus);
    setStatusDialogOpen(false);
    setPendingStatus(null);

    if (result.success) {
      toast.success(
        newStatus === "published"
          ? "Formation publiée"
          : newStatus === "archived"
            ? "Formation archivée"
            : "Formation dépubliée"
      );
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur");
    }
  };

  const handleDelete = async () => {
    const result = await deleteFormation(formation.id);
    setDeleteDialogOpen(false);

    if (result.success) {
      toast.success("Formation supprimée");
      router.push("/admin/formations");
    } else {
      toast.error(result.error ?? "Erreur");
    }
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    setIsAddingSection(true);

    const result = await createSection(formation.id, {
      title: newSectionTitle.trim(),
      position: sections.length,
    });

    setIsAddingSection(false);
    if (result.success) {
      setNewSectionTitle("");
      toast.success("Section ajoutée");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header — sticky for always-on-hand actions */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background-beige/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background-beige/80">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href="/admin/formations" aria-label="Retour" tabIndex={0}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1
              className="truncate font-serif text-xl font-bold text-primary-green"
              title={formation.title}
            >
              {formation.title}
            </h1>
            <Badge variant={statusConfig.variant} className="shrink-0">
              {statusConfig.label}
            </Badge>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/formations/${formation.id}/preview`}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>

            {/* Status + destructive actions regrouped in a single menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Plus d'actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {formation.status === "draft" && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setPendingStatus("published");
                      setStatusDialogOpen(true);
                    }}
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    Publier
                  </DropdownMenuItem>
                )}
                {formation.status === "published" && (
                  <>
                    <DropdownMenuItem
                      onSelect={() => {
                        setPendingStatus("draft");
                        handleStatusChange("draft");
                      }}
                    >
                      <EyeOff className="mr-2 h-4 w-4" />
                      Dépublier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        setPendingStatus("archived");
                        handleStatusChange("archived");
                      }}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archiver
                    </DropdownMenuItem>
                  </>
                )}
                {formation.status === "archived" && (
                  <DropdownMenuItem
                    onSelect={() => handleStatusChange("draft")}
                  >
                    <EyeOff className="mr-2 h-4 w-4" />
                    Restaurer en brouillon
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Publish confirmation dialog — lives outside the menu so it remains reachable */}
        <Dialog
          open={statusDialogOpen && pendingStatus === "published"}
          onOpenChange={(o) => {
            setStatusDialogOpen(o);
            if (!o) setPendingStatus(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publier la formation ?</DialogTitle>
              <DialogDescription>
                La formation sera visible publiquement.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStatusDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                className="bg-primary-red hover:bg-primary-red-dark"
                onClick={() => handleStatusChange("published")}
              >
                Publier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer la formation ?</DialogTitle>
              <DialogDescription>
                La formation sera archivée et ne sera plus visible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metadata form */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveMetadata} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={formation.title}
                  required
                  minLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultant_id">Consultante</Label>
                <Select value={consultantId} onValueChange={setConsultantId}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Choisir" />
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={formation.description ?? ""}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Description longue (WYSIWYG)</Label>
              <WysiwygEditor
                initialContent={formation.long_description_html ?? ""}
                onChange={setLongDescriptionHtml}
                placeholder="Décrivez la formation en détail..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label>Thumbnail</Label>
                <FileUpload
                  bucket="formations"
                  folder="thumbnails"
                  accept="image/*"
                  maxSizeMb={5}
                  value={thumbnailUrl}
                  onUpload={setThumbnailUrl}
                  onRemove={() => setThumbnailUrl("")}
                  label="Ajouter une image"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="cursor-pointer bg-primary-red hover:bg-primary-red-dark"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Sections & Blocks */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-primary-green">
          Sections & Contenu
        </h2>

        {sections.map((section) => (
          <SectionEditor
            key={section.id}
            section={section}
            formationId={formation.id}
          />
        ))}

        {/* Add section */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Titre de la nouvelle section"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSection();
                  }
                }}
              />
              <Button
                variant="outline"
                disabled={isAddingSection || !newSectionTitle.trim()}
                onClick={handleAddSection}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pencil,
  Trash2,
  Plus,
  MoreVertical,
  Check,
  X,
  Type,
  Video,
  ImageIcon,
  HelpCircle,
  Download,
} from "lucide-react";
import { SortableBlock } from "./sortable-block";
import { BlockEditor } from "./block-editor";
import {
  updateSection,
  deleteSection,
  createBlock,
  reorderBlocks,
} from "../actions";
import { toast } from "sonner";

type BlockData = {
  id: string;
  type: string;
  content: Record<string, unknown>;
  position: number;
};

type SectionData = {
  id: string;
  title: string;
  position: number;
  formation_blocks: BlockData[];
};

type SectionEditorProps = {
  section: SectionData;
  formationId: string;
};

const BLOCK_TYPES = [
  { type: "text", label: "Texte", icon: Type },
  { type: "video", label: "Vidéo", icon: Video },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "quiz", label: "Quiz", icon: HelpCircle },
  { type: "download", label: "Téléchargement", icon: Download },
] as const;

const DEFAULT_CONTENT: Record<string, Record<string, unknown>> = {
  text: { html: "" },
  video: { provider: "youtube", video_id: "", title: "" },
  image: { url: "", alt: "", caption: "" },
  quiz: {
    question: "",
    options: [
      { id: "1", text: "", is_correct: true },
      { id: "2", text: "", is_correct: false },
    ],
    explanation: "",
  },
  download: { url: "", filename: "", size_bytes: 0 },
};

export const SectionEditor = ({
  section,
  formationId,
}: SectionEditorProps) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blocks, setBlocks] = useState(section.formation_blocks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleRenameSection = async () => {
    if (!editTitle.trim() || editTitle === section.title) {
      setIsEditing(false);
      setEditTitle(section.title);
      return;
    }

    const result = await updateSection(section.id, formationId, {
      title: editTitle.trim(),
      position: section.position,
    });

    setIsEditing(false);
    if (result.success) {
      toast.success("Section renommée");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur");
      setEditTitle(section.title);
    }
  };

  const handleDeleteSection = async () => {
    const result = await deleteSection(section.id, formationId);
    setDeleteDialogOpen(false);

    if (result.success) {
      toast.success("Section supprimée");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur");
    }
  };

  const handleAddBlock = async (type: string) => {
    const content = DEFAULT_CONTENT[type] ?? {};
    const position = blocks.length;

    const result = await createBlock(
      section.id,
      formationId,
      type,
      content,
      position
    );

    if (result.success) {
      toast.success("Bloc ajouté");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const newBlocks = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(newBlocks);

    const orderedIds = newBlocks.map((b) => b.id);
    const result = await reorderBlocks(section.id, formationId, orderedIds);

    if (!result.success) {
      setBlocks(section.formation_blocks);
      toast.error("Erreur lors du réordonnancement");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-8 w-60"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSection();
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditTitle(section.title);
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleRenameSection}
              aria-label="Confirmer"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setIsEditing(false);
                setEditTitle(section.title);
              }}
              aria-label="Annuler"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <CardTitle className="flex items-center gap-2 text-base">
            {section.title}
            <span className="text-xs text-muted-foreground">
              ({blocks.length} bloc{blocks.length > 1 ? "s" : ""})
            </span>
          </CardTitle>
        )}

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsEditing(true)}
            aria-label="Renommer la section"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setDeleteDialogOpen(true)}
              aria-label="Supprimer la section"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer « {section.title} » ?</DialogTitle>
                <DialogDescription>
                  Tous les blocs de cette section seront supprimés.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button variant="destructive" onClick={handleDeleteSection}>
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {blocks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {blocks.map((block) => (
                <SortableBlock key={block.id} block={block}>
                  <BlockEditor
                    block={block}
                    formationId={formationId}
                  />
                </SortableBlock>
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucun contenu — ajoutez un bloc ci-dessous
          </p>
        )}

        {/* Add block dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un bloc
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
              <DropdownMenuItem
                key={type}
                onClick={() => handleAddBlock(type)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
};

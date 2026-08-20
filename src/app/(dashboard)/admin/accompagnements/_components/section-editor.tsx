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
  Check,
  X,
  Type,
  Video,
  ImageIcon,
  HelpCircle,
  Paperclip,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { SortableBlock } from "./sortable-block";
import { BlockEditor, type SiblingSection } from "./block-editor";
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
  /** Accroche affichée sous le titre sur la page de vente publique. */
  sales_hook: string | null;
  accompagnement_blocks: BlockData[];
};

type SectionEditorProps = {
  section: SectionData;
  accompagnementId: string;
  /** Toutes les sections de l'accompagnement, pour le menu "Deplacer vers...". */
  allSections: SiblingSection[];
};

const BLOCK_TYPES = [
  { type: "text", label: "Texte", hint: "Paragraphe mis en forme", icon: Type },
  { type: "video", label: "Vidéo", hint: "YouTube ou Vimeo", icon: Video },
  { type: "image", label: "Image", hint: "Photo ou illustration", icon: ImageIcon },
  { type: "quiz", label: "Quiz", hint: "Question à choix", icon: HelpCircle },
  {
    type: "download",
    label: "Pièce jointe",
    hint: "PDF, support PPT, document",
    icon: Paperclip,
  },
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
  accompagnementId,
  allSections,
}: SectionEditorProps) => {
  const otherSections = allSections.filter((s) => s.id !== section.id);
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);
  const [editHook, setEditHook] = useState(section.sales_hook ?? "");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blocks, setBlocks] = useState(section.accompagnement_blocks);
  const [prevServerBlocks, setPrevServerBlocks] = useState(
    section.accompagnement_blocks
  );
  const [isExpanded, setIsExpanded] = useState(true);

  // Sync local state when server data changes (after router.refresh()).
  if (prevServerBlocks !== section.accompagnement_blocks) {
    setPrevServerBlocks(section.accompagnement_blocks);
    setBlocks(section.accompagnement_blocks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /** Remet les deux champs sur la valeur serveur et sort du mode edition. */
  const cancelEdit = () => {
    setIsEditing(false);
    setEditTitle(section.title);
    setEditHook(section.sales_hook ?? "");
  };

  const handleSaveSection = async () => {
    const title = editTitle.trim();
    const hook = editHook.trim();

    if (!title) {
      cancelEdit();
      return;
    }
    if (title === section.title && hook === (section.sales_hook ?? "")) {
      setIsEditing(false);
      return;
    }

    const result = await updateSection(section.id, accompagnementId, {
      title,
      position: section.position,
      sales_hook: hook === "" ? null : hook,
    });

    setIsEditing(false);
    if (result.success) {
      toast.success("Section enregistrée");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erreur");
      setEditTitle(section.title);
      setEditHook(section.sales_hook ?? "");
    }
  };

  const handleDeleteSection = async () => {
    const result = await deleteSection(section.id, accompagnementId);
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
      accompagnementId,
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

  const handleDragEnd = async (formation: DragEndEvent) => {
    const { active, over } = formation;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const newBlocks = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(newBlocks);

    const orderedIds = newBlocks.map((b) => b.id);
    const result = await reorderBlocks(section.id, accompagnementId, orderedIds);

    if (!result.success) {
      setBlocks(section.accompagnement_blocks);
      toast.error("Erreur lors du réordonnancement");
    }
  };

  return (
    <Card>
      <CardHeader
        className={`flex flex-row items-center justify-between space-y-0 pb-3 ${
          !isEditing ? "cursor-pointer" : ""
        }`}
        onClick={() => {
          if (!isEditing) setIsExpanded((v) => !v);
        }}
        role={!isEditing ? "button" : undefined}
        aria-expanded={isExpanded}
      >
        {isEditing ? (
          <div
            className="flex flex-1 flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-8 w-60"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveSection();
                  if (e.key === "Escape") cancelEdit();
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleSaveSection}
                aria-label="Confirmer"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={cancelEdit}
                aria-label="Annuler"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              value={editHook}
              onChange={(e) => setEditHook(e.target.value)}
              className="h-8 max-w-xl"
              maxLength={200}
              aria-label="Accroche de la page de vente"
              placeholder="Accroche page de vente, ex. : à la fin de ce chapitre, vous saurez reconnaître une bonne prise du sein"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveSection();
                if (e.key === "Escape") cancelEdit();
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <CardTitle className="flex items-center gap-2 text-base">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {section.title}
              <span className="text-xs text-muted-foreground">
                ({blocks.length} bloc{blocks.length > 1 ? "s" : ""})
              </span>
            </CardTitle>
            {section.sales_hook && (
              <p className="pl-6 text-xs italic text-muted-foreground">
                {section.sales_hook}
              </p>
            )}
          </div>
        )}

        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
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

      <CardContent
        className={`space-y-3 ${isExpanded ? "" : "hidden"}`}
      >
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
                    accompagnementId={accompagnementId}
                    otherSections={otherSections}
                  />
                </SortableBlock>
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucun contenu, ajoutez un bloc ci-dessous
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
          <DropdownMenuContent align="center" className="w-64">
            {BLOCK_TYPES.map(({ type, label, hint, icon: Icon }) => (
              <DropdownMenuItem
                key={type}
                onClick={() => handleAddBlock(type)}
                className="items-start gap-2"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex flex-col">
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
};

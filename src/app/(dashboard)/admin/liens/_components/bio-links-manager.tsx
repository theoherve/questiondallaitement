"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MousePointerClick, Pencil, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { BioLink } from "@/types/database";
import { reorderBioLinks, toggleBioLinkActive } from "../actions";

type BioLinksManagerProps = {
  links: BioLink[];
};

const SortableRow = ({ link }: { link: BioLink }) => {
  const [isPending, startTransition] = useTransition();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const isHeader = link.kind === "header";

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      const result = await toggleBioLinkActive(link.id, checked);
      if (!result.success) {
        toast.error(result.error ?? "Erreur lors de la mise à jour");
      }
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`flex items-center gap-3 border-b px-4 py-3 last:border-b-0 ${
        isHeader ? "bg-muted/40" : ""
      } ${link.is_active ? "" : "opacity-60"}`}
    >
      <button
        type="button"
        className="cursor-grab rounded p-1 text-muted-foreground/40 transition-colors hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red active:cursor-grabbing"
        aria-label={`Déplacer ${link.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isHeader && (
            <span className="rounded-full bg-primary-green/10 px-2 py-0.5 text-xs font-medium text-primary-green">
              Rubrique
            </span>
          )}
          {link.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-red/10 px-2 py-0.5 text-xs font-medium text-primary-red">
              <Star className="h-3 w-3" aria-hidden="true" />À la une
            </span>
          )}
          <span
            className={`truncate ${isHeader ? "text-sm font-medium uppercase tracking-wide text-muted-foreground" : "font-medium"}`}
          >
            {link.title}
          </span>
        </div>
        {link.url && (
          <p className="truncate text-xs text-muted-foreground">{link.url}</p>
        )}
      </div>

      {!isHeader && (
        <span
          className="flex w-16 shrink-0 items-center gap-1 text-sm text-muted-foreground"
          title={`${link.click_count} clic${link.click_count > 1 ? "s" : ""}`}
        >
          <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
          {link.click_count}
        </span>
      )}

      <Switch
        checked={link.is_active}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={`Afficher ${link.title} sur la page`}
      />

      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/liens/${link.id}/edit`}>
          <Pencil className="mr-2 h-4 w-4" />
          Modifier
        </Link>
      </Button>
    </div>
  );
};

export const BioLinksManager = ({ links }: BioLinksManagerProps) => {
  const [ordered, setOrdered] = useState(links);
  const [syncedFrom, setSyncedFrom] = useState(links);
  const [, startTransition] = useTransition();

  // Une création, une suppression ou une bascule d'affichage renvoie une
  // nouvelle liste depuis le serveur : sans cette resynchronisation, l'état
  // local garderait l'ancienne. Fait pendant le rendu et non dans un effet,
  // pour ne pas peindre une première fois la liste périmée.
  if (syncedFrom !== links) {
    setSyncedFrom(links);
    setOrdered(links);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = ordered.findIndex((link) => link.id === active.id);
    const to = ordered.findIndex((link) => link.id === over.id);
    if (from === -1 || to === -1) return;

    const previous = ordered;
    const next = arrayMove(ordered, from, to);
    setOrdered(next);

    startTransition(async () => {
      const result = await reorderBioLinks(next.map((link) => link.id));
      if (!result.success) {
        // Remettre la liste dans l'ordre du serveur : afficher un ordre qui n'a
        // pas été enregistré ferait croire au succès.
        setOrdered(previous);
        toast.error(result.error ?? "Erreur lors du réordonnancement");
      }
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ordered.map((link) => link.id)}
        strategy={verticalListSortingStrategy}
      >
        <div>
          {ordered.map((link) => (
            <SortableRow key={link.id} link={link} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

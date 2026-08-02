"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

type SortableSectionProps = {
  section: { id: string; title: string };
  children: ReactNode;
};

/**
 * Poignée de déplacement d'une section. La poignée est un bouton : elle reste
 * atteignable au clavier (espace pour saisir, flèches pour déplacer), là où le
 * glisser-déposer seul exclurait la navigation clavier.
 */
export const SortableSection = ({ section, children }: SortableSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        type="button"
        className="mt-4 cursor-grab rounded p-1 text-muted-foreground/40 transition-colors hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red active:cursor-grabbing"
        aria-label={`Déplacer la section ${section.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

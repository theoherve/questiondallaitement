"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

type SortableBlockProps = {
  block: { id: string };
  children: ReactNode;
};

export const SortableBlock = ({ block, children }: SortableBlockProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-2 rounded-lg border bg-white p-3"
    >
      <button
        type="button"
        className="mt-1 cursor-grab rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Réordonner le bloc"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

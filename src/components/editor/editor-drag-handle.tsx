"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { handleOffset } from "./drag-handle-geometry";

const HANDLE_HEIGHT = 20;

type Props = {
  editor: Editor | null;
  /** Conteneur positionné en `relative` qui enveloppe la zone d'édition. */
  containerRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Poignée de déplacement des blocs.
 *
 * ProseMirror sait déjà déplacer une sélection de nœud par glisser-déposer ;
 * il manque seulement de quoi la déclencher sans avoir à sélectionner le bloc
 * à la main. La poignée fait exactement ça — elle pose une sélection de nœud
 * puis laisse le navigateur et ProseMirror faire le reste.
 *
 * Écrite en composant React plutôt qu'en plugin ProseMirror : le plugin
 * imposerait d'importer `@tiptap/pm`, qui n'est pas une dépendance déclarée du
 * projet. Tout ce dont la poignée a besoin est accessible depuis `editor.view`.
 */
export const EditorDragHandle = ({ editor, containerRef }: Props) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const blockPos = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!editor || !container) return;

    const onMouseMove = (event: MouseEvent) => {
      const view = editor.view;
      const found = view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (!found) return;

      // On ne déplace que des blocs entiers : saisir un élément de liste
      // isolément produirait un document incohérent une fois lâché ailleurs.
      const resolved = view.state.doc.resolve(
        found.inside >= 0 ? found.inside : found.pos,
      );
      const pos = resolved.depth === 0 ? found.inside : resolved.before(1);
      if (pos === null || pos < 0) {
        setPosition(null);
        blockPos.current = null;
        return;
      }

      const dom = view.nodeDOM(pos);
      if (!(dom instanceof HTMLElement)) return;

      blockPos.current = pos;
      setPosition(
        handleOffset(
          dom.getBoundingClientRect(),
          container.getBoundingClientRect(),
          HANDLE_HEIGHT,
        ),
      );
    };

    const onMouseLeave = () => setPosition(null);

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [editor, containerRef]);

  const onDragStart = (event: React.DragEvent) => {
    const pos = blockPos.current;
    if (!editor || pos === null) return;

    editor.commands.setNodeSelection(pos);

    const view = editor.view;

    // Renseigner `view.dragging` est l'API ProseMirror pour un glisser-déposer
    // déclenché depuis l'extérieur de la zone éditable. `move: true` fait
    // supprimer le bloc d'origine au lâcher — sans quoi il serait dupliqué.
    // eslint-disable-next-line react-hooks/immutability -- cf. ci-dessus
    view.dragging = { slice: view.state.selection.content(), move: true };

    const dom = view.nodeDOM(pos);
    if (dom instanceof HTMLElement) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setDragImage(dom, 0, 0);
    }
  };

  if (!position) return null;

  return (
    <div
      ref={handleRef}
      draggable
      onDragStart={onDragStart}
      aria-hidden
      className="absolute z-20 flex h-5 w-5 cursor-grab items-center justify-center rounded text-primary-green/40 transition-colors hover:bg-primary-green/10 hover:text-primary-green/80 active:cursor-grabbing"
      style={{ top: position.top, left: position.left }}
    >
      <GripVertical className="h-4 w-4" />
    </div>
  );
};

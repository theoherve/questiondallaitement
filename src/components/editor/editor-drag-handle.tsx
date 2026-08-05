"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, Plus } from "lucide-react";
import type { Editor } from "@tiptap/react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATALOG, type SidebarItem } from "./block-catalog";
import { handleOffset } from "./drag-handle-geometry";

const HANDLE_HEIGHT = 20;

type Props = {
  editor: Editor | null;
  /** Conteneur positionné en `relative` qui enveloppe la zone d'édition. */
  containerRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Marge active d'un bloc : bouton d'insertion et poignée de déplacement.
 *
 * Les deux suivent le bloc survolé. Le « + » ouvre le même catalogue que la
 * bibliothèque latérale et que le menu « / » — trois portes d'entrée, une
 * seule liste, pour qu'un bloc ajouté un jour apparaisse partout.
 */
export const EditorBlockHandle = ({ editor, containerRef }: Props) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const blockPos = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!editor || !container) return;

    const onMouseMove = (event: MouseEvent) => {
      // Pendant que le panneau est ouvert, la marge reste ancrée sur le bloc
      // choisi : la déplacer sous le curseur insérerait ailleurs qu'annoncé.
      if (pickerOpen) return;

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

    const onMouseLeave = () => {
      if (!pickerOpen) setPosition(null);
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [editor, containerRef, pickerOpen]);

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

  /**
   * Insère le bloc choisi à hauteur de la ligne survolée.
   *
   * Le curseur y est d'abord posé : sans cela, l'insertion atterrirait là où
   * se trouvait la sélection précédente, souvent tout en haut de l'article.
   */
  const insertBlock = (item: SidebarItem) => {
    const pos = blockPos.current;
    if (!editor || pos === null) return;

    setPickerOpen(false);

    const node = editor.state.doc.nodeAt(pos);
    const isEmptyParagraph =
      node?.type.name === "paragraph" && node.content.size === 0;

    // Sur une ligne vide, on écrit dedans plutôt que d'en ajouter une autre —
    // sinon chaque insertion laisserait un paragraphe vide derrière elle.
    if (isEmptyParagraph) {
      editor.commands.setTextSelection(pos + 1);
    } else {
      const end = pos + (node?.nodeSize ?? 1);
      editor.chain().focus().insertContentAt(end, { type: "paragraph" }).run();
      editor.commands.setTextSelection(end + 1);
    }

    item.insert(editor);
  };

  if (!position) return null;

  return (
    <div
      className="absolute z-20 flex items-center gap-0.5"
      style={{ top: position.top, left: position.left }}
    >
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Ajouter un bloc"
            className="flex h-5 w-5 items-center justify-center rounded text-primary-green/40 transition-colors hover:bg-primary-green/10 hover:text-primary-green/80"
          >
            <Plus className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" className="w-72 p-0">
          <Command>
            <CommandInput placeholder="Rechercher un bloc…" />
            <CommandList>
              <CommandEmpty>Aucun bloc trouvé.</CommandEmpty>
              {CATALOG.map((category) => (
                <CommandGroup key={category.id} heading={category.label}>
                  {category.items.map((item) => (
                    <CommandItem
                      key={item.id}
                      // Les mots-clés rejoignent la valeur cherchée : « faq »
                      // doit remonter l'accordéon, « tableau » la table.
                      value={`${item.label} ${item.keywords.join(" ")}`}
                      onSelect={() => insertBlock(item)}
                      className="gap-2"
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div
        draggable
        onDragStart={onDragStart}
        aria-hidden
        className="flex h-5 w-5 cursor-grab items-center justify-center rounded text-primary-green/40 transition-colors hover:bg-primary-green/10 hover:text-primary-green/80 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </div>
    </div>
  );
};

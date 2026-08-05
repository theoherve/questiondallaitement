import { Extension } from "@tiptap/core";

/**
 * Déplacement d'un bloc au clavier.
 *
 * La poignée ne sert qu'à la souris : sans équivalent clavier, réordonner un
 * article deviendrait impossible pour qui n'en utilise pas (WCAG 2.1.1).
 * Alt+↑ / Alt+↓ sont les raccourcis attendus — ce sont ceux de Notion et de
 * VS Code.
 */
export const MoveBlockShortcuts = Extension.create({
  name: "moveBlockShortcuts",

  addKeyboardShortcuts() {
    const move = (direction: -1 | 1) => () => {
      const { state, view } = this.editor;
      const { $from } = state.selection;
      if ($from.depth === 0) return false;

      const from = $from.before(1);
      const node = state.doc.nodeAt(from);
      if (!node) return false;

      const to = from + node.nodeSize;
      const sibling =
        direction === -1
          ? state.doc.resolve(from).nodeBefore
          : state.doc.resolve(to).nodeAfter;
      // Premier ou dernier bloc du document : rien à échanger.
      if (!sibling) return false;

      // Le bloc est retiré avant d'être réinséré, donc les positions situées
      // après lui se décalent. En descendant, la cible est calculée dans le
      // document déjà amputé ; en montant, elle ne bouge pas.
      const insertAt =
        direction === -1 ? from - sibling.nodeSize : from + sibling.nodeSize;

      const tr = state.tr.delete(from, to).insert(insertAt, node);
      view.dispatch(tr.scrollIntoView());
      return true;
    };

    return { "Alt-ArrowUp": move(-1), "Alt-ArrowDown": move(1) };
  },
});

export type Rect = { top: number; left: number; height: number };

/** Largeur réservée à la poignée dans la marge gauche, en pixels. */
export const HANDLE_GUTTER = 28;

/**
 * Position de la poignée, en coordonnées relatives au conteneur de l'éditeur.
 *
 * Elle est posée dans la marge et non sur le bloc : à l'intérieur, elle
 * recouvrirait le texte de la première ligne et le curseur atterrirait dessus
 * au clic.
 */
export const handleOffset = (
  nodeRect: Rect,
  containerRect: Rect,
  handleHeight: number,
): { top: number; left: number } => {
  const relativeTop = nodeRect.top - containerRect.top;

  // Centrée sur la première ligne du bloc — pas sur le bloc entier : un
  // paragraphe de dix lignes verrait sinon sa poignée flotter au milieu, loin
  // du repère visuel que cherche l'œil.
  const centering = Math.max(
    0,
    (Math.min(nodeRect.height, 24) - handleHeight) / 2,
  );

  return {
    top: relativeTop + centering,
    left: Math.max(0, nodeRect.left - containerRect.left - HANDLE_GUTTER),
  };
};

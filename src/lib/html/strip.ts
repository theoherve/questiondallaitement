/**
 * Texte brut a partir d'un fragment HTML redactionnel. Sert aux metadonnees
 * de referencement, jamais au rendu : on ne cherche pas a assainir, seulement
 * a extraire une phrase lisible.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&eacute;": "é",
  "&egrave;": "è",
  "&ecirc;": "ê",
  "&agrave;": "à",
  "&ccedil;": "ç",
  "&ocirc;": "ô",
  "&ugrave;": "ù",
  "&icirc;": "î",
  "&hellip;": "…",
  "&laquo;": "«",
  "&raquo;": "»",
};

export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return "";

  return (
    html
      // Une balise vaut une frontiere de mot : sans cette espace, deux items
      // de liste colles donneraient "UnDeux".
      .replace(/<[^>]*>/g, " ")
      .replace(
        /&[a-zA-Z]+;|&#\d+;/g,
        (entity) =>
          ENTITIES[entity.toLowerCase()] ??
          (entity.startsWith("&#")
            ? String.fromCharCode(Number(entity.slice(2, -1)))
            : entity),
      )
      .replace(/\s+/g, " ")
      .trim()
  );
};

export const truncate = (text: string, max: number): string | undefined => {
  const clean = text.trim();
  if (clean === "") return undefined;
  if (clean.length <= max) return clean;

  // On garde max - 1 caracteres pour laisser la place a l'ellipse.
  const head = clean.slice(0, max - 1);

  // Si la coupe tombe pile sur une espace, le dernier mot est deja entier :
  // reculer jusqu'a l'espace precedente amputerait un mot pour rien.
  if (/\s/.test(clean.charAt(max - 1))) return `${head.trimEnd()}…`;

  const lastSpace = head.lastIndexOf(" ");
  const cut = lastSpace > 0 ? head.slice(0, lastSpace) : head;
  return `${cut.trimEnd()}…`;
};

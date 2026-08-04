export type ArticleSegment =
  | { type: "html"; html: string }
  | { type: "embed"; slug: string; mode: "form" | "chart" };

/**
 * Le nœud Tiptap est atomique et sans contenu : il se sérialise toujours comme
 * une balise `div` vide et auto-suffisante. Une expression régulière suffit
 * donc, sans avoir à parser tout le document — et elle tourne côté serveur,
 * dans un composant serveur, sans dépendance supplémentaire.
 */
const EMBED_PATTERN = /<div\b[^>]*\bdata-survey-embed\b[^>]*><\/div>/gi;

const attribute = (tag: string, name: string): string | null =>
  tag.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1] ?? null;

/**
 * Découpe le HTML d'un article en morceaux inertes et en emplacements de
 * sondage.
 *
 * Nécessaire parce que le corps d'article est stocké en HTML et rendu par
 * `dangerouslySetInnerHTML`, qui ne monte aucun composant React : sans ce
 * découpage, un sondage inséré dans un article resterait une `div` vide.
 */
export const splitSurveyEmbeds = (html: string): ArticleSegment[] => {
  const segments: ArticleSegment[] = [];
  let cursor = 0;

  for (const match of html.matchAll(EMBED_PATTERN)) {
    const index = match.index ?? 0;
    const before = html.slice(cursor, index);
    if (before.trim() !== "") segments.push({ type: "html", html: before });
    cursor = index + match[0].length;

    const slug = attribute(match[0], "data-survey-slug");
    // Un marqueur sans slug ne désigne aucun sondage : le rendre afficherait un
    // squelette de chargement perpétuel au milieu de l'article.
    if (!slug) continue;

    const rawMode = attribute(match[0], "data-survey-mode");
    segments.push({
      type: "embed",
      slug,
      mode: rawMode === "chart" ? "chart" : "form",
    });
  }

  const rest = html.slice(cursor);
  if (rest.trim() !== "") segments.push({ type: "html", html: rest });

  return segments;
};

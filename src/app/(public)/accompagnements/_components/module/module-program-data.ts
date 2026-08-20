/**
 * Calcul du programme affiche sur une page de vente de module.
 *
 * Les chapitres et leurs blocs sont lus en base : quand le contenu pedagogique
 * est refait, la page de vente suit sans changement de code. Ce fichier ne fait
 * que du calcul pur, il est donc testable sans base ni rendu.
 */

/** Types de la colonne `accompagnement_blocks.type` (enum `block_type`). */
export const BLOCK_TYPES = [
  "text",
  "video",
  "image",
  "quiz",
  "download",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type BlockRow = {
  id: string;
  type: string;
  content_updated_at?: string | null;
};

export type SectionRow = {
  id: string;
  title: string;
  position: number;
  sales_hook: string | null;
  content_updated_at?: string | null;
  accompagnement_blocks?: BlockRow[];
};

export type BlockCounts = Record<BlockType, number>;

export type ProgramChapter = {
  id: string;
  title: string;
  salesHook: string | null;
  counts: BlockCounts;
  /** Vrai si le chapitre (ou un de ses blocs) a ete modifie il y a moins de 6 mois. */
  recentlyImproved: boolean;
};

/** Fenetre d'affichage du badge "contenu ameliore", en mois. */
export const CONTENT_IMPROVED_WINDOW_MONTHS = 6;

const isWithinImprovedWindow = (
  isoDate: string | null | undefined,
  now: Date
): boolean => {
  if (!isoDate) return false;
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - CONTENT_IMPROVED_WINDOW_MONTHS);
  return new Date(isoDate) > threshold;
};

const emptyCounts = (): BlockCounts => ({
  text: 0,
  video: 0,
  image: 0,
  quiz: 0,
  download: 0,
});

const isBlockType = (value: string): value is BlockType =>
  (BLOCK_TYPES as readonly string[]).includes(value);

/** Trie les chapitres par `position` et compte leurs blocs par type. */
export function buildProgramChapters(
  rows: SectionRow[],
  now: Date = new Date()
): ProgramChapter[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((row) => {
      const counts = emptyCounts();
      const blocks = row.accompagnement_blocks ?? [];
      for (const block of blocks) {
        // Un type inconnu (enum elargie en base avant le deploiement du front)
        // est ignore plutot que de faire planter la page.
        if (isBlockType(block.type)) counts[block.type] += 1;
      }
      // Le chapitre est "ameliore" si sa propre accroche/titre ou l'un de ses
      // blocs a change dans la fenetre : une section peut etre inchangee alors
      // qu'un de ses blocs vient d'etre reecrit, et inversement.
      const recentlyImproved =
        isWithinImprovedWindow(row.content_updated_at, now) ||
        blocks.some((b) => isWithinImprovedWindow(b.content_updated_at, now));
      return {
        id: row.id,
        title: row.title,
        salesHook: row.sales_hook,
        counts,
        recentlyImproved,
      };
    });
}

const plural = (n: number, singular: string, pluralForm: string): string =>
  `${n} ${n > 1 ? pluralForm : singular}`;

/**
 * Badges d'un chapitre. `text` et `image` sont volontairement absents : ils
 * decrivent la mise en forme, pas une promesse de valeur.
 */
export function formatChapterCounts(counts: BlockCounts): string[] {
  const items: string[] = [];
  if (counts.video > 0) items.push(plural(counts.video, "vidéo", "vidéos"));
  if (counts.download > 0)
    items.push(plural(counts.download, "document", "documents"));
  if (counts.quiz > 0) items.push(`${counts.quiz} quiz`);
  return items;
}

/** Libelle d'un seul type de bloc, pour un badge isole. */
export function formatSingleCount(type: BlockType, n: number): string | null {
  if (n <= 0) return null;
  if (type === "video") return plural(n, "vidéo", "vidéos");
  if (type === "download") return plural(n, "document", "documents");
  if (type === "quiz") return `${n} quiz`;
  return null;
}

/** Barre de preuve en haut de page : volumetrie agregee du module. */
export function buildProofItems(chapters: ProgramChapter[]): string[] {
  if (chapters.length === 0) return [];
  const total = chapters.reduce<BlockCounts>((acc, c) => {
    for (const type of BLOCK_TYPES) acc[type] += c.counts[type];
    return acc;
  }, emptyCounts());

  return [
    plural(chapters.length, "chapitre", "chapitres"),
    ...formatChapterCounts(total),
  ];
}

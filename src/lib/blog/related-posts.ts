import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Un article tel qu'affiché dans les suggestions : le strict nécessaire pour
 * une vignette, un titre et une date.
 */
export type RelatedPostCandidate = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  published_at: string | null;
  category_id: string | null;
  tags: string[] | null;
};

export type RelatedPostsSource = {
  id: string;
  category_id: string | null;
  tags: string[] | null;
  related_post_ids: string[] | null;
};

/**
 * Classe les suggestions d'un article.
 *
 * Ordre de priorité : articles épinglés par la rédactrice (dans l'ordre saisi),
 * puis même catégorie, puis tags en commun (le plus de tags partagés d'abord),
 * puis les plus récents.
 *
 * Le dernier palier est ce qui garantit qu'une sidebar n'est jamais vide, y
 * compris sur un article sans catégorie, sans tag et sans épingle — c'est-à-dire
 * sur les articles publiés avant cette fonctionnalité.
 */
export const resolveRelatedPosts = (
  current: RelatedPostsSource,
  candidates: RelatedPostCandidate[],
  limit = 4,
): RelatedPostCandidate[] => {
  if (limit <= 0) return [];

  const pool = candidates.filter((c) => c.id !== current.id);
  const byId = new Map(pool.map((c) => [c.id, c]));
  const currentTags = new Set(current.tags ?? []);

  const picked: RelatedPostCandidate[] = [];
  const seen = new Set<string>();

  const take = (post: RelatedPostCandidate | undefined) => {
    if (!post || seen.has(post.id) || picked.length >= limit) return;
    seen.add(post.id);
    picked.push(post);
  };

  // 1. Épingles, dans l'ordre de saisie : c'est une intention éditoriale, pas
  //    un ensemble.
  for (const id of current.related_post_ids ?? []) take(byId.get(id));

  const remaining = () => pool.filter((c) => !seen.has(c.id));

  const byRecency = (a: RelatedPostCandidate, b: RelatedPostCandidate) =>
    (b.published_at ?? "").localeCompare(a.published_at ?? "");

  // 2. Même catégorie, du plus récent au plus ancien.
  if (current.category_id) {
    for (const post of remaining()
      .filter((c) => c.category_id === current.category_id)
      .sort(byRecency)) {
      take(post);
    }
  }

  // 3. Tags en commun : plus de tags partagés d'abord, puis récence.
  if (currentTags.size > 0) {
    const shared = (post: RelatedPostCandidate) =>
      (post.tags ?? []).filter((tag) => currentTags.has(tag)).length;

    for (const post of remaining()
      .filter((c) => shared(c) > 0)
      .sort((a, b) => shared(b) - shared(a) || byRecency(a, b))) {
      take(post);
    }
  }

  // 4. Complément : les plus récents, quels qu'ils soient.
  for (const post of remaining().sort(byRecency)) take(post);

  return picked;
};

const CANDIDATE_FIELDS =
  "id, title, slug, thumbnail_url, published_at, category_id, tags";

/** Nombre d'articles récents ramenés pour alimenter le classement. */
const CANDIDATE_POOL_SIZE = 60;

/**
 * Va chercher les candidats publiés puis délègue le classement.
 *
 * Le classement se fait en mémoire parce qu'il mêle des critères (épingles
 * ordonnées, tags partagés) qu'aucun `order` PostgREST ne sait exprimer.
 *
 * Deux requêtes au lieu d'une seule : une épingle peut viser un article plus
 * ancien que le lot des récents, et une épingle ignorée serait un bug silencieux.
 */
export const fetchRelatedPosts = async (
  supabase: SupabaseClient,
  current: RelatedPostsSource,
  limit = 4,
): Promise<RelatedPostCandidate[]> => {
  const now = new Date().toISOString();
  const published = () =>
    supabase
      .from("blog_posts")
      .select(CANDIDATE_FIELDS)
      .eq("status", "published")
      .is("deleted_at", null)
      .lte("published_at", now)
      .neq("id", current.id);

  const pinnedIds = (current.related_post_ids ?? []).filter(
    (id) => id !== current.id,
  );

  const [recentRes, pinnedRes] = await Promise.all([
    published()
      .order("published_at", { ascending: false })
      .limit(CANDIDATE_POOL_SIZE),
    pinnedIds.length > 0
      ? published().in("id", pinnedIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const candidates = new Map<string, RelatedPostCandidate>();
  for (const row of [
    ...((recentRes.data ?? []) as RelatedPostCandidate[]),
    ...((pinnedRes.data ?? []) as RelatedPostCandidate[]),
  ]) {
    candidates.set(row.id, row);
  }

  return resolveRelatedPosts(current, [...candidates.values()], limit);
};

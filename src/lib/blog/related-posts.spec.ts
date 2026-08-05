import { describe, expect, it } from "vitest";
import {
  resolveRelatedPosts,
  type RelatedPostCandidate,
  type RelatedPostsSource,
} from "./related-posts";

const post = (
  id: string,
  overrides: Partial<RelatedPostCandidate> = {},
): RelatedPostCandidate => ({
  id,
  title: `Article ${id}`,
  slug: `article-${id}`,
  thumbnail_url: null,
  published_at: "2026-01-01T00:00:00.000Z",
  category_id: null,
  tags: [],
  ...overrides,
});

const source = (overrides: Partial<RelatedPostsSource> = {}): RelatedPostsSource => ({
  id: "current",
  category_id: null,
  tags: [],
  related_post_ids: [],
  ...overrides,
});

describe("resolveRelatedPosts", () => {
  it("place les articles épinglés en tête, dans l'ordre de saisie", () => {
    const result = resolveRelatedPosts(
      source({ related_post_ids: ["c", "a"] }),
      [post("a"), post("b"), post("c")],
      3,
    );

    expect(result.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  it("ignore une épingle qui ne correspond à aucun candidat publié", () => {
    const result = resolveRelatedPosts(
      source({ related_post_ids: ["brouillon", "a"] }),
      [post("a"), post("b")],
      2,
    );

    expect(result.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("exclut l'article courant, même s'il est épinglé sur lui-même", () => {
    const result = resolveRelatedPosts(
      source({ related_post_ids: ["current"] }),
      [post("current"), post("a")],
      4,
    );

    expect(result.map((p) => p.id)).toEqual(["a"]);
  });

  it("ne répète jamais un article", () => {
    const result = resolveRelatedPosts(
      source({
        related_post_ids: ["a"],
        category_id: "cat",
        tags: ["allaitement"],
      }),
      [post("a", { category_id: "cat", tags: ["allaitement"] }), post("b")],
      4,
    );

    expect(result.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("privilégie la même catégorie avant les tags puis les récents", () => {
    const result = resolveRelatedPosts(
      source({ category_id: "cat", tags: ["nuit"] }),
      [
        post("recent", { published_at: "2026-06-01T00:00:00.000Z" }),
        post("tagged", { tags: ["nuit"], published_at: "2026-02-01T00:00:00.000Z" }),
        post("meme-cat", {
          category_id: "cat",
          published_at: "2025-01-01T00:00:00.000Z",
        }),
      ],
      3,
    );

    expect(result.map((p) => p.id)).toEqual(["meme-cat", "tagged", "recent"]);
  });

  it("classe les tags par nombre de tags partagés", () => {
    const result = resolveRelatedPosts(
      source({ tags: ["nuit", "sevrage"] }),
      [
        post("un-tag", { tags: ["nuit"] }),
        post("deux-tags", { tags: ["nuit", "sevrage"] }),
      ],
      2,
    );

    expect(result.map((p) => p.id)).toEqual(["deux-tags", "un-tag"]);
  });

  it("trie la même catégorie du plus récent au plus ancien", () => {
    const result = resolveRelatedPosts(
      source({ category_id: "cat" }),
      [
        post("ancien", {
          category_id: "cat",
          published_at: "2024-01-01T00:00:00.000Z",
        }),
        post("recent", {
          category_id: "cat",
          published_at: "2026-01-01T00:00:00.000Z",
        }),
      ],
      2,
    );

    expect(result.map((p) => p.id)).toEqual(["recent", "ancien"]);
  });

  it("complète avec les articles récents quand rien ne correspond", () => {
    const result = resolveRelatedPosts(
      source(),
      [
        post("a", { published_at: "2025-01-01T00:00:00.000Z" }),
        post("b", { published_at: "2026-01-01T00:00:00.000Z" }),
      ],
      2,
    );

    expect(result.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("respecte la limite demandée", () => {
    const result = resolveRelatedPosts(
      source({ related_post_ids: ["a", "b", "c"] }),
      [post("a"), post("b"), post("c"), post("d")],
      2,
    );

    expect(result.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("rend une liste vide quand il n'existe aucun autre article", () => {
    expect(resolveRelatedPosts(source(), [post("current")], 4)).toEqual([]);
    expect(resolveRelatedPosts(source(), [post("a")], 0)).toEqual([]);
  });

  it("tolère des tags nuls côté article courant comme côté candidats", () => {
    const result = resolveRelatedPosts(
      source({ tags: null, related_post_ids: null }),
      [post("a", { tags: null })],
      4,
    );

    expect(result.map((p) => p.id)).toEqual(["a"]);
  });
});

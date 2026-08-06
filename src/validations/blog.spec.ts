import { describe, expect, it } from "vitest";
import { blogPostSchema } from "./blog";

const draft = {
  title: "Mon brouillon",
  slug: "mon-brouillon",
  status: "draft" as const,
  tags: [],
};

describe("blogPostSchema", () => {
  it("accepte un brouillon sans image ni catégorie (champs à null)", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      excerpt: "",
      body_html: "",
      thumbnail_url: null,
      og_image_url: null,
      category_id: null,
      consultant_id: null,
      scheduled_at: null,
      meta_title: "",
      meta_description: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.thumbnail_url).toBeUndefined();
      expect(result.data.category_id).toBeNull();
    }
  });

  it("accepte un brouillon dont le contenu est encore vide", () => {
    expect(blogPostSchema.safeParse(draft).success).toBe(true);
  });

  it("refuse une image de couverture qui n'est pas une URL", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      thumbnail_url: "pas-une-url",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("URL valide");
      expect(result.error.issues[0].path[0]).toBe("thumbnail_url");
    }
  });

  it("refuse un extrait de plus de 300 caractères", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      excerpt: "a".repeat(301),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe("excerpt");
    }
  });

  // ─── Fin d'article ────────────────────────────────────────

  const uuid = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;

  it("accepte un article sans rappel, sans sources ni épingle", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      conclusion_title: "",
      conclusion_text: "",
      references_html: "",
      related_post_ids: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conclusion_text).toBeUndefined();
      expect(result.data.references_html).toBeUndefined();
      expect(result.data.related_post_ids).toEqual([]);
    }
  });

  it("normalise des champs de fin d'article à null en absence de valeur", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      conclusion_title: null,
      conclusion_text: null,
      references_html: null,
      related_post_ids: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conclusion_title).toBeUndefined();
      expect(result.data.related_post_ids).toEqual([]);
    }
  });

  it("conserve l'ordre des articles épinglés", () => {
    const ids = [uuid(3), uuid(1), uuid(2)];
    const result = blogPostSchema.safeParse({ ...draft, related_post_ids: ids });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.related_post_ids).toEqual(ids);
  });

  it("refuse plus de 3 articles épinglés", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      related_post_ids: [uuid(1), uuid(2), uuid(3), uuid(4)],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe("related_post_ids");
      expect(result.error.issues[0].message).toContain("3 articles");
    }
  });

  it("refuse un identifiant d'article épinglé qui n'est pas un UUID", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      related_post_ids: ["mon-slug"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("invalide");
    }
  });

  it("refuse deux fois le même article épinglé", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      related_post_ids: [uuid(1), uuid(1)],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("deux fois");
    }
  });

  it("accepte une date de publication dans le passé", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      status: "published" as const,
      published_at: "2024-07-07T17:53:19.354Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.published_at).toBe("2024-07-07T17:53:19.354Z");
    }
  });

  it("normalise une date de publication vide en null", () => {
    const result = blogPostSchema.safeParse({ ...draft, published_at: "" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.published_at).toBeNull();
    }
  });

  it("refuse une date de publication illisible", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      published_at: "hier",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe("published_at");
    }
  });

  it("refuse un titre d'encadré trop long", () => {
    const result = blogPostSchema.safeParse({
      ...draft,
      conclusion_title: "a".repeat(121),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe("conclusion_title");
    }
  });
});

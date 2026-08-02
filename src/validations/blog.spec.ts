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
});

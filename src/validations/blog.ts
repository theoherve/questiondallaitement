import { z } from "zod/v4";

// ─── Blog Category ──────────────────────────────────────────

export const blogCategorySchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  slug: z
    .string()
    .min(2)
    .regex(
      /^[a-z0-9-]+$/,
      "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets",
    ),
  description: z.string().optional(),
  position: z.number().int().min(0).default(0),
});

export type BlogCategoryInput = z.infer<typeof blogCategorySchema>;

// ─── Blog Post ──────────────────────────────────────────────

export const blogPostSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  slug: z
    .string()
    .min(3)
    .regex(
      /^[a-z0-9-]+$/,
      "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets",
    ),
  excerpt: z.string().max(300, "Maximum 300 caractères").optional(),
  body_html: z.string().min(1, "Le contenu est requis"),
  thumbnail_url: z.string().url().optional().or(z.literal("")),
  category_id: z.string().uuid().optional().nullable(),
  consultant_id: z.string().uuid().optional().nullable(),
  status: z
    .enum(["draft", "scheduled", "published", "archived"])
    .default("draft"),
  meta_title: z
    .string()
    .max(70, "Maximum 70 caractères pour le SEO")
    .optional(),
  meta_description: z
    .string()
    .max(160, "Maximum 160 caractères pour le SEO")
    .optional(),
  og_image_url: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  scheduled_at: z.string().datetime().optional().nullable(),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;

// ─── Blog Post Update ───────────────────────────────────────

export const blogPostUpdateSchema = blogPostSchema.partial().extend({
  id: z.string().uuid(),
});

export type BlogPostUpdateInput = z.infer<typeof blogPostUpdateSchema>;

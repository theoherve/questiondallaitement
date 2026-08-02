import { z } from "zod/v4";

// ─── Blog Category ──────────────────────────────────────────

/**
 * Champ texte facultatif tolérant : le formulaire envoie « » quand il est vide,
 * et la base peut renvoyer `null`. Les deux sont normalisés en `undefined` pour
 * qu'un champ laissé vide ne fasse jamais échouer un enregistrement.
 */
const optionalText = z
  .union([z.string(), z.null()])
  .transform((v) => (v ? v : undefined))
  .optional();

/** Idem, mais le contenu — quand il y en a un — doit être une URL. */
const optionalUrl = (message: string) =>
  z
    .union([z.string(), z.null()])
    .transform((v) => (v ? v : undefined))
    .optional()
    .refine((v) => v === undefined || z.string().url().safeParse(v).success, {
      message,
    });

export const blogCategorySchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  slug: z
    .string()
    .min(2, "Le slug doit contenir au moins 2 caractères")
    .regex(
      /^[a-z0-9-]+$/,
      "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets",
    ),
  description: optionalText,
  position: z.number().int().min(0).default(0),
});

export type BlogCategoryInput = z.infer<typeof blogCategorySchema>;

// ─── Blog Post ──────────────────────────────────────────────

export const blogPostSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  slug: z
    .string()
    .min(3, "Le slug doit contenir au moins 3 caractères")
    .regex(
      /^[a-z0-9-]+$/,
      "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets",
    ),
  excerpt: z
    .union([z.string(), z.null()])
    .transform((v) => (v ? v : undefined))
    .optional()
    .refine((v) => v === undefined || v.length <= 300, {
      message: "L'extrait ne peut pas dépasser 300 caractères",
    }),
  // Un brouillon peut être enregistré sans contenu : on ne bloque la
  // rédactrice que sur ce qui empêche vraiment de sauvegarder.
  body_html: optionalText,
  thumbnail_url: optionalUrl(
    "L'image de couverture doit être une URL valide (https://…)",
  ),
  category_id: z
    .union([z.string(), z.null()])
    .transform((v) => (v ? v : null))
    .optional()
    .refine((v) => !v || z.string().uuid().safeParse(v).success, {
      message: "Catégorie invalide",
    }),
  consultant_id: z
    .union([z.string(), z.null()])
    .transform((v) => (v ? v : null))
    .optional()
    .refine((v) => !v || z.string().uuid().safeParse(v).success, {
      message: "Consultante invalide",
    }),
  status: z
    .enum(["draft", "scheduled", "published", "archived"], {
      message: "Statut inconnu",
    })
    .default("draft"),
  meta_title: z
    .union([z.string(), z.null()])
    .transform((v) => (v ? v : undefined))
    .optional()
    .refine((v) => v === undefined || v.length <= 70, {
      message: "Le titre SEO ne peut pas dépasser 70 caractères",
    }),
  meta_description: z
    .union([z.string(), z.null()])
    .transform((v) => (v ? v : undefined))
    .optional()
    .refine((v) => v === undefined || v.length <= 160, {
      message: "La description SEO ne peut pas dépasser 160 caractères",
    }),
  og_image_url: optionalUrl(
    "L'image Open Graph doit être une URL valide (https://…)",
  ),
  tags: z.array(z.string()).default([]),
  scheduled_at: z
    .union([z.string(), z.null()])
    .transform((v) => (v ? v : null))
    .optional()
    .refine(
      (v) => !v || !Number.isNaN(Date.parse(v)),
      { message: "Date de publication invalide" },
    ),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;

// ─── Blog Post Update ───────────────────────────────────────

export const blogPostUpdateSchema = blogPostSchema.partial().extend({
  id: z.string().uuid(),
});

export type BlogPostUpdateInput = z.infer<typeof blogPostUpdateSchema>;

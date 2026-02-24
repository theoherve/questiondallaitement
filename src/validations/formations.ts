import { z } from "zod/v4";

export const formationSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets"),
  description: z.string().optional(),
  short_description: z.string().max(200, "Max 200 caractères").optional(),
  long_description_html: z.string().optional(),
  thumbnail_url: z.string().url().optional().or(z.literal("")),
  price_cents: z.number().int().min(0, "Le prix ne peut pas être négatif"),
  currency: z.string().default("eur"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  consultant_id: z.string().uuid("Consultante requise").optional(),
});

export const sectionSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  position: z.number().int().min(0),
});

export const textBlockSchema = z.object({
  html: z.string().min(1),
});

export const videoBlockSchema = z.object({
  provider: z.enum(["vimeo", "youtube"]),
  video_id: z.string().min(1),
  title: z.string().min(1),
});

export const imageBlockSchema = z.object({
  url: z.string().url(),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

export const quizBlockSchema = z.object({
  question: z.string().min(1),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        is_correct: z.boolean(),
      })
    )
    .min(2, "Au moins 2 options requises"),
  explanation: z.string(),
});

export const downloadBlockSchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1),
  size_bytes: z.number().int().min(0),
});

export const blockSchema = z.object({
  type: z.enum(["text", "video", "image", "quiz", "download"]),
  content: z.union([
    textBlockSchema,
    videoBlockSchema,
    imageBlockSchema,
    quizBlockSchema,
    downloadBlockSchema,
  ]),
  position: z.number().int().min(0),
});

export type FormationInput = z.infer<typeof formationSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type BlockInput = z.infer<typeof blockSchema>;

import { z } from "zod/v4";
import { FORMATION_CATEGORIES } from "@/config/formation-categories";

// ─── Fiche de formation partagée ────────────────────────────────

/**
 * Une fiche porte le contenu editorial d'une formation, independamment des
 * dates auxquelles elle se tient. Elle n'a donc ni horaire, ni tarif, ni
 * places : ces informations restent sur chaque session.
 */
export const formationTemplateSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  slug: z
    .string()
    .min(3)
    .regex(
      /^[a-z0-9-]+$/,
      "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets",
    ),
  summary_html: z.string().optional().nullable(),
  objectives_html: z.string().optional().nullable(),
  program_html: z.string().optional().nullable(),
  audience_html: z.string().optional().nullable(),
  external_url: z
    .url("Le lien externe doit être une URL valide")
    .optional()
    .nullable(),
  badge: z.string().trim().optional().nullable(),
  category: z.enum(FORMATION_CATEGORIES).default("formation"),
});

export type FormationTemplateInput = z.infer<typeof formationTemplateSchema>;

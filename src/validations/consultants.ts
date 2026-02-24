import { z } from "zod/v4";

export const promoteToConsultantSchema = z.object({
  user_id: z.string().uuid("Utilisateur requis"),
  slug: z
    .string()
    .min(3, "Le slug doit contenir au moins 3 caractères")
    .regex(
      /^[a-z0-9-]+$/,
      "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets"
    ),
  bio: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  commission_rate: z
    .number()
    .min(0, "La commission ne peut pas être négative")
    .max(100, "La commission ne peut pas dépasser 100%")
    .default(15),
});

export const updateConsultantSchema = z.object({
  bio: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  commission_rate: z
    .number()
    .min(0, "La commission ne peut pas être négative")
    .max(100, "La commission ne peut pas dépasser 100%"),
  is_active: z.boolean().optional(),
  slug: z
    .string()
    .min(3, "Le slug doit contenir au moins 3 caractères")
    .regex(
      /^[a-z0-9-]+$/,
      "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets"
    )
    .optional(),
});

export type PromoteToConsultantInput = z.infer<typeof promoteToConsultantSchema>;
export type UpdateConsultantInput = z.infer<typeof updateConsultantSchema>;

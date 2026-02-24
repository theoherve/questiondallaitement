import { z } from "zod/v4";

export const platformSettingsSchema = z.object({
  default_commission_rate: z
    .number()
    .min(0, "La commission ne peut pas être négative")
    .max(100, "La commission ne peut pas dépasser 100%"),
  cancellation_threshold_hours: z
    .number()
    .int("Doit être un nombre entier")
    .min(0, "Le seuil ne peut pas être négatif"),
  cancellation_penalty_rate: z
    .number()
    .min(0, "Le taux ne peut pas être négatif")
    .max(1, "Le taux ne peut pas dépasser 1 (100%)"),
  platform_name: z.string().min(1, "Le nom est requis"),
  maintenance_mode: z.boolean(),
});

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;

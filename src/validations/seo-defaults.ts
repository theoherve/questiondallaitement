import { z } from "zod/v4";

export const seoDefaultsSchema = z.object({
  contact_email: z.string().trim().email("Adresse email invalide"),
});

export type SeoDefaultsInput = z.infer<typeof seoDefaultsSchema>;

import { z } from "zod/v4";

const optionalUrl = z
  .union([z.string().trim().url("Lien invalide"), z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null);

export const socialLinksSchema = z.object({
  instagram_url: optionalUrl,
  tiktok_url: optionalUrl,
  linkedin_url: optionalUrl,
});

export type SocialLinksInput = z.infer<typeof socialLinksSchema>;

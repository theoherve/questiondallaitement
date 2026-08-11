import { z } from "zod/v4";

export const announcementBannerSchema = z
  .object({
    enabled: z.boolean(),
    message: z.string(),
    link_url: z.union([z.literal(""), z.string().url("Lien invalide")]).nullable(),
    link_label: z.string(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
  })
  .refine((data) => !data.enabled || data.message.trim().length > 0, {
    message: "Le message est requis quand le bandeau est actif",
    path: ["message"],
  })
  .refine(
    (data) =>
      !data.start_date || !data.end_date || data.end_date >= data.start_date,
    {
      message: "La date de fin doit être après la date de début",
      path: ["end_date"],
    },
  );

export type AnnouncementBannerInput = z.infer<typeof announcementBannerSchema>;

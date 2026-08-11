import { z } from "zod/v4";

export const emailSenderSchema = z.object({
  from_address: z.string().trim().email("Adresse email invalide"),
  from_name: z.string().trim().min(1, "Le nom est requis").max(120, "120 caractères maximum"),
});

export type EmailSenderInput = z.infer<typeof emailSenderSchema>;

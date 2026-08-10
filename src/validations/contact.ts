import { z } from "zod/v4";

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "Merci d'indiquer votre nom"),
  email: z.email("Merci d'indiquer un email valide"),
  subject: z.string().trim().min(1, "Merci d'indiquer un sujet"),
  message: z.string().trim().min(1, "Merci d'indiquer votre message"),

  /**
   * Piege a robots, meme pattern que newsletterSignupSchema
   * (src/validations/newsletter.ts) : champ cache a l'ecran, remplissable par
   * un script. Optionnel — un humain le laisse vide.
   */
  website: z.string().optional(),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

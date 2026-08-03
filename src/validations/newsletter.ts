import { z } from "zod/v4";
import { NEWSLETTER_SOURCES } from "@/config/newsletter";

export const newsletterSignupSchema = z.object({
  first_name: z.string().trim().min(1, "Merci d'indiquer votre prénom"),
  email: z.email("Merci d'indiquer un email valide"),
  consent: z.literal(true, {
    error: "Merci de cocher la case pour continuer",
  }),
  source: z.enum(NEWSLETTER_SOURCES),

  /**
   * Piege a robots. Le champ est cache a l'ecran mais reste dans le DOM et
   * remplissable par un script : une valeur non vide trahit une soumission
   * automatisee. Optionnel plutot que requis — un humain le laisse vide, et le
   * navigateur peut ne pas l'envoyer du tout.
   */
  website: z.string().optional(),
});

export type NewsletterSignupInput = z.infer<typeof newsletterSignupSchema>;

import { z } from "zod/v4";

/**
 * Identite visuelle appliquee aux emails : logo en en-tete, pied de page, et
 * banniere prete a inserer dans l'editeur de blocs.
 *
 * Les URL pointent vers le bucket public `mails`. Le SVG est refuse : Gmail,
 * Outlook et Yahoo ne le rendent pas — un logo SVG donnerait un email sans
 * logo chez la majorite des destinataires.
 */

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const hexColor = (message: string) =>
  z.string().regex(HEX, message);

const imageUrl = z
  .string()
  .trim()
  .url("URL d'image invalide")
  .refine((u) => !/\.svg(\?|#|$)/i.test(u), {
    message:
      "Le format SVG n'est pas affiche par Gmail et Outlook — utilisez PNG, JPG ou WebP",
  });

/** Champ image optionnel : chaine vide du formulaire → null. */
const optionalImageUrl = z
  .union([imageUrl, z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null);

const optionalUrl = z
  .union([z.string().trim().url("Lien invalide"), z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .default(null);

export const emailBrandingSchema = z.object({
  // ─── En-tete (injecte automatiquement dans tous les envois) ───
  header_enabled: z.boolean().default(true),
  logo_url: optionalImageUrl,
  logo_alt: z
    .string()
    .trim()
    .max(120, "120 caracteres maximum")
    .default("Question d'Allaitement"),
  /** Largeur d'affichage en px — au-dela de 300px le logo casse la mise en page mobile. */
  logo_width: z
    .number()
    .int("Nombre entier attendu")
    .min(60, "60 px minimum")
    .max(300, "300 px maximum")
    .default(160),
  header_background: hexColor("Couleur hexadecimale attendue (ex : #fff8f6)").default(
    "#fff8f6",
  ),
  /** Logo cliquable — vide = logo non cliquable. */
  header_link_url: optionalUrl,

  // ─── Pied de page (injecte automatiquement) ───
  footer_enabled: z.boolean().default(true),
  footer_text: z
    .string()
    .trim()
    .max(500, "500 caracteres maximum")
    .default(
      "Question d'Allaitement — accompagnement en lactation par des consultantes IBCLC.",
    ),

  // ─── Banniere pre-definie (bloc insere a la demande) ───
  banner_image_url: optionalImageUrl,
  banner_alt: z.string().trim().max(160, "160 caracteres maximum").default(""),
  banner_title: z.string().trim().max(120, "120 caracteres maximum").default(""),
  banner_text: z.string().trim().max(400, "400 caracteres maximum").default(""),
  banner_cta_label: z.string().trim().max(60, "60 caracteres maximum").default(""),
  banner_cta_url: optionalUrl,
  banner_background: hexColor("Couleur hexadecimale attendue (ex : #f5ebe8)").default(
    "#f5ebe8",
  ),
});

export type EmailBrandingInput = z.infer<typeof emailBrandingSchema>;

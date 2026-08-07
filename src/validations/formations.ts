import { z } from "zod/v4";

// ─── Formation ──────────────────────────────────────────────────

export const formationSchema = z
  .object({
    title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
    slug: z
      .string()
      .min(3)
      .regex(
        /^[a-z0-9-]+$/,
        "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets",
      ),
    description: z.string().optional().nullable(),
    summary_html: z.string().optional().nullable(),
    objectives_html: z.string().optional().nullable(),
    program_html: z.string().optional().nullable(),
    audience_html: z.string().optional().nullable(),
    // Cles du catalogue des reperes. Le filtrage sur le catalogue se fait a
    // l'ecriture (`filterFormationHighlightKeys`) : une cle devenue obsolete doit
    // etre ignoree, pas faire echouer l'enregistrement de toute la formation.
    highlights: z.array(z.string()).optional(),
    thumbnail_url: z
      .url("L'image de couverture doit être une URL valide")
      .optional()
      .nullable(),
    type: z.enum(["online", "in_person", "hybrid"]),
    starts_at: z.string().min(1, "La date de début est requise"),
    ends_at: z.string().min(1, "La date de fin est requise"),
    // L'heure est facultative (webinaires, e-learning). Quand elle n'est pas
    // saisie, starts_at/ends_at couvrent la journee entiere et ce drapeau
    // empeche d'afficher un horaire qui n'a pas ete choisi.
    show_time: z.boolean().default(true),
    location: z.string().optional().nullable(),
    max_participants: z.number().int().min(1).optional().nullable(),
    price_cents: z.number().int().min(0, "Le prix ne peut pas être négatif"),
    discounted_price_cents: z
      .number()
      .int()
      .min(0, "Le prix remisé ne peut pas être négatif")
      .optional()
      .nullable(),
    currency: z.string().default("eur"),
    show_price: z.boolean().default(true),
    provider_id: z.string().uuid().optional().nullable(),
    external_url: z
      .url("Le lien externe doit être une URL valide")
      .optional()
      .nullable(),
    consultant_id: z.string().uuid("Consultante requise"),
    is_published: z.boolean().default(false),
  })
  .refine(
    (data) =>
      data.discounted_price_cents == null ||
      data.discounted_price_cents < data.price_cents,
    {
      message: "Le prix remisé doit être inférieur au prix plein",
      path: ["discounted_price_cents"],
    },
  )
  .refine(
    (data) => {
      const start = new Date(data.starts_at);
      const end = new Date(data.ends_at);
      // Sans heure saisie, les deux bornes encadrent des journees entieres :
      // une formation d'un seul jour est legitime, seul un retour en arriere
      // est une erreur.
      return data.show_time ? start < end : end >= start;
    },
    {
      message: "La date de fin doit être après la date de début",
      path: ["ends_at"],
    },
  );

export type FormationInput = z.infer<typeof formationSchema>;

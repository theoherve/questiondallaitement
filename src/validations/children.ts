import { z } from "zod/v4";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Vérifie que la chaîne est bien une date calendaire réelle au format AAAA-MM-JJ. */
export const isRealCalendarDate = (value: string): boolean => {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Rejette les dates « débordantes » type 2025-02-31 que Date normalise.
  return parsed.toISOString().slice(0, 10) === value;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Une date de naissance ou de pesée ne peut pas être postérieure à aujourd'hui.
 * Tolérance d'un jour pour absorber le décalage entre minuit UTC (interprétation
 * de la date saisie) et l'heure locale française. */
export const isNotInFuture = (value: string): boolean => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() <= Date.now() + ONE_DAY_MS;
};

export const childSchema = z
  .object({
    first_name: z.string().min(1, "Le prénom est requis").max(80, "Maximum 80 caractères"),
    birth_date: z
      .string()
      .min(1, "La date de naissance est requise")
      .refine(isRealCalendarDate, "Date de naissance invalide")
      .refine(
        isNotInFuture,
        "La date de naissance ne peut pas être dans le futur",
      ),
    sex: z.enum(["female", "male"], { message: "Le sexe est requis" }),
    is_premature: z.boolean(),
    gestational_age_weeks: z
      .number()
      .min(1, "Nombre de semaines invalide")
      .max(44, "Nombre de semaines invalide")
      .optional()
      .nullable(),
    birth_weight_grams: z
      .number()
      .min(1, "Poids de naissance invalide")
      .max(9999, "Poids de naissance invalide")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => !data.is_premature || data.gestational_age_weeks != null,
    {
      message: "L'âge gestationnel est requis pour un enfant né prématurément",
      path: ["gestational_age_weeks"],
    },
  );

export type ChildInput = z.infer<typeof childSchema>;

export const weightMeasurementSchema = z.object({
  child_id: z.string().uuid("Enfant requis"),
  weight_grams: z
    .number()
    .min(1, "Le poids doit être positif")
    .lt(50000, "Poids incohérent"),
  measured_at: z
    .string()
    .min(1, "La date de la pesée est requise")
    .refine(isRealCalendarDate, "Date de pesée invalide")
    .refine(isNotInFuture, "La date de la pesée ne peut pas être dans le futur"),
  source: z.enum(["home", "consultation"]),
});

export type WeightMeasurementInput = z.infer<typeof weightMeasurementSchema>;

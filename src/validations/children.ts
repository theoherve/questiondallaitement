import { z } from "zod/v4";

export const childSchema = z
  .object({
    first_name: z.string().min(1, "Le prénom est requis").max(80, "Maximum 80 caractères"),
    birth_date: z.string().min(1, "La date de naissance est requise"),
    sex: z.enum(["female", "male"], { message: "Le sexe est requis" }),
    is_premature: z.boolean(),
    gestational_age_weeks: z
      .number()
      .min(1, "Nombre de semaines invalide")
      .max(44, "Nombre de semaines invalide")
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
    .max(50000, "Poids incohérent"),
  measured_at: z.string().min(1, "La date de la pesée est requise"),
  source: z.enum(["home", "consultation"]),
});

export type WeightMeasurementInput = z.infer<typeof weightMeasurementSchema>;

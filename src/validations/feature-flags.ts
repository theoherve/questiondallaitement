import { z } from "zod/v4";

export const featureFlagsSchema = z.object({
  booking_enabled: z.boolean(),
});

export type FeatureFlagsInput = z.infer<typeof featureFlagsSchema>;

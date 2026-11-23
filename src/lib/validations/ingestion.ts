import { z } from "zod";

export const ingestionRequestSchema = z
  .object({
    periods: z
      .array(z.string().regex(/^\d{4}$/, "Periods must be four-digit years"))
      .min(1)
      .max(5)
      .optional(),
  })
  .strict();

export type IngestionRequest = z.infer<typeof ingestionRequestSchema>;

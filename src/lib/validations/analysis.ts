import { z } from "zod";

export const analysisRequestSchema = z.object({
  period: z.string().regex(/^20\d{2}$/).optional(),
}).strict();

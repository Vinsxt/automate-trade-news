import { z } from "zod";

import { PILOT_QUERY } from "@/lib/trade/pilot";

const selectionFields = {
  product: z.literal(PILOT_QUERY.cmdCode).optional(),
  market: z.literal(String(PILOT_QUERY.reporterCode)).optional(),
  from: z.enum(PILOT_QUERY.periods).optional(),
  to: z.enum(PILOT_QUERY.periods).optional(),
};

export const tradeSelectionSchema = z.object(selectionFields).strict().refine(
  ({ from, to }) => !from || !to || from <= to,
  { message: "Start year must be on or before the end year", path: ["to"] },
);

export type TradeSelection = z.infer<typeof tradeSelectionSchema>;

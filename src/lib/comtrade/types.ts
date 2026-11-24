import { z } from "zod";

const nullableNumber = z.number().nullable().optional();
const nullableString = z.string().nullable().optional();

export const comtradeRecordSchema = z
  .object({
    typeCode: z.string(),
    freqCode: z.string(),
    refPeriodId: z.number().nullable().optional(),
    refYear: z.number(),
    period: z.string(),
    reporterCode: z.number(),
    reporterISO: nullableString,
    reporterDesc: nullableString,
    flowCode: z.string(),
    flowDesc: nullableString,
    partnerCode: z.number(),
    partnerISO: nullableString,
    partnerDesc: nullableString,
    partner2Code: z.number(),
    partner2ISO: nullableString,
    partner2Desc: nullableString,
    classificationCode: z.string(),
    classificationSearchCode: z.string(),
    isOriginalClassification: z.boolean(),
    cmdCode: z.string(),
    cmdDesc: nullableString,
    customsCode: z.string(),
    mosCode: z.string(),
    motCode: z.number(),
    qtyUnitCode: z.number().nullable().optional(),
    qtyUnitAbbr: nullableString,
    qty: nullableNumber,
    isQtyEstimated: z.boolean().optional(),
    altQtyUnitCode: z.number().nullable().optional(),
    altQtyUnitAbbr: nullableString,
    altQty: nullableNumber,
    isAltQtyEstimated: z.boolean().optional(),
    netWgt: nullableNumber,
    isNetWgtEstimated: z.boolean().optional(),
    grossWgt: nullableNumber,
    isGrossWgtEstimated: z.boolean().optional(),
    cifvalue: nullableNumber,
    fobvalue: nullableNumber,
    primaryValue: nullableNumber,
    legacyEstimationFlag: z.number().nullable().optional(),
    isReported: z.boolean(),
    isAggregate: z.boolean(),
  })
  .passthrough();

export const comtradeResponseSchema = z.object({
  elapsedTime: z.string().optional(),
  count: z.number(),
  data: z.array(comtradeRecordSchema),
  error: z.string().nullish(),
});

export type ComtradeRecord = z.infer<typeof comtradeRecordSchema>;
export type ComtradeResponse = z.infer<typeof comtradeResponseSchema>;

export interface TradeObservation {
  observationKey: string;
  source: "UN_COMTRADE";
  typeCode: string;
  frequencyCode: string;
  refPeriodId: number | null;
  period: string;
  reporterCode: number;
  reporterIso: string | null;
  partnerCode: number;
  partnerIso: string | null;
  partner2Code: number;
  flowCode: string;
  classificationCode: string;
  classificationSearchCode: string;
  isOriginalClassification: boolean;
  productCode: string;
  customsCode: string;
  modeOfTransportCode: string;
  modeOfTransport: number;
  quantityUnitCode: number | null;
  quantity: number | null;
  altQuantityUnitCode: number | null;
  altQuantity: number | null;
  netWeight: number | null;
  grossWeight: number | null;
  cifValue: number | null;
  fobValue: number | null;
  primaryValue: number | null;
  legacyEstimationFlag: number | null;
  isQtyEstimated: boolean | null;
  isAltQtyEstimated: boolean | null;
  isNetWgtEstimated: boolean | null;
  isGrossWgtEstimated: boolean | null;
  isReported: boolean;
  isAggregate: boolean;
  rawRecord: Record<string, unknown>;
}

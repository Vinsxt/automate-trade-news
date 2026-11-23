import type { ComtradeRecord, ComtradeResponse, TradeObservation } from "./types";
import { comtradeResponseSchema } from "./types";

export const PILOT_QUERY = {
  reporterCode: 699,
  reporterName: "India",
  cmdCode: "854142",
  productName: "Photovoltaic cells not assembled in modules or made up into panels",
  flowCode: "M",
  classificationSearchCode: "HS",
  periods: ["2021", "2022", "2023", "2024", "2025"],
} as const;

export function buildObservationKey(record: ComtradeRecord): string {
  return [
    record.typeCode,
    record.freqCode,
    record.classificationSearchCode,
    record.classificationCode,
    record.reporterCode,
    record.partnerCode,
    record.partner2Code,
    record.flowCode,
    record.period,
    record.cmdCode,
    record.customsCode,
    record.mosCode,
    record.motCode,
  ].join(":");
}

export function normalizeComtradeRecord(record: ComtradeRecord): TradeObservation {
  return {
    observationKey: buildObservationKey(record),
    source: "UN_COMTRADE",
    typeCode: record.typeCode,
    frequencyCode: record.freqCode,
    refPeriodId: record.refPeriodId ?? null,
    period: record.period,
    reporterCode: record.reporterCode,
    reporterIso: record.reporterISO ?? null,
    partnerCode: record.partnerCode,
    partnerIso: record.partnerISO ?? null,
    partner2Code: record.partner2Code,
    flowCode: record.flowCode,
    classificationCode: record.classificationCode,
    classificationSearchCode: record.classificationSearchCode,
    isOriginalClassification: record.isOriginalClassification,
    productCode: record.cmdCode,
    customsCode: record.customsCode,
    modeOfTransportCode: record.mosCode,
    modeOfTransport: record.motCode,
    quantityUnitCode: record.qtyUnitCode ?? null,
    quantity: record.qty ?? null,
    altQuantityUnitCode: record.altQtyUnitCode ?? null,
    altQuantity: record.altQty ?? null,
    netWeight: record.netWgt ?? null,
    grossWeight: record.grossWgt ?? null,
    cifValue: record.cifvalue ?? null,
    fobValue: record.fobvalue ?? null,
    primaryValue: record.primaryValue ?? null,
    legacyEstimationFlag: record.legacyEstimationFlag ?? null,
    isQtyEstimated: record.isQtyEstimated ?? null,
    isAltQtyEstimated: record.isAltQtyEstimated ?? null,
    isNetWgtEstimated: record.isNetWgtEstimated ?? null,
    isGrossWgtEstimated: record.isGrossWgtEstimated ?? null,
    isReported: record.isReported,
    isAggregate: record.isAggregate,
    rawRecord: { ...record },
  };
}

export function normalizeComtradeResponse(input: unknown): TradeObservation[] {
  const response: ComtradeResponse = comtradeResponseSchema.parse(input);
  return response.data.map(normalizeComtradeRecord);
}

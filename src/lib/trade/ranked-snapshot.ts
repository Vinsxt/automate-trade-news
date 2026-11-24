import { createHash } from "node:crypto";
import { calculateTradeSummary, type TradeObservationRow } from "../analytics/trade";
import { rankOpportunities } from "../analytics/opportunity";
import { COHORT_PERIODS, MARKETS, PRODUCTS, REFERENCE_YEAR } from "./cohort";
import type { PublishedPilotDashboard } from "./dashboard";

export type RankedObservation = Required<TradeObservationRow> & {
  observation_key: string;
  ingestion_run_id: string;
  classification_code: string;
  is_original_classification: boolean;
};

export interface CompletedSlice {
  reporter: number;
  period: string;
  runId: string;
  observations: RankedObservation[];
}

export function buildRankedSnapshot(hs6: string, slices: CompletedSlice[]) {
  if (!Object.hasOwn(PRODUCTS, hs6)) throw new Error("Unsupported cohort product");
  const reporters = Object.keys(MARKETS).map(Number);
  const bySlice = new Map(slices.map(slice => [`${slice.reporter}:${slice.period}`, slice]));
  const ordered = reporters.flatMap(reporter => COHORT_PERIODS.map(period => {
    const slice = bySlice.get(`${reporter}:${period}`);
    if (!slice || slice.observations.some(row => row.period !== period || row.ingestion_run_id !== slice.runId)) {
      throw new Error(`Incomplete cohort for reporter ${reporter}, year ${period}`);
    }
    return { ...slice, observations: slice.observations.toSorted((a, b) => a.observation_key.localeCompare(b.observation_key)) };
  }));
  if (ordered.length !== slices.length || bySlice.size !== slices.length) throw new Error("Unexpected or duplicate cohort slices");

  const details: Record<string, PublishedPilotDashboard> = {};
  const candidates = reporters.map(reporter => {
    const rows = ordered.filter(slice => slice.reporter === reporter).flatMap(slice => slice.observations);
    const comparable = rows.filter(row => row.classification_code === "H6" && row.is_original_classification);
    const { imports, supplierYears, movements } = calculateTradeSummary(comparable);
    const coverage: PublishedPilotDashboard["coverage"] = {};
    for (const row of comparable) {
      const period = coverage[row.period] ??= { observationCount: 0, notReported: 0, aggregate: 0 };
      period.observationCount++;
      if (!row.is_reported) period.notReported++;
      if (row.is_aggregate) period.aggregate++;
    }
    details[reporter] = { imports, supplierYears: Object.fromEntries(supplierYears), movements: Object.fromEntries(movements), coverage };
    return {
      reporter, hs6, edition: "H6",
      observations: rows.map(row => ({
        year: Number(row.period), partner: row.partner_code, edition: row.classification_code,
        comparable: row.is_original_classification,
        value: row.primary_value == null || String(row.primary_value).trim() === "" ? null : Number(row.primary_value),
      })),
    };
  });

  const rankings = rankOpportunities(candidates, REFERENCE_YEAR).map(result => {
    const suppliers = details[result.reporter].supplierYears[String(REFERENCE_YEAR)] ?? [];
    const indonesia = suppliers.find(supplier => supplier.partnerCode === 360);
    const hasWeightComparison = indonesia?.unitValueUsdPerKg != null &&
      suppliers.some(supplier => supplier.indonesiaUnitValueGapPct != null && supplier.partnerIso);
    return { ...result, hasWeightComparison, marketName: MARKETS[result.reporter] };
  });
  const ranking = { hs6, productName: PRODUCTS[hs6], referenceYear: REFERENCE_YEAR, rankings };
  const inputs = { slices: ordered };
  const id = createHash("sha256").update(JSON.stringify({ ranking, details, inputs })).digest("hex");
  return { id, ranking, details, inputs };
}

export type RankedRelease = ReturnType<typeof buildRankedSnapshot>["ranking"];

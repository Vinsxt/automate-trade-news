import { calculateTradeSummary, type TradeObservationRow } from "@/lib/analytics/trade";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PILOT_QUERY } from "@/lib/trade/pilot";
import type { TradeSelection } from "@/lib/validations/trade-selection";

export async function getPilotDashboardData(selection: TradeSelection = {}) {
  const supabase = createSupabaseAdminClient();
  const [observationsResult, runResult] = await Promise.all([
    supabase
      .from("trade_observations")
      .select("period,partner_code,partner_iso,primary_value,net_weight,is_reported,is_aggregate", { count: "exact" })
      .eq("reporter_code", Number(selection.market ?? PILOT_QUERY.reporterCode))
      .eq("type_code", "C")
      .eq("frequency_code", "A")
      .eq("flow_code", PILOT_QUERY.flowCode)
      .eq("product_code", selection.product ?? PILOT_QUERY.cmdCode)
      .eq("classification_code", PILOT_QUERY.classificationCode)
      .eq("classification_search_code", PILOT_QUERY.classificationSearchCode)
      .eq("partner2_code", 0)
      .eq("customs_code", "C00")
      .eq("mode_of_transport_code", "0")
      .eq("mode_of_transport", 0)
      .in("period", [...PILOT_QUERY.periods])
      .order("period"),
    supabase
      .from("ingestion_runs")
      .select("status,completed_at,records_received,records_written")
      .eq("source", "UN_COMTRADE")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (observationsResult.error || runResult.error) {
    throw new Error("Could not load trade dashboard data");
  }

  const observations = (observationsResult.data ?? []) as TradeObservationRow[];
  if (observationsResult.count !== observations.length) {
    throw new Error("Trade dashboard data exceeded the query limit");
  }

  const includesPeriod = (period: string) =>
    (!selection.from || period >= selection.from) && (!selection.to || period <= selection.to);
  const selectedObservations = observations.filter(({ period }) => includesPeriod(period));
  const summary = calculateTradeSummary(observations);
  const imports = summary.imports.filter(({ period }) => includesPeriod(period));
  const latestPeriod = imports.at(-1)?.period ?? null;
  const sourceFlags = {
    notReported: selectedObservations.filter((row) => row.is_reported === false).length,
    aggregate: selectedObservations.filter((row) => row.is_aggregate === true).length,
  };

  return {
    imports,
    availablePeriods: summary.imports.map(({ period }) => period),
    supplierYears: Object.fromEntries([...summary.supplierYears].filter(([period]) => includesPeriod(period))),
    movements: latestPeriod ? summary.movements.get(latestPeriod) ?? [] : [],
    latestPeriod,
    latestSuppliers: latestPeriod ? summary.supplierYears.get(latestPeriod) ?? [] : [],
    sourceFlags,
    lastRun: runResult.data,
    observationCount: selectedObservations.length,
  };
}

export type PilotDashboardData = Awaited<ReturnType<typeof getPilotDashboardData>>;

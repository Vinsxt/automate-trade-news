import { calculateTradeSummary, type TradeObservationRow } from "@/lib/analytics/trade";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PILOT_QUERY } from "@/lib/comtrade/normalize";

export async function getPilotDashboardData() {
  const supabase = createSupabaseAdminClient();
  const [observationsResult, runResult] = await Promise.all([
    supabase
      .from("trade_observations")
      .select("period,partner_code,partner_iso,primary_value,is_reported,is_aggregate")
      .eq("reporter_code", PILOT_QUERY.reporterCode)
      .eq("flow_code", PILOT_QUERY.flowCode)
      .eq("product_code", PILOT_QUERY.cmdCode)
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
  const summary = calculateTradeSummary(observations);
  const latestPeriod = summary.imports.at(-1)?.period ?? null;
  const sourceFlags = {
    notReported: observations.filter((row) => row.is_reported === false).length,
    aggregate: observations.filter((row) => row.is_aggregate === true).length,
  };

  return {
    ...summary,
    supplierYears: Object.fromEntries(summary.supplierYears),
    latestPeriod,
    latestSuppliers: latestPeriod ? summary.supplierYears.get(latestPeriod) ?? [] : [],
    sourceFlags,
    lastRun: runResult.data,
    observationCount: observations.length,
  };
}

export type PilotDashboardData = Awaited<ReturnType<typeof getPilotDashboardData>>;

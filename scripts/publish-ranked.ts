import { createSupabaseAdminClient } from "../src/lib/supabase/admin";
import { COHORT_PERIODS, MARKETS, PRODUCTS } from "../src/lib/trade/cohort";
import { buildRankedSnapshot, type CompletedSlice, type RankedObservation } from "../src/lib/trade/ranked-snapshot";

async function main() {
  const [hs6, ...extra] = process.argv.slice(2);
  if (!hs6 || extra.length || !Object.hasOwn(PRODUCTS, hs6)) {
    console.error("Usage: npm run publish:ranked -- <HS6 from the candidate catalog>");
    process.exitCode = 1;
    return;
  }

  const db = createSupabaseAdminClient();
  const slices: CompletedSlice[] = [];
  const missing: string[] = [];
  for (const reporter of Object.keys(MARKETS).map(Number)) {
    const { data: runs, error } = await db.from("ingestion_runs")
      .select("id,query,records_written")
      .eq("source", "UN_COMTRADE")
      .eq("status", "SUCCEEDED")
      .contains("query", { reporterCode: reporter, cmdCode: hs6, flowCode: "M" })
      .order("completed_at", { ascending: false })
      .order("id");
    if (error) throw new Error("Could not load cohort ingestion runs");

    for (const period of COHORT_PERIODS) {
      const run = runs.find(row =>
        Array.isArray(row.query.periods) && row.query.periods.length === 1 && row.query.periods[0] === period
      );
      if (!run) {
        missing.push(`${reporter}/${period}`);
        continue;
      }
      const { data, count, error: readError } = await db.from("trade_observations")
        .select("observation_key,ingestion_run_id,classification_code,is_original_classification,period,partner_code,partner_iso,primary_value,net_weight,is_net_wgt_estimated,is_reported,is_aggregate", { count: "exact" })
        .eq("ingestion_run_id", run.id)
        .eq("reporter_code", reporter)
        .eq("product_code", hs6)
        .eq("period", period)
        .order("observation_key");
      if (readError || count !== data.length || count !== run.records_written) {
        throw new Error("Cohort observations differ from their completed ingestion run");
      }
      slices.push({ reporter, period, runId: run.id, observations: data satisfies RankedObservation[] });
    }
  }

  if (missing.length) {
    console.error(`Publication requires all 40 completed slices. Missing reporter/year: ${missing.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const snapshot = buildRankedSnapshot(hs6, slices);
  const { error } = await db.rpc("publish_ranked_snapshot", {
    release_id: snapshot.id, summary: snapshot.ranking, details: snapshot.details, inputs: snapshot.inputs,
  });
  if (error) throw new Error("Could not publish ranked snapshot");
  console.log(`Published ${hs6} snapshot ${snapshot.id}.`);
}

void main().catch((error: unknown) => {
  // Database and transport errors are replaced by fixed messages above.
  console.error(error instanceof Error && /^Supabase server credentials/.test(error.message)
    ? "Configure Supabase operator credentials."
    : "Ranked publication failed. Verify the migration and completed cohort observations.");
  process.exitCode = 1;
});

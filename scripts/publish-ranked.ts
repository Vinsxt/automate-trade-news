import { assertRankedStorageHeadroom } from "./ranked-storage";
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

    const completed = COHORT_PERIODS.flatMap(period => {
      const run = runs.find(row =>
        Array.isArray(row.query.periods) && row.query.periods.length === 1 && row.query.periods[0] === period
      );
      if (run) return [{ period, id: run.id as string, written: Number(run.records_written) }];
      missing.push(`${reporter}/${period}`);
      return [];
    });
    if (completed.length !== COHORT_PERIODS.length) continue;

    const expectedRows = completed.reduce((total, run) => total + run.written, 0);
    const observations = new Map<string, RankedObservation[]>();
    for (let offset = 0; ; offset += 1000) {
      const { data, count, error: readError } = await db.from("trade_observations")
        .select("observation_key,ingestion_run_id,classification_code,is_original_classification,period,partner_code,partner_iso,primary_value,net_weight,is_net_wgt_estimated,is_reported,is_aggregate", { count: "exact" })
        .in("ingestion_run_id", completed.map(run => run.id))
        .eq("reporter_code", reporter)
        .eq("product_code", hs6)
        .order("observation_key")
        .range(offset, offset + 999);
      if (readError || count !== expectedRows || data.length !== Math.min(1000, expectedRows - offset)) {
        throw new Error("Cohort observations differ from their completed ingestion runs");
      }
      for (const row of data satisfies RankedObservation[]) {
        const group = observations.get(row.ingestion_run_id) ?? [];
        group.push(row);
        observations.set(row.ingestion_run_id, group);
      }
      if (offset + data.length >= expectedRows) break;
    }
    for (const run of completed) {
      const rows = observations.get(run.id) ?? [];
      if (rows.length !== run.written) throw new Error("Cohort run row count changed");
      slices.push({ reporter, period: run.period, runId: run.id, observations: rows });
    }
  }

  if (missing.length) {
    console.error(`Publication requires all 40 completed slices. Missing reporter/year: ${missing.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const snapshot = buildRankedSnapshot(hs6, slices);
  await assertRankedStorageHeadroom(db);
  const { error } = await db.rpc("publish_ranked_snapshot", {
    release_id: snapshot.id, summary: snapshot.ranking, details: snapshot.details, inputs: snapshot.inputs,
  });
  if (error) throw new Error("Could not publish ranked snapshot");
  console.log(`Published ${hs6} snapshot ${snapshot.id}.`);
}

void main().catch((error: unknown) => {
  // Database and transport errors are replaced by fixed messages above.
  const message = error instanceof Error ? error.message : "";
  console.error(["Could not verify database size", "Reached the 145 MB backfill storage stop"].includes(message)
    ? message
    : "Ranked publication failed. Verify the migration, operator credentials and completed cohort observations.");
  process.exitCode = 1;
});

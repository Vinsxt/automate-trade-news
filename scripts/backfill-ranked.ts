import { setTimeout as sleep } from "node:timers/promises";

import { ComtradeRequestError } from "../src/lib/comtrade/client";
import { fetchComtradeFinalGroup } from "../src/lib/comtrade/final";
import { ingestAnnualImports } from "../src/lib/comtrade/ingest";
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";
import { COHORT_PERIODS, MARKETS, PRODUCTS } from "../src/lib/trade/cohort";

import { assertRankedStorageHeadroom } from "./ranked-storage";

async function main() {
  const db = createSupabaseAdminClient();
  const products = Object.keys(PRODUCTS).filter(code => code !== "090111");
  if (!process.env.COMTRADE_API_KEY?.trim()) throw new Error("Configure a registered COMTRADE_API_KEY");
  let completed = 0;
  let remaining = 0;
  let lastAttempt = 0;

  async function reserveAttempt() {
    await sleep(Math.max(0, 1250 - (Date.now() - lastAttempt)));
    const { data, error } = await db.rpc("reserve_comtrade_attempt");
    if (error || data !== true) throw new Error("Comtrade attempt budget or pacing limit reached");
    lastAttempt = Date.now();
  }

  for (const reporterCode of Object.keys(MARKETS).map(Number)) {
    const { data: runs, error } = await db.from("ingestion_runs")
      .select("query").eq("status", "SUCCEEDED")
      .eq("source", "UN_COMTRADE")
      .contains("query", { reporterCode, flowCode: "M" });
    if (error) throw new Error("Could not read ingestion checkpoints");
    for (const period of COHORT_PERIODS) {
      const pending = products.filter(code => !runs.some(({ query }) =>
        query.cmdCode === code && query.periods?.length === 1 && query.periods[0] === period
      ));
      if (!pending.length) continue;

      const size = await assertRankedStorageHeadroom(db);

      const query = { reporterCode, period, flowCode: "M" };
      async function loadProducts(codes: string[]): Promise<void> {
        let response;
        try {
          response = await fetchComtradeFinalGroup(query, codes, reserveAttempt);
        } catch (error) {
          if (error instanceof ComtradeRequestError && error.message.includes("row limit") && codes.length > 1) {
            const midpoint = Math.ceil(codes.length / 2);
            await loadProducts(codes.slice(0, midpoint));
            await loadProducts(codes.slice(midpoint));
            return;
          }
          if (!(error instanceof ComtradeRequestError) || [401, 403, 429].includes(error.status ?? 0)) throw error;
          console.error(`Unresolved ${reporterCode}/${period} for ${codes.length} products. ${error.message}`);
          remaining += codes.length;
          return;
        }

        for (let offset = 0; offset < response.data.length; offset += 499) {
          const requested = Math.min(499, response.data.length - offset);
          const { data, error } = await db.rpc("reserve_comtrade_rows", { requested });
          if (error || data !== true) throw new Error("Comtrade row or database size budget reached");
        }

        const settled = await Promise.allSettled(codes.map(cmdCode => {
          const data = response.data.filter(row => row.cmdCode === cmdCode);
          return ingestAnnualImports({ reporterCode, cmdCode, periods: [period], acceptOtherEditions: true },
            async () => ({ count: data.length, data }));
        }));
        const failed = codes.filter((_, index) => settled[index].status === "rejected");
        completed += codes.length - failed.length;
        remaining += failed.length;
        console.log(`Reporter ${reporterCode}, ${period}: ${completed} slices completed this run. Database before write: ${(Number(size) / 1e6).toFixed(1)} MB.`);
        if (failed.length) console.error(`Unresolved product codes: ${failed.join(", ")}`);
      }
      await loadProducts(pending);
    }
  }
  if (remaining) {
    console.error(`${remaining} slices remain unresolved. Rerun to retry them.`);
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  // Never include SDK errors or URLs in operator output.
  const message = error instanceof Error ? error.message : "";
  console.error([
    "Configure a registered COMTRADE_API_KEY",
    "Could not read ingestion checkpoints",
    "Could not verify database size",
    "Reached the 145 MB backfill storage stop",
    "Comtrade attempt budget or pacing limit reached",
    "Comtrade row or database size budget reached",
  ].includes(message) ? message : "Backfill stopped. Check the last completed slice and Comtrade availability.");
  process.exitCode = 1;
});

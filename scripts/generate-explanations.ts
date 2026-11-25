import { createRankedGemini, selectRankedFindings } from "./gemini-ranked";
import { setTimeout } from "node:timers/promises";
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";
import { PRODUCTS } from "../src/lib/trade/cohort";
import { EXPLANATION_MODEL, EXPLANATION_VERSION, rankingEvidence, traceBatch, traceFindings } from "../src/lib/trade/ranked-explanation";
import type { RankedRelease } from "../src/lib/trade/ranked-snapshot";
import { assertRankedStorageHeadroom } from "./ranked-storage";

async function main() {
  const [capArg = "1", product, ...extra] = process.argv.slice(2);
  const cap = Number(capArg);
  if (!Number.isInteger(cap) || cap < 1 || cap > 20 || extra.length || (product && !Object.hasOwn(PRODUCTS, product))) {
    throw new Error("Usage: npm run generate:explanations -- [1–20 requests per Pacific day] [HS6]");
  }
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Gemini credentials are unavailable");
  const db = createSupabaseAdminClient();
  await assertRankedStorageHeadroom(db);
  const ai = createRankedGemini(apiKey);
  const counts = { requests: 0, attempted: 0, passed: 0, cached: 0, fallback: 0, invalidResponses: 0, providerErrors: 0 };
  let lastRequestAt = 0;
  try {
    for (const hs6 of product ? [product] : Object.keys(PRODUCTS)) {
      const { data: release, error } = await db.from("trade_snapshots").select("id,ranked_summary")
        .eq("ranked_summary->>hs6", hs6).not("published_at", "is", null)
        .order("published_at", { ascending: false }).order("id").limit(1).maybeSingle();
      if (error || !release) throw new Error("Published product snapshot unavailable");
      const ranking = release.ranked_summary as RankedRelease;
      const prepared = ranking.rankings.map(result => ({ reporter: result.reporter, ...rankingEvidence(result) }));
      const candidates = prepared.filter(row => row.findings.length);
      counts.fallback += prepared.length - candidates.length;
      if (!candidates.length) continue;

      const { data: cache, error: cacheError } = await db.from("trade_ranked_explanations")
        .select("snapshot_id,evidence_hash,findings").in("evidence_hash", candidates.map(row => row.hash));
      if (cacheError) throw new Error("Explanation cache unavailable");
      const cached = new Map(cache.map(row => [row.evidence_hash, row]));
      const rows = [];
      const misses = [];
      const entry = (row: typeof candidates[number], findings: string[]) => ({
        snapshot_id: release.id, reporter_code: row.reporter, evidence_hash: row.hash, findings,
      });
      for (const row of candidates) {
        const match = cached.get(row.hash);
        if (!match) {
          misses.push(row);
          continue;
        }
        traceFindings(row.findings, match.findings);
        if (match.snapshot_id !== release.id) rows.push(entry(row, match.findings));
        counts.cached++;
      }
      if (rows.length && (await db.from("trade_ranked_explanations").upsert(rows)).error) {
        throw new Error("Could not reuse cached explanations");
      }
      if (!misses.length) continue;
      if (counts.requests >= cap) {
        counts.fallback += misses.length;
        continue;
      }
      const delay = lastRequestAt + 30_000 - Date.now();
      if (delay > 0) await setTimeout(delay);
      const { data: attempt, error: reserveError } = await db.rpc("reserve_trade_explanation_attempt", {
        release_id: release.id, provider_model: EXPLANATION_MODEL, generation: EXPLANATION_VERSION,
        hashes: misses.map(row => row.hash), daily_cap: cap,
      });
      if (reserveError) throw new Error("Could not reserve a Gemini request");
      if (!attempt) {
        counts.fallback += misses.length;
        continue;
      }
      lastRequestAt = Date.now();
      counts.requests++;
      counts.attempted += misses.length;
      let status = "provider_error";
      let responseText: string | undefined;
      try {
        responseText = await selectRankedFindings(ai, misses);
      } catch (error) {
        counts.providerErrors++;
        const status = (error as { status?: unknown } | null)?.status;
        const reason = typeof status === "number" && status >= 400 && status <= 599
          ? `HTTP ${status}`
          : error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)
            ? "timeout"
            : "transport failure";
        console.error(`Gemini request failed for ${hs6} (${reason}).`);
      }

      let selections: string[][] | undefined;
      if (responseText !== undefined) {
        try {
          selections = traceBatch(misses, responseText);
          status = "passed";
        } catch {
          status = "invalid";
          counts.invalidResponses++;
        }
      }
      if (selections) {
        const { error: writeError } = await db.from("trade_ranked_explanations")
          .upsert(misses.map((row, index) => entry(row, selections[index])));
        if (writeError) throw new Error("Could not store validated explanations");
        counts.passed += misses.length;
      } else {
        counts.fallback += misses.length;
      }
      const { error: finishError } = await db.from("trade_explanation_attempts").update({ status }).eq("id", attempt);
      if (finishError) throw new Error("Could not record claim tracing status");
      // Stop the batch on a provider failure instead of hammering the quota or a bad key.
      if (status === "provider_error") {
        process.exitCode = 1;
        break;
      }
    }
  } finally {
    console.log({ ...counts, passRatePct: counts.attempted ? 100 * counts.passed / counts.attempted : null });
  }
}

void main().catch(() => {
  console.error("Explanation batch failed. Confirm arguments, operator credentials, published snapshots, and the migration.");
  process.exitCode = 1;
});

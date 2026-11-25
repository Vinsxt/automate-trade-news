import assert from "node:assert/strict";
import test from "node:test";
import { COHORT_PERIODS, MARKETS } from "./cohort";
import { buildRankedSnapshot, type CompletedSlice } from "./ranked-snapshot";

function fixture(): CompletedSlice[] {
  return Object.keys(MARKETS).map(Number).flatMap(reporter => COHORT_PERIODS.map(period => {
    const runId = `${reporter}-${period}`;
    return {
      reporter, period, runId,
      observations: [0, 360, 392].map(partner => ({
        observation_key: `${runId}-${partner}`,
        ingestion_run_id: runId,
        classification_code: "H6", is_original_classification: true,
        period, partner_code: partner, partner_iso: partner === 392 ? "JPN" : null,
        primary_value: partner === 0 ? reporter * (period === "2025" ? 2 : 1) : 10,
        net_weight: 5, is_net_wgt_estimated: false, is_reported: true, is_aggregate: partner === 0,
      })),
    };
  }));
}

test("publishes a stable ranked release with matching details and private source inputs", () => {
  const slices = fixture();
  const snapshot = buildRankedSnapshot("090111", slices);
  assert.equal(snapshot.id, buildRankedSnapshot("090111", slices.toReversed()).id);
  const reordered = JSON.parse(JSON.stringify(snapshot.inputs, (_key, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).reverse())
      : value));
  assert.equal(snapshot.id, buildRankedSnapshot("090111", reordered.slices).id);
  assert.equal(snapshot.ranking.rankings.length, 10);
  assert.ok(snapshot.ranking.rankings.filter(row => row.shortlisted).length >= 3);
  assert.equal(snapshot.details[36].supplierYears["2025"][0].unitValueUsdPerKg, 2);
  assert.equal(snapshot.inputs.slices.length, 40);
  assert.ok(!JSON.stringify(snapshot.ranking).includes(slices[0].runId));
});

test("rejects incomplete cohorts and marks successful empty market slices as unranked", () => {
  const slices = fixture();
  assert.throws(() => buildRankedSnapshot("090111", slices.slice(1)), /Incomplete cohort/);
  slices[0].observations = [];
  const row = buildRankedSnapshot("090111", slices).ranking.rankings.find(row => row.reporter === 36);
  assert.equal(row?.reason, "missing_world");
  assert.equal(row?.score, null);
});

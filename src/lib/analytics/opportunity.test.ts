import assert from "node:assert/strict";
import test from "node:test";
import { rankOpportunities, type OpportunityCandidate } from "./opportunity";
import { calculateUnitValue, unitValueGapPct, supplierConcentration } from "./supplier-metrics";

function candidate(reporter: number, end: number, indonesia: number): OpportunityCandidate {
  return {
    reporter, hs6: "090111", edition: "H6",
    observations: [2022, 2023, 2024, 2025].flatMap(year => [
      { year, edition: "H6", comparable: true, partner: 0, value: year === 2025 ? end : 100 },
      { year, edition: "H6", comparable: true, partner: 360, value: year === 2025 ? indonesia : 0 },
    ]),
  };
}

test("ranks comparable markets within a product and retains exact cutoff ties", () => {
  const results = rankOpportunities([
    candidate(1, 100, 20), candidate(2, 200, 20), candidate(3, 300, 60), candidate(4, 100, 20),
  ], 2025);
  assert.deepEqual(results.map(row => row.reporter), [3, 2, 1, 4]);
  assert.deepEqual(results.map(row => row.shortlisted), [true, true, true, true]);
  assert.equal(results[0].components?.marketSize, 300);
  assert.equal(results[0].components?.indonesiaShareGain, 20);
  assert.equal(results[2].score, results[3].score);
  assert.ok(Math.abs(results[0].score! - 800 / 9) < 1e-10);
});

test("excludes absent shares, duplicate totals, mismatched editions and zero World values", () => {
  const valid = candidate(1, 100, 0);
  const absent = candidate(2, 200, 20);
  absent.observations.pop();
  const mismatched = candidate(3, 100, 0);
  mismatched.observations[0].edition = "H5";
  const duplicate = candidate(4, 100, 0);
  duplicate.observations.push(duplicate.observations[0]);
  const results = rankOpportunities([valid, absent, mismatched, duplicate, candidate(5, 0, 0)], 2025);
  assert.deepEqual(results.map(row => row.score), [null, null, null, null, null]);
  assert.deepEqual(results.map(row => row.reason), [
    "insufficient_cohort", "missing_indonesia", "incomparable_observation", "duplicate_observation", "invalid_world",
  ]);
});

test("pools value and weight and gates unit values on compatible observed kilograms", () => {
  const row = { value: 80, weight: 10, weightUnit: "kg", currency: "USD", estimated: false };
  assert.deepEqual(calculateUnitValue([row, { ...row, value: 20, weight: null }]), {
    usdPerKg: 8, valueCoveragePct: 80,
  });
  for (const change of [{ estimated: true }, { estimated: null }, { weight: 0 }, { currency: "EUR" }, { weightUnit: "g" }]) {
    assert.equal(calculateUnitValue([{ ...row, ...change }]).usdPerKg, null);
  }
  assert.equal(unitValueGapPct(8, 4), 100);
  assert.equal(unitValueGapPct(8, 0), null);
});

test("withholds concentration when country values do not account for World", () => {
  assert.deepEqual(supplierConcentration(100, [50, 50]), { hhi: 5000, coveragePct: 100 });
  assert.deepEqual(supplierConcentration(100, [50, 30]), { hhi: null, coveragePct: 80 });
});

import assert from "node:assert/strict";
import test from "node:test";

import { calculateTradeSummary } from "../analytics/trade";
import { buildPilotSnapshot, type PilotSnapshotObservation } from "./snapshot";

function observation(period: string, partner: number, value: number | null): PilotSnapshotObservation {
  return {
    observation_key: `H6:699:854142:${period}:${partner}`,
    ingestion_run_id: `run-${period}`,
    retrieved_at: `${period}-12-31T00:00:00Z`,
    period,
    partner_code: partner,
    partner_iso: partner === 360 ? "IDN" : null,
    primary_value: value,
    net_weight: null,
    is_net_wgt_estimated: null,
    is_reported: true,
    is_aggregate: partner === 0,
  };
}

const rows = [
  observation("2023", 0, 100),
  observation("2023", 360, 0),
  observation("2024", 0, 125),
  observation("2024", 360, 25),
  observation("2024", 392, null),
];

test("recomputes the dashboard indicators and retains the input behind them", () => {
  const snapshot = buildPilotSnapshot(rows);
  const dashboard = calculateTradeSummary(rows);

  assert.deepEqual(snapshot.metrics.imports, dashboard.imports);
  assert.deepEqual(snapshot.metrics.supplierYears, Object.fromEntries(dashboard.supplierYears));
  assert.deepEqual(snapshot.metrics.movements, Object.fromEntries(dashboard.movements));
  assert.equal(snapshot.metrics.supplierYears["2024"][0].shareChangePp, 20);
  assert.deepEqual(snapshot.input.observations, rows);
  assert.deepEqual(snapshot.input.ingestionRunIds, ["run-2023", "run-2024"]);
});

test("produces the same snapshot for reordered rows and a new ID for a source revision", () => {
  const snapshot = buildPilotSnapshot(rows);
  assert.deepEqual(buildPilotSnapshot([...rows].reverse()), snapshot);
  assert.notEqual(buildPilotSnapshot([
    ...rows.slice(0, -1),
    { ...rows.at(-1)!, ingestion_run_id: "revised-run" },
  ]).id, snapshot.id);
});

test("rejects an empty snapshot and ambiguous partner totals", () => {
  assert.throws(() => buildPilotSnapshot([]), /no pilot observations/i);
  assert.throws(() => buildPilotSnapshot([
    ...rows,
    { ...rows[0], observation_key: "alternate-world-row" },
  ]), /duplicate partner/i);
});

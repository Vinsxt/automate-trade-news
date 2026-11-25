import assert from "node:assert/strict";
import test from "node:test";
import { rankingEvidence, traceBatch, traceFindings } from "./ranked-explanation";

const market = {
  reporter: 699, marketName: "Fixture", hs6: "000000", edition: "H6", referenceYear: 2025,
  method: "opportunity-v1", eligibleCount: 3, shortlisted: true, reason: null,
  score: 50, hasWeightComparison: false, components: { marketSize: 200, importGrowth: 4, indonesiaShareGain: -1 },
  points: { marketSize: 100, importGrowth: 50, indonesiaShareGain: 0 },
};

test("explanation hash changes with figures, edition, period or method", () => {
  const { hash } = rankingEvidence(market);
  assert.equal(rankingEvidence({ ...market }).hash, hash);
  for (const changed of [
    { components: { ...market.components, marketSize: 201 } },
    { edition: "H5" }, { referenceYear: 2024 }, { method: "opportunity-v2" },
  ]) assert.notEqual(rankingEvidence({ ...market, ...changed }).hash, hash);
});

test("model selects approved IDs and the application supplies the figures", () => {
  const evidence = rankingEvidence(market);
  assert.deepEqual(traceBatch([evidence, evidence], '[{"slot":1,"findings":["share"]},{"slot":0,"findings":["size","growth"]}]'),
    [["size", "growth"], ["share"]]);
  assert.match(traceFindings(evidence.findings, ["size"])[0], /\$200/);
  for (const response of [
    '[{"slot":0,"findings":["size","size"]}]', '[{"slot":0,"findings":["fabricated"]}]',
    '[{"slot":1,"findings":["size"]}]', '[{"slot":0,"findings":["size"],"claim":"invented"}]',
  ]) assert.throws(() => traceBatch([evidence], response));
  assert.throws(() => traceBatch([evidence, evidence], '[{"slot":0,"findings":["size"]},{"slot":0,"findings":["share"]}]'));
  assert.throws(() => traceFindings([], ["size"]));
});

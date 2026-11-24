import assert from "node:assert/strict";
import test from "node:test";

import { renderTradeExplanation, type TradeExplanationMetrics } from "./explanation";

const evidence: TradeExplanationMetrics = {
  market: "Sample market",
  product: "Sample product",
  period: "2025",
  importValue: 100,
  yearOverYearPct: null,
  suppliers: [{ partnerCode: 360, partnerIso: "IDN", importValue: 25, marketSharePct: 25, shareChangePp: null }],
};

test("renders figures from supplied evidence in the order selected by the model", () => {
  const explanation = renderTradeExplanation(evidence, '{"findings":["supplier-360","total"]}');
  assert.match(explanation.observations[0], /IDN.*\$25.*25%/);
  assert.match(explanation.observations[1], /\$100/);
  assert.match(explanation.summary, /2025/);
});

test("rejects unavailable, duplicate, and unsupported model findings", () => {
  for (const payload of [
    '{"findings":["growth"]}',
    '{"findings":["supplier-840"]}',
    '{"findings":["total","total"]}',
    '{"findings":["total"],"summary":"Imports grew by 99%"}',
    "not JSON",
  ]) {
    assert.throws(() => renderTradeExplanation(evidence, payload));
  }
});

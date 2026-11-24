import assert from "node:assert/strict";
import test from "node:test";

import { parseTradeExplanation } from "./explanation";

test("accepts a bounded structured explanation", () => {
  assert.deepEqual(
    parseTradeExplanation(JSON.stringify({
      headline: "Imports increased",
      summary: "India's import value rose from the prior year.",
      observations: ["Import value increased 12% year over year."],
      caveat: "Trade value does not establish physical volume or cause.",
    })),
    {
      headline: "Imports increased",
      summary: "India's import value rose from the prior year.",
      observations: ["Import value increased 12% year over year."],
      caveat: "Trade value does not establish physical volume or cause.",
    },
  );
});

test("rejects malformed or oversized model output", () => {
  assert.throws(() => parseTradeExplanation("not JSON"));
  assert.throws(() => parseTradeExplanation(JSON.stringify({
    headline: "x".repeat(300),
    summary: "summary",
    observations: [],
    caveat: "caveat",
  })));
});

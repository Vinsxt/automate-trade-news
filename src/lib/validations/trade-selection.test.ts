import assert from "node:assert/strict";
import test from "node:test";
import { tradeSelectionSchema } from "./trade-selection";

test("accepts the supported product and market and an ordered year range", () => {
  assert.deepEqual(tradeSelectionSchema.parse({ product: "854142", market: "699", from: "2022", to: "2024" }),
    { product: "854142", market: "699", from: "2022", to: "2024" });
  assert.deepEqual(tradeSelectionSchema.parse({}), {});
});

test("rejects unsupported codes, repeated values, and reversed year ranges", () => {
  for (const selection of [
    { product: "854140" }, { market: "840" }, { from: "2020" },
    { from: "2025", to: "2022" }, { market: ["699", "840"] },
  ]) {
    assert.equal(tradeSelectionSchema.safeParse(selection).success, false);
  }
});

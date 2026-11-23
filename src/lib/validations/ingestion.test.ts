import assert from "node:assert/strict";
import test from "node:test";

import { ingestionRequestSchema } from "./ingestion";

test("accepts a single annual period for a rate-limited manual import", () => {
  assert.deepEqual(ingestionRequestSchema.parse({ periods: ["2025"] }), { periods: ["2025"] });
});

test("rejects malformed years and more than five requested periods", () => {
  assert.equal(ingestionRequestSchema.safeParse({ periods: ["25"] }).success, false);
  assert.equal(
    ingestionRequestSchema.safeParse({ periods: ["2021", "2022", "2023", "2024", "2025", "2026"] }).success,
    false,
  );
});

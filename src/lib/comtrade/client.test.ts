import assert from "node:assert/strict";
import test from "node:test";

import { ComtradeRequestError, fetchComtradePreview } from "./client";

test("rejects a successful HTTP response that contains a Comtrade API error", async () => {
  await assert.rejects(
    fetchComtradePreview(
      { reporterCode: 699, period: "2025", cmdCode: "854142", flowCode: "M" },
      async () => new Response(JSON.stringify({ count: 0, data: [], error: "upstream failure" })),
    ),
    ComtradeRequestError,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { handleIngestionRequest } from "@/lib/api/ingestion-handler";

function request(body: unknown, token = "test-token") {
  return new Request("http://localhost/api/admin/ingest", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

test("rejects missing authorization without starting ingestion", async () => {
  const prior = process.env.INGEST_ADMIN_TOKEN;
  process.env.INGEST_ADMIN_TOKEN = "test-token";
  let started = false;
  try {
    const response = await handleIngestionRequest(request({ periods: ["2025"] }, "wrong"), async () => {
      started = true;
      throw new Error("should not run");
    });
    assert.equal(response.status, 401);
    assert.equal(started, false);
    assert.equal(response.headers.get("x-request-id")?.length, 36);
  } finally {
    if (prior === undefined) delete process.env.INGEST_ADMIN_TOKEN;
    else process.env.INGEST_ADMIN_TOKEN = prior;
  }
});

test("validates the period before calling ingestion and passes validated periods", async () => {
  const prior = process.env.INGEST_ADMIN_TOKEN;
  process.env.INGEST_ADMIN_TOKEN = "test-token";
  let periods: string[] = [];
  try {
    const invalid = await handleIngestionRequest(request({ periods: ["spring"] }), async () => {
      throw new Error("should not run");
    });
    assert.equal(invalid.status, 422);

    const valid = await handleIngestionRequest(request({ periods: ["2024"] }), async (requested) => {
      periods = requested;
      return { ingestionRunId: "run-id", periods: requested, recordsReceived: 3, recordsWritten: 3 };
    });
    assert.equal(valid.status, 200);
    assert.deepEqual(periods, ["2024"]);
  } finally {
    if (prior === undefined) delete process.env.INGEST_ADMIN_TOKEN;
    else process.env.INGEST_ADMIN_TOKEN = prior;
  }
});

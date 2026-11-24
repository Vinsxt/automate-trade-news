import assert from "node:assert/strict";
import test from "node:test";

import { handleTradeAnalysis } from "@/lib/api/trade-analysis";
import type { PilotDashboardData } from "@/lib/trade/dashboard";

const dashboard = {
  imports: [{ period: "2024", importValue: 100, yearOverYearPct: 12 }],
  supplierYears: {
    "2024": [{ partnerCode: 156, partnerIso: "CHN", importValue: 70, marketSharePct: 70, shareChangePp: 5 }],
  },
} as unknown as PilotDashboardData;

function request(body: unknown, token = "test-token") {
  return new Request("http://localhost/api/ai/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

test("requires workspace authorization before loading data", async () => {
  const prior = process.env.INGEST_ADMIN_TOKEN;
  process.env.INGEST_ADMIN_TOKEN = "test-token";
  let loaded = false;
  try {
    const response = await handleTradeAnalysis(request({ period: "2024" }, "wrong"), {
      loadDashboard: async () => { loaded = true; return dashboard; },
      generate: async () => { throw new Error("should not run"); },
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("x-request-id")?.length, 36);
    assert.equal(loaded, false);
  } finally {
    if (prior === undefined) delete process.env.INGEST_ADMIN_TOKEN;
    else process.env.INGEST_ADMIN_TOKEN = prior;
  }
});

test("sends only selected stored metrics to the explanation provider", async () => {
  const prior = process.env.INGEST_ADMIN_TOKEN;
  process.env.INGEST_ADMIN_TOKEN = "test-token";
  let received: unknown;
  try {
    const response = await handleTradeAnalysis(request({ period: "2024" }), {
      loadDashboard: async () => dashboard,
      generate: async (metrics) => {
        received = metrics;
        return { headline: "Imports rose", summary: "Value increased.", observations: [], caveat: "No cause inferred." };
      },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(received, {
      market: "India",
      product: "HS 854142 · HS 2022 · Photovoltaic cells not assembled in modules or made up into panels",
      period: "2024",
      importValue: 100,
      yearOverYearPct: 12,
      suppliers: [{ partnerCode: 156, partnerIso: "CHN", importValue: 70, marketSharePct: 70, shareChangePp: 5 }],
    });
  } finally {
    if (prior === undefined) delete process.env.INGEST_ADMIN_TOKEN;
    else process.env.INGEST_ADMIN_TOKEN = prior;
  }
});

test("rejects periods without stored metrics", async () => {
  const prior = process.env.INGEST_ADMIN_TOKEN;
  process.env.INGEST_ADMIN_TOKEN = "test-token";
  try {
    const response = await handleTradeAnalysis(request({ period: "2021" }), {
      loadDashboard: async () => dashboard,
      generate: async () => { throw new Error("should not run"); },
    });
    assert.equal(response.status, 422);
    assert.equal((await response.json()).error.code, "PERIOD_UNAVAILABLE");
  } finally {
    if (prior === undefined) delete process.env.INGEST_ADMIN_TOKEN;
    else process.env.INGEST_ADMIN_TOKEN = prior;
  }
});

test("keeps dashboard read failures separate from Gemini provider failures", async () => {
  const prior = process.env.INGEST_ADMIN_TOKEN;
  process.env.INGEST_ADMIN_TOKEN = "test-token";
  try {
    const response = await handleTradeAnalysis(request({ period: "2024" }), {
      loadDashboard: async () => { throw new Error("database unavailable"); },
      generate: async () => { throw new Error("should not run"); },
    });
    assert.equal(response.status, 500);
    assert.equal((await response.json()).error.code, "TRADE_DATA_UNAVAILABLE");
  } finally {
    if (prior === undefined) delete process.env.INGEST_ADMIN_TOKEN;
    else process.env.INGEST_ADMIN_TOKEN = prior;
  }
});

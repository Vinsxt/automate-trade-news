import assert from "node:assert/strict";
import test from "node:test";

import { fetchComtradeFinal, fetchComtradeFinalGroup } from "./final";

const query = { reporterCode: 699, cmdCode: "854142", period: "2025", flowCode: "M" };
const empty = () => Response.json({ count: 0, data: [], error: null });

test("charges every attempt and honors a short Retry-After", async (t) => {
  const earlier = process.env.COMTRADE_API_KEY;
  t.after(() => {
    if (earlier === undefined) delete process.env.COMTRADE_API_KEY;
    else process.env.COMTRADE_API_KEY = earlier;
  });
  process.env.COMTRADE_API_KEY = "fixture";
  let attempts = 0;
  const delays: number[] = [];
  const result = await fetchComtradeFinal(query, async () => { attempts++; }, async () =>
    attempts === 1 ? new Response(null, { status: 429, headers: { "Retry-After": "2" } }) : empty(),
    async (delay) => { delays.push(delay ?? 0); },
  );
  assert.equal(result.count, 0);
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [2000]);

  await assert.rejects(fetchComtradeFinal(query, async () => {},
    async () => Response.json({ count: 1, data: [], error: null })), /incomplete/);
});

test("validates product membership and requested dimensions in grouped responses", async (t) => {
  const earlier = process.env.COMTRADE_API_KEY;
  t.after(() => {
    if (earlier === undefined) delete process.env.COMTRADE_API_KEY;
    else process.env.COMTRADE_API_KEY = earlier;
  });
  process.env.COMTRADE_API_KEY = "fixture";
  const row = {
    typeCode: "C", freqCode: "A", refYear: 2025, period: "2025", reporterCode: 699,
    flowCode: "M", partnerCode: 0, partner2Code: 0, classificationCode: "H6",
    classificationSearchCode: "HS", isOriginalClassification: true, cmdCode: "151110",
    customsCode: "C00", mosCode: "0", motCode: 0, isReported: false, isAggregate: true,
  };
  const codes = ["151110", "151190"];
  const result = await fetchComtradeFinalGroup(query, codes, async () => {}, async (input) => {
    const params = new URL(String(input)).searchParams;
    assert.equal(params.get("cmdCode"), codes.join(","));
    assert.equal(params.get("maxRecords"), "2500");
    return Response.json({ count: 1, data: [row] });
  });
  assert.equal(result.data[0].cmdCode, codes[0]);
  await assert.rejects(fetchComtradeFinalGroup(query, codes, async () => {}, async () =>
    Response.json({ count: 1, data: [{ ...row, cmdCode: "090111" }] })
  ), /outside the requested cohort/);
});

import assert from "node:assert/strict";
import test from "node:test";

import { fetchComtradeFinal } from "./final";

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

import assert from "node:assert/strict";
import test from "node:test";
import { withMinimumLoading } from "./minimum-loading";

test("starts the request immediately and waits for both response and minimum", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let requested = false;
  let revealed = false;
  const fast = withMinimumLoading(async () => { requested = true; return "cached"; }, 1500, new AbortController().signal)
    .then(result => { revealed = true; return result; });
  assert.equal(requested, true);
  context.mock.timers.tick(1499);
  await Promise.resolve();
  assert.equal(revealed, false);
  context.mock.timers.tick(1);
  assert.equal(await fast, "cached");

  let respond!: (value: string) => void;
  const slow = withMinimumLoading(() => new Promise<string>(resolve => { respond = resolve; }), 1500, new AbortController().signal);
  context.mock.timers.tick(2500);
  respond("generated");
  assert.equal(await slow, "generated");
});

test("cancelling clears the timer and suppresses a pending reveal", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const controller = new AbortController();
  const pending = withMinimumLoading(async () => "cached", 1500, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

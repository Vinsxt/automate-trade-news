import assert from "node:assert/strict";
import test from "node:test";
import { resolveCoffeeAnalysis, type CoffeeAnalysisStore } from "./coffee-analysis";
import { coffeeOutlookEvidence } from "../trade/coffee-outlook";

const overview = {
  markets: [
    { reporter: 842, name: "United States", values: [10, 12, 14, 16], total: 52, latestChange: 14, annualGrowth: 17, shareGain: 1 },
    { reporter: 276, name: "Germany", values: [6, 8, 10, 12], total: 36, latestChange: 20, annualGrowth: 26, shareGain: 2 },
    { reporter: 156, name: "China", values: [2, 4, 6, 8], total: 20, latestChange: 33, annualGrowth: 59, shareGain: 3 },
  ],
  periods: ["2022", "2023", "2024", "2025"],
  screened: 3,
  get leaders() { return this.markets; },
};
const evidence = coffeeOutlookEvidence(overview, "gemini-3.5-flash-lite");
const input = { evidence, snapshot: "snapshot-a", allowGenerate: true };
const ids = ["direction-0", "potential-1", "risk-value"];

function fakeStore() {
  const saved = new Map<string, Awaited<ReturnType<CoffeeAnalysisStore["find"]>>>();
  let pending = false;
  let saves = 0;
  const store: CoffeeAnalysisStore = {
    find: async key => saved.get(key) ?? null,
    previous: async () => [...saved.values()].find(Boolean) ?? null,
    reserve: async () => {
      if (pending) return { state: "running" };
      pending = true;
      return { state: "reserved", attemptId: "attempt" };
    },
    save: async (key, _input, response) => {
      saves++;
      const row = { response, generatedAt: "2026-11-26T00:00:00Z", coverage: evidence.period };
      saved.set(key, row);
      return row;
    },
    finish: async () => { pending = false; },
  };
  return { store, saves: () => saves };
}

test("cache identity changes with meaningful data, prompt revision or model", () => {
  assert.equal(evidence.key, coffeeOutlookEvidence(structuredClone(overview), "gemini-3.5-flash-lite").key);
  assert.notEqual(evidence.key, coffeeOutlookEvidence(overview, "gemini-3.6-flash").key);
  assert.notEqual(evidence.key, coffeeOutlookEvidence(overview, "gemini-3.5-flash-lite", "new-prompt").key);
  const changed = structuredClone(overview);
  changed.markets[0].values[0] += 1;
  assert.notEqual(evidence.dataHash, coffeeOutlookEvidence(changed, "gemini-3.5-flash-lite").dataHash);
});

test("on-demand and pre-generation share a cache and preserve the generation time", async () => {
  const { store, saves } = fakeStore();
  const first = await resolveCoffeeAnalysis(input, store, async () => ids);
  const second = await resolveCoffeeAnalysis({ ...input, snapshot: "republication" }, store, async () => {
    assert.fail("Gemini called for unchanged evidence");
  });
  assert.equal(first.state, "current");
  assert.deepEqual(first, second);
  assert.equal(saves(), 1);
});

test("concurrent misses share an attempt while invalid output keeps the last good result", async () => {
  const { store, saves } = fakeStore();
  let complete!: (value: string[]) => void;
  let begun!: () => void;
  const generating = new Promise<void>(resolve => { begun = resolve; });
  const first = resolveCoffeeAnalysis(input, store, () => {
    begun();
    return new Promise<string[]>(resolve => { complete = resolve; });
  });
  await generating;
  const second = resolveCoffeeAnalysis(input, store, async () => assert.fail("duplicate Gemini call"), async () => { await first; });
  complete(ids);
  const [current, concurrent] = await Promise.all([first, second]);
  assert.deepEqual(current, concurrent);
  const nextEvidence = coffeeOutlookEvidence(overview, "gemini-3.5-flash-lite", "new-prompt");
  const stale = await resolveCoffeeAnalysis({ ...input, evidence: nextEvidence }, store, async () => ["invalid"]);
  assert.equal(stale.state, "outdated");
  assert.equal(stale.generatedAt, current.generatedAt);
  assert.equal(saves(), 1);
});

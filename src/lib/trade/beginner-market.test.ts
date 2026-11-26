import assert from "node:assert/strict";
import test from "node:test";
import { answerBeginnerQuestion } from "./beginner-answers";
import { beginnerBriefEvidence, traceBeginnerBrief } from "./beginner-brief";
import { EXPLANATION_MODEL } from "./ranked-explanation";
import { coffeeOutlookEvidence, coffeeOverview, traceCoffeeOutlook } from "./coffee-outlook";
import { beginnerMarket, compareMarkets } from "./beginner-market";
import type { RankedRelease } from "./ranked-snapshot";

function rankedRow(overrides: Partial<RankedRelease["rankings"][number]> = {}): RankedRelease["rankings"][number] {
  return {
    reporter: 276, marketName: "Germany", hs6: "090111", edition: "H6", referenceYear: 2025,
    method: "opportunity-v1", eligibleCount: 3, shortlisted: true, reason: null, score: 50,
    hasWeightComparison: false, components: { marketSize: 0, importGrowth: -12, indonesiaShareGain: 1.8 },
    points: { marketSize: 0, importGrowth: 50, indonesiaShareGain: 100 }, ...overrides,
  };
}

test("a tie keeps both markets in the same rank and honors the pinned example pair", () => {
  const row = rankedRow();
  const other = rankedRow({ reporter: 156, marketName: "China" });
  const release = { hs6: "090111", productName: "Coffee", referenceYear: 2025, rankings: [other, row] };
  assert.deepEqual(compareMarkets(release, "276", "156").map(item => item.reporter), [276, 156]);
  assert.deepEqual(compareMarkets(release).map(item => item.reporter), []);
  assert.deepEqual(compareMarkets(release, "276").map(item => item.reporter), [276]);
  assert.deepEqual(compareMarkets(release, "276", "276").map(item => item.reporter), [276]);
  const market = beginnerMarket(release, row, undefined);
  assert.equal(market.rank, 1);
  assert.equal(market.tied, true);
});

test("annual evidence distinguishes missing years, missing shares, and a reported zero", () => {
  const row = rankedRow({ score: null, components: null, points: null, reason: "missing_indonesia" });
  const release = { hs6: "090111", productName: "Coffee", referenceYear: 2025, rankings: [row] };
  const market = beginnerMarket(release, row, {
    imports: [
      { period: "2023", importValue: 12, yearOverYearPct: null, netWeightKg: null },
      { period: "2025", importValue: 0, yearOverYearPct: null, netWeightKg: null },
    ],
    coverage: {}, supplierYears: {}, movements: {},
  });
  assert.deepEqual(market.years.map(year => year.importValue), [null, 12, null, 0]);
  assert.equal(market.years.at(-1)?.indonesiaShare, null);
  assert.equal(market.rank, null);
  assert.match(market.exclusion ?? "", /Indonesia/);
});

const coffee = rankedRow({ components: { marketSize: 6.5e9, importGrowth: 15.7, indonesiaShareGain: -1.68 } });
const coffeeRelease = { hs6: "090111", productName: "Coffee", referenceYear: 2025, rankings: [coffee] };
const published = beginnerMarket(coffeeRelease, coffee, {
  coverage: {}, movements: {},
  imports: [
    { period: "2022", importValue: 4.2e9, yearOverYearPct: null, netWeightKg: null },
    { period: "2023", importValue: 3.2e9, yearOverYearPct: -24, netWeightKg: null },
    { period: "2024", importValue: 4.7e9, yearOverYearPct: null, netWeightKg: null },
    { period: "2025", importValue: 6.5e9, yearOverYearPct: 38, netWeightKg: null },
  ],
  supplierYears: { "2025": [{
    partnerCode: 76, partnerIso: null, importValue: 1e9, marketSharePct: 15, shareChangePp: 2,
    rank: 1, rankChange: 1, importValueChange: 1e8, unitValueUsdPerKg: null,
    unitValueCoveragePct: null, indonesiaUnitValueGapPct: null,
  }] },
});

test("answers use published partner names, the requested year, and the pinned source", () => {
  const context = { markets: [published], hs6: "090111", period: "2025", snapshot: "pinned" };
  const answer = answerBeginnerQuestion({ ...context, question: "Who are the largest suppliers in Germany?" });
  assert.match(answer.lines[0], /Germany in 2025.*Brazil/);
  assert.match(answer.links[0].href, /\/276\?snapshot=pinned&to=2025$/);
  assert.match(answerBeginnerQuestion({ ...context, question: "import value 2024" }).lines[0], /4\.7 billion.*2024/);
  assert.match(answerBeginnerQuestion({ ...context, question: "import value 2026" }).lines[0], /outside this release/);
  assert.match(answerBeginnerQuestion({ ...context, question: "roasted coffee import value" }).lines[0], /outside this release/);
  assert.match(answerBeginnerQuestion({ ...context, question: "Australia import value" }).lines[0], /Choose that country/);
  assert.match(answerBeginnerQuestion({ ...context, question: "Who are the buyers?" }).lines[0], /separate research/i);
  assert.match(answerBeginnerQuestion({ ...context, question: "", selection: { text: "Indonesia’s share", reporter: 276 } }).lines[0], /unavailable/);
  assert.match(answerBeginnerQuestion({ ...context, question: "What can I sell?" }).lines[0], /HS 090111/);
});

test("briefs use supported IDs and surface the negative signal beside growth", () => {
  const evidence = beginnerBriefEvidence(published, EXPLANATION_MODEL);
  const rendered = traceBeginnerBrief(evidence, ["annual", "share", "check-suppliers"]);
  assert.match(rendered.facts[0], /2025.*38%.*2024/);
  assert.match(rendered.facts[1], /-1\.68 percentage points.*2022–2025/);
  assert.throws(() => traceBeginnerBrief(evidence, ["annual", "growth", "check-specification"]), /contrary/);
  assert.throws(() => traceBeginnerBrief(evidence, ["size", "share", "invented"]), /roles/);
  assert.throws(() => traceBeginnerBrief(evidence, ["share", "share", "check-specification"]), /roles/);
  const missing = { ...published, years: published.years.slice(0, 3) };
  assert.deepEqual(beginnerBriefEvidence(missing, EXPLANATION_MODEL).findings, []);
  assert.throws(() => traceBeginnerBrief(evidence, undefined));
  const withWeights = { ...published, row: { ...published.row, hasWeightComparison: true } };
  assert.notEqual(beginnerBriefEvidence(withWeights, EXPLANATION_MODEL).hash, evidence.hash);
});

test("coffee leaders use a complete multi-year sum and preserve exact cutoff ties", () => {
  const ranking = { ...coffeeRelease, rankings: [
    rankedRow({ reporter: 276, marketName: "Germany", score: 100 }),
    rankedRow({ reporter: 842, marketName: "United States", score: 30 }),
    rankedRow({ reporter: 392, marketName: "Japan", score: null, components: null }),
    rankedRow({ reporter: 528, marketName: "Netherlands" }),
    rankedRow({ reporter: 156, marketName: "China" }),
  ] };
  const observations = (values: (number | null)[]) => values.map((importValue, index) => ({ period: String(2022 + index), importValue }));
  const overview = coffeeOverview(ranking, new Map([
    [276, observations([1, 2, 3, 10])],
    [842, observations([9, 10, 11, 12])],
    [392, observations([1, 2, 5, 8])],
    [528, observations([4, 4, 4, 4])],
    [156, observations([100, null, 100, 100])],
  ]));
  assert.deepEqual(overview.leaders.map(row => row.reporter), [842, 276, 392, 528]);
  assert.equal(overview.markets.length, 4);
  const evidence = coffeeOutlookEvidence(overview, EXPLANATION_MODEL);
  assert.match(traceCoffeeOutlook(evidence, ["direction-0", "potential-1", "risk-value"])[0], /United States.*2026/);
  assert.throws(() => traceCoffeeOutlook(evidence, ["potential-1", "direction-0", "risk-value"]));
  assert.throws(() => traceCoffeeOutlook(evidence, ["direction-99", "potential-check", "risk-value"]));
});
